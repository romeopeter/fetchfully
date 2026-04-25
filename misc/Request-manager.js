class RequestManager {
  constructor() {
    this.requests = new Map();
    this.listeners = new Set();
    this.setupInterceptors();
  }

  setupInterceptors() {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const [url, options] = args;
      const requestId = this.generateId();

      const requestData = {
        id: requestId,
        url: url.toString(),
        method: options?.method || "GET",
        status: "pending",
        startTime: Date.now(),
        body: options?.body,
      };

      this.addRequest(requestId, requestData);

      try {
        const response = await originalFetch(...args);

        this.updateRequest(requestId, {
          status: response.ok ? "success" : "error",
          statusCode: response.status,
          endTime: Date.now(),
        });

        return response;
      } catch (error) {
        this.updateRequest(requestId, {
          status: "error",
          error: error.message,
          endTime: Date.now(),
        });
        throw error;
      }
    };
  }

  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  addRequest(id, data) {
    this.requests.set(id, data);
    this.notify();
  }

  updateRequest(id, updates) {
    const existing = this.requests.get(id);
    if (existing) {
      this.requests.set(id, { ...existing, ...updates });
      this.notify();
    }
  }

  // Filter by URL
  getByUrl(urlPattern) {
    return Array.from(this.requests.values()).filter((req) =>
      req.url.includes(urlPattern)
    );
  }

  // Filter by status
  getByStatus(status) {
    return Array.from(this.requests.values()).filter(
      (req) => req.status === status
    );
  }

  // Combined filter
  filter(predicate) {
    return Array.from(this.requests.values()).filter(predicate);
  }

  // Subscribe to changes
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    this.listeners.forEach((callback) => callback(this.requests));
  }

  // Clear old completed requests
  cleanup(olderThan = 60000) {
    // 1 minute default
    const now = Date.now();
    for (const [id, req] of this.requests) {
      if (req.endTime && now - req.endTime > olderThan) {
        this.requests.delete(id);
      }
    }
  }
}

// Usage
const requestManager = new RequestManager();

// Subscribe to changes (useful for React)
const unsubscribe = requestManager.subscribe((requests) => {
  console.log("Requests updated:", requests);
});

// Filter by URL
const notificationRequests = requestManager.getByUrl("/api/notifications");

// Check if any notification updates are pending
const pendingUpdates = requestManager.filter(
  (req) =>
    req.url.includes("/api/notifications") &&
    req.method === "PATCH" &&
    req.status === "pending"
);

console.log("Pending notification updates:", pendingUpdates);
