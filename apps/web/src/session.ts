import { defineStore } from "pinia";
import { api } from "./api";

export type SessionUser = {
  id: number;
  username: string;
  user_full_name: string;
  admin: boolean;
  branch_id: number;
  branch_name: string;
  permissions: string[];
  roles: { id: number; name: string }[];
};

export const useSession = defineStore("session", {
  state: () => ({
    user: null as SessionUser | null,
    ready: false,
  }),
  actions: {
    async login(username: string, password: string) {
      const result = await api<{ data: { access_token: string; user: SessionUser } }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      localStorage.setItem("ebokt.token", result.data.access_token);
      this.user = result.data.user;
    },
    async load() {
      if (!localStorage.getItem("ebokt.token")) {
        this.user = null;
        this.ready = true;
        return;
      }
      try {
        const result = await api<{ data: SessionUser }>("/api/v1/auth/me");
        this.user = result.data;
      } catch {
        this.user = null;
        localStorage.removeItem("ebokt.token");
      } finally {
        this.ready = true;
      }
    },
    can(code: string) {
      if (!this.user) return false;
      return this.user.admin || this.user.permissions.includes(code);
    },
    logout() {
      localStorage.removeItem("ebokt.token");
      this.user = null;
    },
  },
});
