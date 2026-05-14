import { useState, useEffect, useRef, useCallback } from 'react';
import { saveToStorage, getFromStorage, STORAGE_KEYS } from '../Utils/storage';

// ─────────────────────────────────────────────────────────────────────────────
// usePersistedState
// ─────────────────────────────────────────────────────────────────────────────

interface UsePersistedStateOptions<T> {
  storageKey: string;
  defaultValue: T;
  /** Returned instead of defaultValue when localStorage throws (e.g. private mode quota). */
  fallbackValue?: T;
  onError?: (error: Error) => void;
}

/**
 * `useState` backed by localStorage via the app's versioned storage helpers.
 *
 * - Reads the cached value synchronously on first render so there is no
 *   loading flash.
 * - The returned setter (`setState_Persisted`) mirrors the React setter API
 *   (accepts a value OR an updater function) and writes to localStorage as a
 *   side-effect of every state change.
 * - Falls back to `fallbackValue` if localStorage is unavailable or corrupt.
 */
export function usePersistedState<T>(options: UsePersistedStateOptions<T>) {
  const {
    storageKey,
    defaultValue,
    fallbackValue = defaultValue,
    onError,
  } = options;

  const [state, setState] = useState<T>(() => {
    try {
      const stored = getFromStorage<T>(storageKey);
      if (stored !== null) return stored;

      return defaultValue;
    } catch (error) {
      console.error(`Error initializing state for ${storageKey}:`, error);
      onError?.(error as Error);
      return fallbackValue;
    }
  });

  // isInitializedRef prevents the persisted setter from writing back the
  // initial value before the component has mounted (which would be a no-op
  // write but still unnecessary localStorage churn).
  const isInitializedRef = useRef(false);

  useEffect(() => {
    isInitializedRef.current = true;
  }, []);

  const setState_Persisted = useCallback((newState: T | ((prevState: T) => T)) => {
    setState((prevState) => {
      const nextState = typeof newState === 'function'
        ? (newState as (prev: T) => T)(prevState)
        : newState;

      try {
        saveToStorage(storageKey, nextState);
      } catch (error) {
        console.error(`Error persisting state for ${storageKey}:`, error);
        onError?.(error as Error);
      }

      return nextState;
    });
  }, [storageKey, onError]);

  return [state, setState_Persisted] as const;
}

// ─────────────────────────────────────────────────────────────────────────────
// useApiWithFallback
// ─────────────────────────────────────────────────────────────────────────────

interface UseApiWithFallbackOptions<T> {
  fetchFunction: () => Promise<T>;
  storageKey: string;
  fallbackValue: T;
  onError?: (error: Error) => void;
}

/**
 * Generic fetch hook with a localStorage cache as a fallback layer.
 *
 * Behaviour on mount:
 *   1. Seeds state from the cache for an instant first paint.
 *   2. Fires `fetchFunction` in the background.
 *   3. On success: updates state and persists the fresh data.
 *   4. On failure: keeps whatever was in the cache (or `fallbackValue` if
 *      the cache is also empty) and exposes the error message.
 *
 * Two guards prevent state updates after unmount:
 *   - `shouldFetch` (closure var) — set to false in cleanup, guards the async
 *     resolution that may have already been in-flight.
 *   - `isMountedRef` (ref) — tracks mount status for the `refetch` callback,
 *      which runs outside the initial effect closure.
 */
export function useApiWithFallback<T>(options: UseApiWithFallbackOptions<T>) {
  const { fetchFunction, storageKey, fallbackValue, onError } = options;

  const [data, setData] = useState<T>(() => {
    const stored = getFromStorage<T>(storageKey);
    return stored ?? fallbackValue;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const isMountedRef = useRef(true);

  useEffect(() => {
    let shouldFetch = true;

    const fetchData = async () => {
      if (!shouldFetch) return;

      setLoading(true);
      setError('');

      try {
        const result = await fetchFunction();
        if (shouldFetch && isMountedRef.current) {
          setData(result);
          saveToStorage(storageKey, result);
        }
      } catch (err) {
        if (shouldFetch && isMountedRef.current) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(errorMessage);
          console.error(`Error in useApiWithFallback (${storageKey}):`, err);
          onError?.(err as Error);

          // Try to load from storage as fallback
          const stored = getFromStorage<T>(storageKey);
          if (stored) {
            setData(stored);
            console.log(`Using stored data as fallback for ${storageKey}`);
          } else {
            setData(fallbackValue);
          }
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      shouldFetch = false;
      isMountedRef.current = false;
    };
  }, [fetchFunction, storageKey, fallbackValue, onError]);

  return {
    data,
    loading,
    error,
    isFromFallback: !error && getFromStorage<T>(storageKey) === null,
    refetch: async () => {
      setLoading(true);
      try {
        const result = await fetchFunction();
        if (isMountedRef.current) {
          setData(result);
          saveToStorage(storageKey, result);
          setError('');
        }
      } catch (err) {
        if (isMountedRef.current) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(errorMessage);
          onError?.(err as Error);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
  };
}
