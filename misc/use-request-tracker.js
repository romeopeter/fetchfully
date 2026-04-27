//  React Integration using Hook
function useRequestTracker(urlPattern, status) {
  const [requests, setRequests] = useState([]);
  
  useEffect(() => {
    const updateRequests = () => {
      const filtered = requestManager.filter(req => {
        const matchesUrl = !urlPattern || req.url.includes(urlPattern);
        const matchesStatus = !status || req.status === status;
        return matchesUrl && matchesStatus;
      });
      setRequests(filtered);
    };
    
    // Initial load
    updateRequests();
    
    // Subscribe to changes
    const unsubscribe = requestManager.subscribe(updateRequests);
    
    return unsubscribe;
  }, [urlPattern, status]);
  
  return requests;
}

// Usage in component
function NotificationIndicator() {
  const pendingDeletes = useRequestTracker('/api/notifications', 'pending');
  const isDeleting = pendingDeletes.some(req => req.method === 'DELETE');
  
  return isDeleting ? <Spinner /> : null;
}