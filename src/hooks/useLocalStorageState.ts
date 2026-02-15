import { useEffect, useState } from "react";

type Initializer<T> = T | (() => T);

export function useLocalStorageState<T>(key: string, initialValue: Initializer<T>): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        return JSON.parse(raw) as T;
      }
    } catch {
      // Ignore malformed local storage and fallback to default value.
    }
    return typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Ignore persistence failures to keep app usable.
    }
  }, [key, state]);

  return [state, setState];
}
