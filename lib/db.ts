import type { PrismaClient } from "@prisma/client";

type PrismaClientType = PrismaClient;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientType };

export async function getPrisma(): Promise<PrismaClientType | null> {
  if (!process.env.DATABASE_URL) return null;

  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const mod = await import("@prisma/client");
  const client = new mod.PrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}
