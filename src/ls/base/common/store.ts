export type StoreListener = () => void;

export type Store<T> = {
  getSnapshot: () => T;
  subscribe: (listener: StoreListener) => () => void;
  setState: (nextState: T) => void;
  updateState: (updater: (currentState: T) => T) => void;
};

export function createStore<T>(initialState: T): Store<T> {
  let currentState = initialState;
  const listeners = new Set<StoreListener>();

  const emitChange = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const setState = (nextState: T) => {
    if (Object.is(currentState, nextState)) {
      return;
    }

    currentState = nextState;
    emitChange();
  };

  return {
    getSnapshot: () => currentState,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setState,
    updateState: (updater) => {
      setState(updater(currentState));
    },
  };
}
