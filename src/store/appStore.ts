import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lang } from "../i18n/translations";
import type { Session } from "../types";
import { service } from "../services";

interface AppState {
  session: Session | null;
  lang: Lang;
  setLang: (lang: Lang) => void;
  loginAirline: (params: {
    airlineCode: string;
    gateId: string;
    username: string;
    password: string;
  }) => Promise<void>;
  loginAdmin: () => Promise<void>;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      session: null,
      lang: "th",
      setLang: (lang) => set({ lang }),
      loginAirline: async (params) => {
        const session = await service.loginAirline(params);
        set({ session });
      },
      loginAdmin: async () => {
        const session = await service.loginAdmin();
        set({ session });
      },
      logout: () => set({ session: null }),
    }),
    {
      name: "sbg-session",
      partialize: (s) => ({ session: s.session, lang: s.lang }),
    }
  )
);