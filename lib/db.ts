type PrismaClientType = unknown;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientType };

export async function getPrisma(): Promise<any | null> {
  if (!process.env.DATABASE_URL) return null;

  if (globalForPrisma.prisma) return globalForPrisma.prisma as any;

  const mod = await import("@prisma/client");
  const PrismaClient = (mod as any).PrismaClient as new () => any;
  const client = new PrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}
