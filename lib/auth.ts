import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

import { pool } from "@/lib/db";

export const auth = betterAuth({
  appName: "AP Creative Internal Dashboard",

  database: pool,

  emailAndPassword: {
    enabled: true,
  },

  plugins: [
    admin({
      defaultRole: "employee",
      adminRoles: ["admin"],
    }),

    // Keep this last for Next.js cookie support.
    nextCookies(),
  ],
});
