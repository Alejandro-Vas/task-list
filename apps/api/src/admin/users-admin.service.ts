import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import type {
  AdminStats,
  AdminUser,
  AdminUsersQuery,
  PaginatedAdminUsers,
  UpdateAdminUserInput,
  UpdateUserRoleInput,
  UserRole,
} from '@repo/shared';
import type { AuthUser } from '../auth/types/authenticated-request.type';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLogsService } from './admin-logs.service';
import { canManageRole, manageableRoles } from './role-hierarchy';

const COUNT_INCLUDE = {
  _count: { select: { ownedTasks: true, projects: true } },
} satisfies Prisma.UserInclude;

type UserWithCounts = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isBlocked: boolean;
  createdAt: Date;
  _count: { ownedTasks: number; projects: number };
};

const RECENT_USERS_LIMIT = 5;

@Injectable()
export class UsersAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logs: AdminLogsService,
  ) {}

  async findAll(
    actor: AuthUser,
    query: AdminUsersQuery,
  ): Promise<PaginatedAdminUsers> {
    const { page, perPage, search, role } = query;
    const allowed = manageableRoles(actor.role);

    if (role && !allowed.includes(role)) {
      throw new ForbiddenException('Insufficient role');
    }

    const where: Prisma.UserWhereInput = {
      role: role ?? { in: allowed },
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.client.$transaction([
      this.prisma.client.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: COUNT_INCLUDE,
      }),
      this.prisma.client.user.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toAdminUser(row)),
      total,
      page,
      perPage,
    };
  }

  async stats(): Promise<AdminStats> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [ownerCount, adminCount, userCount, tasksTotal, tasksOverdue, projectsTotal, recent] =
      await this.prisma.client.$transaction([
        this.prisma.client.user.count({ where: { role: 'OWNER' } }),
        this.prisma.client.user.count({ where: { role: 'ADMIN' } }),
        this.prisma.client.user.count({ where: { role: 'USER' } }),
        this.prisma.client.task.count(),
        this.prisma.client.task.count({
          where: { dueDate: { lt: startOfToday }, status: { not: 'DONE' } },
        }),
        this.prisma.client.project.count(),
        this.prisma.client.user.findMany({
          orderBy: { createdAt: 'desc' },
          take: RECENT_USERS_LIMIT,
          include: COUNT_INCLUDE,
        }),
      ]);

    return {
      usersTotal: ownerCount + adminCount + userCount,
      usersByRole: { OWNER: ownerCount, ADMIN: adminCount, USER: userCount },
      tasksTotal,
      tasksOverdue,
      projectsTotal,
      recentUsers: recent.map((row) => this.toAdminUser(row)),
    };
  }

  async findOne(actor: AuthUser, id: string): Promise<AdminUser> {
    const target = await this.getManageableUser(actor, id);

    return this.toAdminUser(target);
  }

  async updateRole(
    actor: AuthUser,
    id: string,
    input: UpdateUserRoleInput,
  ): Promise<AdminUser> {
    const target = await this.getManageableUser(actor, id, {
      denySelf: 'You cannot change your own role',
    });

    if (!canManageRole(actor.role, input.role)) {
      throw new ForbiddenException(
        'Insufficient role to assign the requested role',
      );
    }

    if (target.role === input.role) {
      throw new BadRequestException('This role is already assigned');
    }

    const updated = await this.prisma.client.$transaction(async (tx) => {
      const changed = await tx.user.updateMany({
        where: { id, role: target.role },
        data: { role: input.role },
      });

      if (changed.count !== 1) {
        throw new ConflictException(
          'User role changed concurrently, retry the action',
        );
      }

      // Access tokens live 15 min and carry the role, so sessions are dropped.
      await this.revokeSessionsOf(id, tx);

      await this.logs.write(
        {
          actorId: actor.userId,
          targetId: id,
          action: 'role_change',
          meta: { from: target.role, to: input.role },
        },
        tx,
      );

      return this.reloadManagedUser(tx, id);
    });

    return this.toAdminUser(updated);
  }

  async update(
    actor: AuthUser,
    id: string,
    input: UpdateAdminUserInput,
  ): Promise<AdminUser> {
    const target = await this.getManageableUser(actor, id, {
      denySelf: 'You cannot edit your own account here',
    });

    if (input.email && input.email !== target.email) {
      const taken = await this.prisma.client.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });

      if (taken) {
        throw new ConflictException('Email is already registered');
      }
    }

    const updated = await this.prisma.client.$transaction(async (tx) => {
      const changed = await tx.user.updateMany({
        where: { id, role: target.role },
        data: { name: input.name, email: input.email },
      });

      if (changed.count !== 1) {
        throw new ConflictException(
          'User role changed concurrently, retry the action',
        );
      }

      await this.logs.write(
        {
          actorId: actor.userId,
          targetId: id,
          action: 'user_update',
          meta: {
            ...(input.name ? { name: input.name } : {}),
            ...(input.email ? { email: input.email } : {}),
          },
        },
        tx,
      );

      return this.reloadManagedUser(tx, id);
    });

    return this.toAdminUser(updated);
  }

  async revokeSessions(actor: AuthUser, id: string): Promise<void> {
    await this.getManageableUser(actor, id, {
      denySelf: 'Use logout-all to drop your own sessions',
    });

    await this.prisma.client.$transaction(async (tx) => {
      const current = await tx.user.findUnique({
        where: { id },
        select: { role: true },
      });

      if (!current) {
        throw new NotFoundException('User not found');
      }

      if (!canManageRole(actor.role, current.role)) {
        throw new ForbiddenException('Insufficient role');
      }

      await this.revokeSessionsOf(id, tx);

      await this.logs.write(
        {
          actorId: actor.userId,
          targetId: id,
          action: 'sessions_revoke',
        },
        tx,
      );
    });
  }

  async setBlocked(
    actor: AuthUser,
    id: string,
    blocked: boolean,
  ): Promise<AdminUser> {
    const target = await this.getManageableUser(actor, id, {
      denySelf: 'You cannot block your own account',
    });

    const updated = await this.prisma.client.$transaction(async (tx) => {
      const changed = await tx.user.updateMany({
        where: { id, role: target.role },
        data: { isBlocked: blocked },
      });

      if (changed.count !== 1) {
        throw new ConflictException(
          'User role changed concurrently, retry the action',
        );
      }

      if (blocked) {
        await this.revokeSessionsOf(id, tx);
      }

      await this.logs.write(
        {
          actorId: actor.userId,
          targetId: id,
          action: blocked ? 'user_block' : 'user_unblock',
        },
        tx,
      );

      return this.reloadManagedUser(tx, id);
    });

    return this.toAdminUser(updated);
  }

  /**
   * Full cascade delete. `Task.owner` and `Project.owner` have no
   * `onDelete: Cascade` in the schema, so the order matters: detach assignee
   * links, drop owned tasks, detach tasks of owned projects, then delete
   * projects and the user. The audit log has no FK and survives.
   */
  async delete(actor: AuthUser, id: string): Promise<AdminUser> {
    const target = await this.getManageableUser(actor, id, {
      denySelf: 'You cannot delete your own account',
    });

    await this.prisma.client.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.task.updateMany({
        where: { assigneeId: id },
        data: { assigneeId: null },
      });
      await tx.task.deleteMany({ where: { ownerId: id } });

      const projects = await tx.project.findMany({
        where: { ownerId: id },
        select: { id: true },
      });
      const projectIds = projects.map((project) => project.id);

      if (projectIds.length > 0) {
        await tx.task.updateMany({
          where: { projectId: { in: projectIds } },
          data: { projectId: null },
        });
      }

      await tx.project.deleteMany({ where: { ownerId: id } });
      // Refresh tokens are removed by their own `onDelete: Cascade`. The role
      // filter keeps a concurrently promoted target out of reach.
      const deleted = await tx.user.deleteMany({
        where: { id, role: target.role },
      });

      if (deleted.count !== 1) {
        throw new ConflictException(
          'User role changed concurrently, retry the action',
        );
      }

      await this.logs.write(
        {
          actorId: actor.userId,
          targetId: id,
          action: 'user_delete',
          meta: { email: target.email, role: target.role },
        },
        tx,
      );
    });

    return this.toAdminUser(target);
  }

  /**
   * Loads the target and checks the strict hierarchy. Managing one's own
   * account is impossible by definition (a role is never below itself);
   * `denySelf` only replaces the message so the UI can explain it.
   */
  private async getManageableUser(
    actor: AuthUser,
    id: string,
    options: { denySelf?: string } = {},
  ): Promise<UserWithCounts> {
    const user = await this.prisma.client.user.findUnique({
      where: { id },
      include: COUNT_INCLUDE,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!canManageRole(actor.role, user.role)) {
      throw new ForbiddenException(
        id === actor.userId && options.denySelf
          ? options.denySelf
          : 'Insufficient role',
      );
    }

    return user;
  }

  private async reloadManagedUser(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<UserWithCounts> {
    const user = await tx.user.findUnique({
      where: { id },
      include: COUNT_INCLUDE,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async revokeSessionsOf(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma.client;

    await client.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private toAdminUser(user: UserWithCounts): AdminUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt.toISOString(),
      tasksCount: user._count.ownedTasks,
      projectsCount: user._count.projects,
    };
  }
}
