import { useEffect, useReducer, useState } from 'react';

// ---------- useLocalStorage ----------

// Storage can be unavailable (private mode, blocked site data), so every access is guarded.
function read(key, createFallback, isValid, migrate) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const parsed = migrate ? migrate(JSON.parse(raw)) : JSON.parse(raw);
      if (!isValid || isValid(parsed)) return parsed;
    }
  } catch (error) {
    // Fall through to the fallback value.
  }
  return createFallback();
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Quota exceeded or storage blocked: keep working in memory.
  }
}

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() =>
    read(key, () => (typeof initialValue === 'function' ? initialValue() : initialValue))
  );
  useEffect(() => write(key, value), [key, value]);
  return [value, setValue];
}

/**
 * useReducer whose state is loaded from and saved to localStorage.
 * `migrate` upgrades an older save; anything still failing `isValid` is replaced by `createInitial`.
 */
export function usePersistentReducer(reducer, key, createInitial, isValid, migrate) {
  const [state, dispatch] = useReducer(reducer, undefined, () => read(key, createInitial, isValid, migrate));
  useEffect(() => write(key, state), [key, state]);
  return [state, dispatch];
}

// ---------- useNow ----------

/** Current time, refreshed every `intervalMs`. */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
