import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { AdminUser, UserRole } from '@repo/shared';
import type { AuthUser } from '../auth/types/authenticated-request.type';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLogsService, type AdminLogEntry } from './admin-logs.service';
import { UsersAdminService } from './users-admin.service';

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isBlocked: boolean;
  createdAt: Date;
  _count: { ownedTasks: number; projects: number };
};

const ACTOR_OWNER: AuthUser = {
  userId: 'u-owner',
  email: 'owner@example.com',
  role: 'OWNER',
};
const ACTOR_ADMIN: AuthUser = {
  userId: 'u-admin',
  email: 'admin@example.com',
  role: 'ADMIN',
};

function makeRow(
  id: string,
  role: UserRole,
  overrides: Partial<UserRow> = {},
): UserRow {
  return {
    id,
    email: `${id}@example.com`,
    name: `User ${id}`,
    role,
    isBlocked: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    _count: { ownedTasks: 4, projects: 2 },
    ...overrides,
  };
}

function createContext() {
  const users = new Map<string, UserRow>();
  const calls: string[] = [];
  const logEntries: AdminLogEntry[] = [];

  const track = (name: string): void => {
    calls.push(name);
  };

  const copy = (row: UserRow): UserRow => ({
    ...row,
    createdAt: row.createdAt,
    _count: { ...row._count },
  });

  const matchesRole = (
    row: UserRow,
    role: UserRole | { in: UserRole[] } | undefined,
  ): boolean => {
    if (role === undefined) {
      return true;
    }

    return typeof role === 'string' ? row.role === role : role.in.includes(row.role);
  };

  const user = {
    findUnique: vi.fn(async (args: { where: { id?: string; email?: string } }) => {
      track('user.findUnique');

      // Real Prisma returns a fresh object, so the row is copied: the service
      // keeps the pre-update snapshot for the audit log.
      if (args.where.id !== undefined) {
        const row = users.get(args.where.id);

        return row ? copy(row) : null;
      }

      const row = [...users.values()].find(
        (candidate) => candidate.email === args.where.email,
      );

      return row ? copy(row) : null;
    }),
    findMany: vi.fn(async (args?: { where?: { role?: UserRole | { in: UserRole[] } } }) => {
      track('user.findMany');
      const role = args?.where?.role;

      return [...users.values()]
        .filter((row) => matchesRole(row, role))
        .map(copy);
    }),
    count: vi.fn(async (args?: { where?: { role?: UserRole | { in: UserRole[] } } }) => {
      track('user.count');
      const role = args?.where?.role;

      return [...users.values()].filter((row) => matchesRole(row, role)).length;
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<UserRow> }) => {
      track('user.update');
      const row = users.get(where.id);

      if (!row) {
        throw new Error(`missing user ${where.id}`);
      }

      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          Object.assign(row, { [key]: value });
        }
      }

      return { ...row, _count: { ...row._count } };
    }),
    delete: vi.fn(async ({ where }: { where: { id: string } }) => {
      track('user.delete');
      const row = users.get(where.id);

      if (!row) {
        throw new Error(`missing user ${where.id}`);
      }

      users.delete(where.id);

      return row;
    }),
  };

  const task = {
    updateMany: vi.fn(async () => {
      track('task.updateMany');

      return { count: 1 };
    }),
    deleteMany: vi.fn(async () => {
      track('task.deleteMany');

      return { count: 2 };
    }),
    count: vi.fn(async () => {
      track('task.count');

      return 7;
    }),
  };

  const project = {
    findMany: vi.fn(async () => {
      track('project.findMany');

      return [{ id: 'p-1' }];
    }),
    deleteMany: vi.fn(async () => {
      track('project.deleteMany');

      return { count: 1 };
    }),
    count: vi.fn(async () => {
      track('project.count');

      return 3;
    }),
  };

  const refreshToken = {
    updateMany: vi.fn(async () => {
      track('refreshToken.updateMany');

      return { count: 1 };
    }),
  };

  const adminActionLog = {
    create: vi.fn(async ({ data }: { data: AdminLogEntry }) => {
      track('adminActionLog.create');
      logEntries.push(data);

      return { id: 'log-1', ...data, meta: data.meta ?? null, createdAt: new Date() };
    }),
  };

  const client = {
    user,
    task,
    project,
    refreshToken,
    adminActionLog,
    $transaction: vi.fn(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: unknown) => Promise<unknown>)({
          user,
          task,
          project,
          refreshToken,
          adminActionLog,
        });
      }

      return Promise.all(arg as unknown[]);
    }),
  };

  const prisma = { client } as unknown as PrismaService;
  const logs = new AdminLogsService(prisma);
  const service = new UsersAdminService(prisma, logs);

  return {
    service,
    users,
    calls,
    logEntries,
    mocks: { user, task, project, refreshToken, adminActionLog, client },
  };
}

