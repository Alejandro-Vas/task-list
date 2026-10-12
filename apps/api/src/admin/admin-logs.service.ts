import { Injectable } from '@nestjs/common';
import { Prisma, type AdminActionLog } from '@repo/db';
import type {
  AdminAction,
  AdminLogItem,
  AdminLogsQuery,
  PaginatedAdminLogs,
} from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';

export type AdminLogMeta = Record<string, string | number | boolean | null>;

export type AdminLogEntry = {
  actorId: string;
  targetId: string | null;
  action: AdminAction;
  meta?: AdminLogMeta;
};

/** Names are resolved in a second query: the log has no FK on purpose, so it
 * outlives a deleted user and keeps `null` instead of a name. */
type LogWithNames = AdminActionLog & {
  actorName: string | null;
  targetName: string | null;
};

@Injectable()
export class AdminLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async write(entry: AdminLogEntry, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma.client;

    await client.adminActionLog.create({
      data: {
        actorId: entry.actorId,
        targetId: entry.targetId,
        action: entry.action,
        meta: entry.meta,
      },
    });
  }

  async findAll(query: AdminLogsQuery): Promise<PaginatedAdminLogs> {
    const { page, perPage } = query;

    const [rows, total] = await this.prisma.client.$transaction([
      this.prisma.client.adminActionLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.client.adminActionLog.count(),
    ]);

    return {
      items: await this.withNames(rows),
      total,
      page,
      perPage,
    };
  }

  private async withNames(
    rows: AdminActionLog[],
  ): Promise<AdminLogItem[]> {
    const ids = [
      ...new Set(
        rows
          .flatMap((row) => [row.actorId, row.targetId])
          .filter((id): id is string => id !== null),
      ),
    ];

    if (ids.length === 0) {
      return rows.map((row) => this.toItem(row, new Map()));
    }

    const users = await this.prisma.client.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    const names = new Map(users.map((user) => [user.id, user.name]));

    return rows.map((row) =>
      this.toItem(row as LogWithNames, names),
    );
  }

  private toItem(
    row: AdminActionLog,
    names: Map<string, string>,
  ): AdminLogItem {
    return {
      id: row.id,
      actorId: row.actorId,
      actorName: names.get(row.actorId) ?? null,
      targetId: row.targetId,
      targetName:
        row.targetId === null ? null : names.get(row.targetId) ?? null,
      action: row.action as AdminAction,
      meta: (row.meta as AdminLogMeta | null) ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
