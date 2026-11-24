import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnProtected =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/products") ||
        nextUrl.pathname.startsWith("/inventory") ||
        nextUrl.pathname.startsWith("/sales") ||
        nextUrl.pathname.startsWith("/customers") ||
        nextUrl.pathname.startsWith("/suppliers") ||
        nextUrl.pathname.startsWith("/expenses") ||
        nextUrl.pathname.startsWith("/reports") ||
        nextUrl.pathname.startsWith("/notifications") ||
        nextUrl.pathname.startsWith("/settings") ||
        nextUrl.pathname.startsWith("/profile") ||
        nextUrl.pathname.startsWith("/categories");

      if (isOnProtected) {
        if (isLoggedIn) return true;
        return false; // Redirect to login
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
