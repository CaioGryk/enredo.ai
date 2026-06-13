type SessionInvalidatedListener = () => void;

const listeners = new Set<SessionInvalidatedListener>();

export const sessionEvents = {
  subscribe(listener: SessionInvalidatedListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  emitSessionInvalidated(): void {
    for (const listener of listeners) {
      try {
        listener();
      } catch {
        // A failing subscriber must not prevent others from hearing the event.
      }
    }
  },
};
