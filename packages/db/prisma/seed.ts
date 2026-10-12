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

  const users = await prisma.user.createManyAndReturn({
    data: [
      {
        email: 'owner@example.com',
        name: 'Project Owner',
        passwordHash,
        role: 'OWNER',
      },
      {
        email: 'admin@example.com',
        name: 'Team Admin',
        passwordHash,
        role: 'ADMIN',
      },
      {
        email: 'alice@example.com',
        name: 'Alice Developer',
        passwordHash,
        role: 'USER',
      },
      {
        email: 'bob@example.com',
        name: 'Bob Designer',
        passwordHash,
        role: 'USER',
      },
      {
        email: 'carol@example.com',
        name: 'Carol QA',
        passwordHash,
        role: 'USER',
      },
    ],
  });

  const [owner, admin, alice, bob, carol] = users;

  const inboxProject = await prisma.project.create({
    data: { name: 'Inbox', ownerId: owner.id },
  });

  const devProject = await prisma.project.create({
    data: { name: 'Development', ownerId: admin.id },
  });

  const designProject = await prisma.project.create({
    data: { name: 'Design', ownerId: bob.id },
  });

  await prisma.task.createMany({
    data: [
      {
        title: 'Setup monorepo architecture',
        description: 'Initialize Turborepo with workspace configuration',
        status: 'DONE',
        assigneeId: owner.id,
        ownerId: owner.id,
        projectId: inboxProject.id,
      },
      {
        title: 'Connect Prisma ORM',
        description: 'Database schema, migrations, and client setup',
        status: 'DONE',
        assigneeId: admin.id,
        ownerId: owner.id,
        projectId: devProject.id,
      },
      {
        title: 'Add BullMQ queue system',
        description: 'Background job processing with Redis',
        status: 'IN_PROGRESS',
        assigneeId: alice.id,
        ownerId: owner.id,
        projectId: devProject.id,
      },
      {
        title: 'Build API endpoints',
        description: 'REST API for task CRUD operations',
        status: 'IN_PROGRESS',
        assigneeId: alice.id,
        ownerId: admin.id,
        projectId: devProject.id,
      },
      {
        title: 'Design system components',
        description: 'Reusable UI components library',
        status: 'TODO',
        assigneeId: bob.id,
        ownerId: bob.id,
        projectId: designProject.id,
      },
      {
        title: 'Create wireframes for admin panel',
        description: 'Low-fidelity sketches for admin features',
        status: 'DONE',
        assigneeId: bob.id,
        ownerId: bob.id,
        projectId: designProject.id,
      },
      {
        title: 'Write integration tests',
        description: 'E2E and integration test coverage',
        status: 'TODO',
        assigneeId: carol.id,
        ownerId: carol.id,
        projectId: inboxProject.id,
      },
      {
        title: 'Setup CI/CD pipeline',
        description: 'GitHub Actions for automated testing and deployment',
        status: 'TODO',
        ownerId: admin.id,
        projectId: devProject.id,
      },
      {
        title: 'Performance optimization',
        description: 'Database indexing and query optimization',
        status: 'TODO',
        assigneeId: alice.id,
        ownerId: admin.id,
        projectId: devProject.id,
      },
      {
        title: 'User onboarding flow',
        description: 'Registration, email verification, and first-time setup',
        status: 'IN_PROGRESS',
        assigneeId: carol.id,
        ownerId: owner.id,
        projectId: inboxProject.id,
      },
      {
        title: 'Deploy to production',
        description: 'Configure production environment and deploy',
        status: 'TODO',
        ownerId: owner.id,
        projectId: inboxProject.id,
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
