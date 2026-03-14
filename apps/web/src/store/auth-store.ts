"use client";

import type { AuthUser } from "@streampix/shared";
import { create } from "zustand";

interface AuthState {
  user: AuthUser | null;
  realtimeToken: string | null;
  initialized: boolean;
  loading: boolean;
  setLoading: (value: boolean) => void;
  setSession: (input: { user: AuthUser; realtimeToken: string }) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  realtimeToken: null,
  initialized: false,
  loading: false,
  setLoading: (value) => set({ loading: value }),
  setSession: ({ user, realtimeToken }) =>
    set({
      user,
      realtimeToken,
      initialized: true,
      loading: false,
    }),
  clearSession: () =>
    set({
      user: null,
      realtimeToken: null,
      initialized: true,
      loading: false,
    }),
}));
