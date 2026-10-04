import bcrypt from 'bcrypt';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { createPrismaClient } from '../src';

loadEnv({ path: resolve(process.cwd(), '../../.env') });

async function main() {
  const prisma = createPrismaClient();

  await prisma.refreshToken.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('demo1234', 10);

  const user = await prisma.user.create({
    data: { email: 'demo@example.com', name: 'Demo User', passwordHash },
  });

  const project = await prisma.project.create({
    data: { name: 'Inbox', ownerId: user.id },
  });

  await prisma.task.createMany({
    data: [
      {
        title: 'Setup monorepo',
        status: 'DONE',
        assigneeId: user.id,
        ownerId: user.id,
        projectId: project.id,
      },
      {
        title: 'Connect Prisma',
        status: 'DONE',
        assigneeId: user.id,
        ownerId: user.id,
        projectId: project.id,
      },
      {
        title: 'Add BullMQ queue',
        status: 'IN_PROGRESS',
        assigneeId: user.id,
        ownerId: user.id,
        projectId: project.id,
      },
      {
        title: 'Build Next.js frontend',
        status: 'TODO',
        ownerId: user.id,
        projectId: project.id,
      },
      {
        title: 'Deploy to production',
        status: 'TODO',
        ownerId: user.id,
      },
    ],
  });

  const count = await prisma.task.count();
  console.log(`Seeded ${count} tasks`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
