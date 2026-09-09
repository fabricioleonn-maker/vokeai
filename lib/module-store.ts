import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ModuleKey, MODULE_CONFIGS } from './module-config';

interface ModuleState {
  activeModule: ModuleKey;
  setActiveModule: (module: ModuleKey) => void;
}

export const useModuleStore = create<ModuleState>()(
  persist(
    (set) => ({
      activeModule: 'admin',
      setActiveModule: (module) => set({ activeModule: module }),
    }),
    {
      name: 'synkra-module-storage',
    }
  )
);
