import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

export type { PrismaClient } from './generated/prisma/client';
export { TaskStatus } from './generated/prisma/enums';

export function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env in the repo root.',
    );
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({ adapter });
}
