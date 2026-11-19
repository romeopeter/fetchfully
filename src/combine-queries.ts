import type {
  Query,
  QueryGroup,
  QueryGroupData,
  QueryGroupListener,
  QueryGroupState,
  QueryState,
  RequestStatus,
} from "./types";

/* ---------------------------------------------------------------------- */

const combinedStatus = (states: readonly QueryState[]): RequestStatus => {
  if (states.some((state) => state.isLoading)) return "loading";
  if (states.some((state) => state.isError)) return "error";
  if (states.every((state) => state.isSuccess)) return "success";
  return "idle";
};

function combine<D extends readonly unknown[]>(
  states: readonly QueryState[]
): QueryGroupState<D> {
  const status = combinedStatus(states);
  const errors = states.map((state) => state.error);

  // `status`, `data`, and `error` are derived together here, but TypeScript
  // can't relate them across the union for a generic tuple, hence the cast.
  return {
    status,
    data: states.map((state) => state.data),
    error: status === "error" ? errors.find((error) => error !== null) : null,
    errors,
    states: [...states],
    isIdle: status === "idle",
    isLoading: status === "loading",
    isSuccess: status === "success",
    isError: status === "error",
  } as unknown as QueryGroupState<D>;
}

/**
 * Observes several queries as one, with a combined status.
 *
 * Takes existing queries, so it composes with queries already shared across
 * components. The group subscribes to its queries only while it has
 * subscribers of its own, and its snapshot keeps identity until one of the
 * queries' states changes.
 *
 * @example
 * const users = createQuery<User[]>(api, { path: "users" });
 * const posts = createQuery<Post[]>(api, { path: "posts" });
 * const page = combineQueries([users, posts]);
 *
 * page.subscribe((state) => {
 *   if (state.isSuccess) render(state.data); // [User[], Post[]]
 * });
 * await page.run();
 */
export function combineQueries<Q extends readonly Query<any>[] | []>(
  queries: Q
): QueryGroup<QueryGroupData<Q>> {
  type D = QueryGroupData<Q>;

  const children: readonly Query<any>[] = queries;
  const listeners = new Set<QueryGroupListener<D>>();
  let unsubscribeChildren: Array<() => void> = [];

  let lastStates: readonly QueryState[] = children.map((query) =>
    query.getSnapshot()
  );
  let snapshot = combine<D>(lastStates);

  const getSnapshot = (): QueryGroupState<D> => {
    const states = children.map((query) => query.getSnapshot());
    const changed = states.some((state, index) => state !== lastStates[index]);

    if (changed) {
      lastStates = states;
      snapshot = combine<D>(states);
    }

    return snapshot;
  };

  const notifyIfChanged = () => {
    const previous = snapshot;
    const next = getSnapshot();
    if (next === previous) return;

    // Copy so a listener can unsubscribe during notification safely
    for (const listener of [...listeners]) listener(next);
  };

  return {
    getSnapshot,

    subscribe(listener) {
      // First subscriber: start listening to the queries. Their immediate
      // calls land in notifyIfChanged before this listener is registered.
      if (listeners.size === 0) {
        unsubscribeChildren = children.map((query) =>
          query.subscribe(notifyIfChanged)
        );
      }

      listeners.add(listener);
      listener(getSnapshot()); // Svelte's store contract requires an immediate call

      return () => {
        if (!listeners.delete(listener)) return;

        if (listeners.size === 0) {
          for (const unsubscribe of unsubscribeChildren) unsubscribe();
          unsubscribeChildren = [];
        }
      };
    },

    async run() {
      await Promise.all(children.map((query) => query.run()));
      return getSnapshot();
    },

    abort(reason) {
      for (const query of children) query.abort(reason);
    },
  };
}
