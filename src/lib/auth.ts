import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await db.user.findUnique({ where: { email: credentials.email }, include: { roles: { include: { role: true } } } });
        if (!user || user.status !== "ACTIVE") return null;
        if (!(await bcrypt.compare(credentials.password, user.passwordHash))) return null;
        return { id: String(user.id), name: user.name, email: user.email, roles: user.roles.map((x: any) => x.role.name) };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.userId = user.id; token.roles = (user as any).roles ?? []; }
      return token;
    },
    async session({ session, token }) {
      if (session.user) { (session.user as any).id = token.userId; (session.user as any).roles = token.roles; }
      return session;
    }
  },
  pages: { signIn: "/login" }
};

export const getSession = () => getServerSession(authOptions);
