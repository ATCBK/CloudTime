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
      window.dispatchEvent(new CustomEvent("cloudo:storage", { detail: { key } }));
    } catch {
      // Ignore persistence failures to keep app usable.
    }
  }, [key, state]);

  useEffect(() => {
    const pullLatest = (): void => {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw !== null) {
          setState((prev) => {
            try {
              if (JSON.stringify(prev) === raw) return prev;
            } catch {
              // Fall back to parsed value when serialization fails.
            }
            return JSON.parse(raw) as T;
          });
        }
      } catch {
        // Ignore malformed storage updates.
      }
    };

    const onStorage = (event: StorageEvent): void => {
      if (event.key !== key) return;
      pullLatest();
    };

    const onCloudoStorage = (event: Event): void => {
      const custom = event as CustomEvent<{ key?: string }>;
      if (custom.detail?.key !== key) return;
      pullLatest();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("cloudo:storage", onCloudoStorage as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cloudo:storage", onCloudoStorage as EventListener);
    };
  }, [key]);

  return [state, setState];
}
