import { useEffect, useState } from "react";

type Initializer<T> = T | (() => T);
type StorageSourceValue<T> = { exists: boolean; value: T | null; updatedAt: number };
type PersistentRecord<T> = { value: T; updatedAt?: number };

const DB_NAME = "cloudo-persistence";
const DB_VERSION = 1;
const DB_STORE = "kv";
const META_TS_PREFIX = "__cloudo_ts__:";

let dbPromise: Promise<IDBDatabase | null> | null = null;

function getMetaTsKey(key: string): string {
  return `${META_TS_PREFIX}${key}`;
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || typeof window.indexedDB === "undefined") return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

function readLocalValue<T>(key: string): StorageSourceValue<T> {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return { exists: false, value: null, updatedAt: 0 };
    const parsed = JSON.parse(raw) as T;
    const tsRaw = window.localStorage.getItem(getMetaTsKey(key));
    const ts = tsRaw ? Number(tsRaw) : 0;
    const updatedAt = Number.isFinite(ts) ? ts : 0;
    return { exists: true, value: parsed, updatedAt };
  } catch {
    return { exists: false, value: null, updatedAt: 0 };
  }
}

async function readPersistentValue<T>(key: string): Promise<StorageSourceValue<T>> {
  const db = await openDb();
  if (!db) return { exists: false, value: null, updatedAt: 0 };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, "readonly");
      const store = tx.objectStore(DB_STORE);
      const request = store.get(key);
      request.onsuccess = () => {
        const raw = request.result as PersistentRecord<T> | T | undefined;
        if (raw === undefined) {
          resolve({ exists: false, value: null, updatedAt: 0 });
          return;
        }
        if (typeof raw === "object" && raw !== null && "value" in raw) {
          const record = raw as PersistentRecord<T>;
          resolve({ exists: true, value: record.value, updatedAt: record.updatedAt ?? 0 });
          return;
        }
        resolve({ exists: true, value: raw as T, updatedAt: 0 });
      };
      request.onerror = () => resolve({ exists: false, value: null, updatedAt: 0 });
    } catch {
      resolve({ exists: false, value: null, updatedAt: 0 });
    }
  });
}

async function writePersistentValue<T>(key: string, value: T, updatedAt: number): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, "readwrite");
      const store = tx.objectStore(DB_STORE);
      const request = store.put({ value, updatedAt }, key);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export function useLocalStorageState<T>(key: string, initialValue: Initializer<T>): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    const local = readLocalValue<T>(key);
    if (local.exists && local.value !== null) return local.value;
    return typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = readLocalValue<T>(key);
      const persistent = await readPersistentValue<T>(key);
      if (cancelled || !persistent.exists || persistent.value === null) return;

      const shouldUsePersistent = persistent.updatedAt > local.updatedAt || (!local.exists && persistent.exists);
      if (!shouldUsePersistent) return;

      setState((prev) => {
        try {
          if (JSON.stringify(prev) === JSON.stringify(persistent.value)) return prev;
        } catch {
          // Fall back to persistent value on serialization mismatch.
        }
        return persistent.value as T;
      });

      try {
        window.localStorage.setItem(key, JSON.stringify(persistent.value));
        window.localStorage.setItem(getMetaTsKey(key), String(persistent.updatedAt || Date.now()));
      } catch {
        // Ignore local write failures and keep IndexedDB as source of truth.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    const updatedAt = Date.now();
    let localOk = false;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
      window.localStorage.setItem(getMetaTsKey(key), String(updatedAt));
      localOk = true;
    } catch {
      // Ignore persistence failures to keep app usable.
    }

    writePersistentValue(key, state, updatedAt)
      .then((persistentOk) => {
        if (!localOk && !persistentOk) return;
        window.dispatchEvent(new CustomEvent("cloudo:storage", { detail: { key } }));
      })
      .catch(() => {
        if (!localOk) return;
        window.dispatchEvent(new CustomEvent("cloudo:storage", { detail: { key } }));
      });
  }, [key, state]);

  useEffect(() => {
    const pullLatest = async (): Promise<void> => {
      const local = readLocalValue<T>(key);
      const persistent = await readPersistentValue<T>(key);
      const localCandidate = local.exists ? local : { exists: false, value: null, updatedAt: 0 };
      const persistentCandidate = persistent.exists ? persistent : { exists: false, value: null, updatedAt: 0 };
      const next = persistentCandidate.updatedAt > localCandidate.updatedAt ? persistentCandidate : localCandidate;
      if (!next.exists || next.value === null) return;

      setState((prev) => {
        try {
          if (JSON.stringify(prev) === JSON.stringify(next.value)) return prev;
        } catch {
          // Fall through and replace state.
        }
        return next.value as T;
      });

      if (next === persistentCandidate) {
        try {
          window.localStorage.setItem(key, JSON.stringify(next.value));
          window.localStorage.setItem(getMetaTsKey(key), String(next.updatedAt || Date.now()));
        } catch {
          // Ignore local write failures when syncing from IndexedDB.
        }
      }
    };

    const onStorage = (event: StorageEvent): void => {
      if (event.key !== key && event.key !== getMetaTsKey(key)) return;
      void pullLatest();
    };

    const onCloudoStorage = (event: Event): void => {
      const custom = event as CustomEvent<{ key?: string }>;
      if (custom.detail?.key !== key) return;
      void pullLatest();
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
