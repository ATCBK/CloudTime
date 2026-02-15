/// <reference types="vite/client" />

declare global {
  interface Window {
    cloudo: {
      setWindowOpacity: (value: number) => Promise<void>;
      toggleWindow: () => Promise<void>;
      getStorageBaseDir: () => Promise<string>;
    };
  }
}

export {};