describe('should enforce the strict role hierarchy for admin queries', () => {
  it('should list only roles below the ADMIN actor', async () => {
    const { service, users, mocks } = createContext();
    users.set('u-admin', makeRow('u-admin', 'ADMIN'));
    users.set('u-basic', makeRow('u-basic', 'USER'));

    const result = await service.findAll(ACTOR_ADMIN, {
      page: 1,
      perPage: 20,
    });

    expect(mocks.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: { in: ['USER'] } }),
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual<AdminUser>({
      id: 'u-basic',
      email: 'u-basic@example.com',
      name: 'User u-basic',
      role: 'USER',
      isBlocked: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      tasksCount: 4,
      projectsCount: 2,
    });
    expect(result).toEqual(
      expect.objectContaining({ total: 1, page: 1, perPage: 20 }),
    );
  });

  it('should list ADMIN and USER rows for the OWNER actor', async () => {
    const { service, mocks } = createContext();

    await service.findAll(ACTOR_OWNER, { page: 1, perPage: 20 });

    expect(mocks.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: { in: ['ADMIN', 'USER'] } }),
      }),
    );
  });

  it('should forbid an ADMIN from filtering by a role they do not manage', async () => {
    const { service, mocks } = createContext();

    await expect(
      service.findAll(ACTOR_ADMIN, { page: 1, perPage: 20, role: 'ADMIN' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(mocks.user.findMany).not.toHaveBeenCalled();
  });

  it('should allow an OWNER to filter by the USER role', async () => {
    const { service, mocks } = createContext();

    await service.findAll(ACTOR_OWNER, { page: 1, perPage: 20, role: 'USER' });

    expect(mocks.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: 'USER' }),
      }),
    );
  });

  it('should search by email and name, case-insensitively', async () => {
    const { service, mocks } = createContext();

    await service.findAll(ACTOR_OWNER, { page: 1, perPage: 20, search: 'demo' });

    expect(mocks.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { email: { contains: 'demo', mode: 'insensitive' } },
            { name: { contains: 'demo', mode: 'insensitive' } },
          ],
        }),
      }),
    );
  });

  it('should forbid an ADMIN from reading an OWNER card', async () => {
    const { service, users } = createContext();
    users.set('u-owner', makeRow('u-owner', 'OWNER'));

    await expect(service.findOne(ACTOR_ADMIN, 'u-owner')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('should reject a missing target with 404', async () => {
    const { service } = createContext();

    await expect(
      service.findOne(ACTOR_OWNER, 'nope'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should collect global stats with recent users', async () => {
    const { service, users } = createContext();
    users.set('u-owner', makeRow('u-owner', 'OWNER'));
    users.set('u-admin', makeRow('u-admin', 'ADMIN'));
    users.set('u-basic', makeRow('u-basic', 'USER'));

    const stats = await service.stats();

    expect(stats.usersTotal).toBe(3);
    expect(stats.usersByRole).toEqual({ OWNER: 1, ADMIN: 1, USER: 1 });
    expect(stats.tasksTotal).toBe(7);
    expect(stats.projectsTotal).toBe(3);
    expect(stats.recentUsers).toHaveLength(3);
  });
});

describe('should refuse admin actions on the actor themself', () => {
  it('should forbid changing own role', async () => {
    const { service, users, mocks } = createContext();
    users.set('u-owner', makeRow('u-owner', 'OWNER'));

    await expect(
      service.updateRole(ACTOR_OWNER, 'u-owner', { role: 'USER' }),
    ).rejects.toMatchObject({
      message: 'You cannot change your own role',
    });

    expect(mocks.user.update).not.toHaveBeenCalled();
  });

  it('should forbid deleting own account', async () => {
    const { service, users, mocks } = createContext();
    users.set('u-admin', makeRow('u-admin', 'ADMIN'));

    await expect(
      service.delete(ACTOR_ADMIN, 'u-admin'),
    ).rejects.toMatchObject({ message: 'You cannot delete your own account' });

    expect(mocks.user.delete).not.toHaveBeenCalled();
  });

  it('should forbid blocking own account', async () => {
    const { service, users, mocks } = createContext();
    users.set('u-admin', makeRow('u-admin', 'ADMIN'));

    await expect(
      service.setBlocked(ACTOR_ADMIN, 'u-admin', true),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(mocks.user.update).not.toHaveBeenCalled();
  });

  it('should forbid revoking own sessions', async () => {
    const { service, users, mocks } = createContext();
    users.set('u-owner', makeRow('u-owner', 'OWNER'));

    await expect(
      service.revokeSessions(ACTOR_OWNER, 'u-owner'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(mocks.refreshToken.updateMany).not.toHaveBeenCalled();
  });
});

describe('should change roles within the hierarchy', () => {
  it('should promote a USER to ADMIN for the OWNER actor', async () => {
    const { service, users } = createContext();
    users.set('u-basic', makeRow('u-basic', 'USER'));

    const updated = await service.updateRole(ACTOR_OWNER, 'u-basic', {
      role: 'ADMIN',
    });

    expect(updated.role).toBe('ADMIN');
    expect(users.get('u-basic')?.role).toBe('ADMIN');
  });

  it('should revoke refresh tokens and write a role_change entry', async () => {
    const { service, users, mocks, logEntries } = createContext();
    users.set('u-basic', makeRow('u-basic', 'USER'));

    await service.updateRole(ACTOR_OWNER, 'u-basic', { role: 'ADMIN' });

    expect(mocks.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u-basic', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(logEntries).toEqual([
      {
        actorId: 'u-owner',
        targetId: 'u-basic',
        action: 'role_change',
        meta: { from: 'USER', to: 'ADMIN' },
      },
    ]);
  });

  it('should forbid an ADMIN from assigning a role they do not outrank', async () => {
    const { service, users, mocks } = createContext();
    users.set('u-basic', makeRow('u-basic', 'USER'));

    await expect(
      service.updateRole(ACTOR_ADMIN, 'u-basic', { role: 'ADMIN' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(mocks.user.update).not.toHaveBeenCalled();
  });

  it('should reject assigning the role the target already has', async () => {
    const { service, users } = createContext();
    users.set('u-basic', makeRow('u-basic', 'USER'));

    await expect(
      service.updateRole(ACTOR_OWNER, 'u-basic', { role: 'USER' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should reject managing a USER that is already at the lowest role', async () => {
    const { service, users, mocks } = createContext();
    users.set('u-basic', makeRow('u-basic', 'USER'));

    // For an ADMIN the only manageable role is USER, so assigning USER to a
    // USER is the "already assigned" case, not a hierarchy violation.
    await expect(
      service.updateRole(ACTOR_ADMIN, 'u-basic', { role: 'USER' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mocks.user.update).not.toHaveBeenCalled();
  });
});

describe('should edit profile fields of a manageable user', () => {
  it('should update the name and log user_update', async () => {
    const { service, users, mocks, logEntries } = createContext();
    users.set('u-basic', makeRow('u-basic', 'USER'));

    const updated = await service.update(ACTOR_OWNER, 'u-basic', {
      name: 'Renamed',
    });

    expect(updated.name).toBe('Renamed');
    expect(mocks.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: 'Renamed', email: undefined } }),
    );
    expect(logEntries[0]).toMatchObject({ action: 'user_update' });
  });

  it('should reject an email already taken by another user', async () => {
    const { service, users } = createContext();
    users.set('u-basic', makeRow('u-basic', 'USER'));
    users.set('u-other', makeRow('u-other', 'USER', { email: 'taken@example.com' }));

    await expect(
      service.update(ACTOR_OWNER, 'u-basic', { email: 'taken@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(users.get('u-basic')?.email).toBe('u-basic@example.com');
  });

  it('should accept the email the target already has', async () => {
    const { service, users } = createContext();
    users.set('u-basic', makeRow('u-basic', 'USER'));

    const updated = await service.update(ACTOR_OWNER, 'u-basic', {
      email: 'u-basic@example.com',
    });

    expect(updated.email).toBe('u-basic@example.com');
  });
});

describe('should block and unblock a manageable user', () => {
  it('should block the user, drop sessions and log user_block', async () => {
    const { service, users, mocks, logEntries } = createContext();
    users.set('u-basic', makeRow('u-basic', 'USER'));

    const updated = await service.setBlocked(ACTOR_OWNER, 'u-basic', true);

    expect(updated.isBlocked).toBe(true);
    expect(mocks.refreshToken.updateMany).toHaveBeenCalledTimes(1);
    expect(logEntries[0]).toMatchObject({ action: 'user_block' });
  });

  it('should unblock without touching sessions', async () => {
    const { service, users, mocks, logEntries } = createContext();
    users.set('u-basic', makeRow('u-basic', 'USER', { isBlocked: true }));

    const updated = await service.setBlocked(ACTOR_OWNER, 'u-basic', false);

    expect(updated.isBlocked).toBe(false);
    expect(mocks.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(logEntries[0]).toMatchObject({ action: 'user_unblock' });
  });

  it('should forbid an ADMIN from blocking an OWNER', async () => {
    const { service, users, mocks } = createContext();
    users.set('u-owner', makeRow('u-owner', 'OWNER'));

    await expect(
      service.setBlocked(ACTOR_ADMIN, 'u-owner', true),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(mocks.user.update).not.toHaveBeenCalled();
  });
});

describe('should revoke every session of a manageable user', () => {
  it('should drop refresh tokens and log sessions_revoke', async () => {
    const { service, users, mocks, logEntries } = createContext();
    users.set('u-basic', makeRow('u-basic', 'USER'));

    await service.revokeSessions(ACTOR_ADMIN, 'u-basic');

    expect(mocks.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u-basic', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(logEntries).toEqual([
      { actorId: 'u-admin', targetId: 'u-basic', action: 'sessions_revoke' },
    ]);
  });
});

describe('should delete a user with a full cascade', () => {
  it('should detach relations, drop projects and the user, then log it', async () => {
    const { service, users, calls, logEntries } = createContext();
    users.set('u-basic', makeRow('u-basic', 'USER'));

    const deleted = await service.delete(ACTOR_OWNER, 'u-basic');

    expect(deleted.id).toBe('u-basic');
    expect(users.has('u-basic')).toBe(false);
    expect(calls).toEqual([
      'user.findUnique',
      'refreshToken.updateMany',
      'task.updateMany',
      'task.deleteMany',
      'project.findMany',
      'task.updateMany',
      'project.deleteMany',
      'user.delete',
      'adminActionLog.create',
    ]);
    expect(logEntries[0]).toMatchObject({
      action: 'user_delete',
      actorId: 'u-owner',
      targetId: 'u-basic',
      meta: { email: 'u-basic@example.com', role: 'USER' },
    });
  });

  it('should skip detaching project tasks when the user has no projects', async () => {
    const { service, users, mocks, calls } = createContext();
    users.set('u-basic', makeRow('u-basic', 'USER'));
    mocks.project.findMany.mockResolvedValueOnce([]);

    await service.delete(ACTOR_OWNER, 'u-basic');

    const detachCalls = calls.filter((call) => call === 'task.updateMany');

    expect(detachCalls).toHaveLength(1);
  });

  it('should forbid an ADMIN from deleting an OWNER', async () => {
    const { service, users, mocks } = createContext();
    users.set('u-owner', makeRow('u-owner', 'OWNER'));

    await expect(
      service.delete(ACTOR_ADMIN, 'u-owner'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(mocks.user.delete).not.toHaveBeenCalled();
  });
});
