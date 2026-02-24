import { create } from "zustand";

interface RuntimeState {
  baseDir: string;
  setBaseDir: (baseDir: string) => void;
}

export const useRuntimeStore = create<RuntimeState>((set) => ({
  baseDir: "",
  setBaseDir: (baseDir) => set({ baseDir })
}));
