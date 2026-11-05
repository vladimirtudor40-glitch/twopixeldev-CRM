import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: "ADMIN" | "AGENT_VANZARI" } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: "ADMIN" | "AGENT_VANZARI";
  }
}
