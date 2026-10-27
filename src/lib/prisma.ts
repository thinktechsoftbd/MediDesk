import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// the live DB is ~330 ms a query away: a save of a few statements in $transaction
// runs past Prisma's default 2 s wait / 5 s limit (P2028), so give transactions more time
export const db =
    globalForPrisma.prisma ??
    new PrismaClient({ transactionOptions: { maxWait: 15000, timeout: 30000 } });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
