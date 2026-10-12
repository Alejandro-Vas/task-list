import { z } from 'zod';
import { userRoleSchema } from './auth';

/**
 * Admin panel contracts. The role hierarchy is the position in `USER_ROLES`:
 * OWNER (0) > ADMIN (1) > USER (2). An actor may manage only roles with a
 * strictly greater rank, i.e. strictly below their own.
 */
export const USER_ROLE_RANK: Record<'OWNER' | 'ADMIN' | 'USER', number> = {
  OWNER: 0,
  ADMIN: 1,
  USER: 2,
};

export const ADMIN_MAX_PER_PAGE = 100;

export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(ADMIN_MAX_PER_PAGE).default(20),
  search: z.string().trim().min(1).max(100).optional(),
  role: userRoleSchema.optional(),
});
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;

export const adminUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: userRoleSchema,
  isBlocked: z.boolean(),
  createdAt: z.string(),
  tasksCount: z.number().int(),
  projectsCount: z.number().int(),
});
export type AdminUser = z.infer<typeof adminUserSchema>;

export const paginatedAdminUsersSchema = z.object({
  items: z.array(adminUserSchema),
  total: z.number().int(),
  page: z.number().int(),
  perPage: z.number().int(),
});
export type PaginatedAdminUsers = z.infer<typeof paginatedAdminUsersSchema>;

export const updateUserRoleSchema = z.object({
  role: userRoleSchema,
});
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const updateAdminUserSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    email: z.email().trim().toLowerCase().optional(),
  })
  .refine((data) => data.name !== undefined || data.email !== undefined, {
    message: 'At least one field is required',
    path: ['name'],
  });
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;

export const adminStatsSchema = z.object({
  usersTotal: z.number().int(),
  usersByRole: z.object({
    OWNER: z.number().int(),
    ADMIN: z.number().int(),
    USER: z.number().int(),
  }),
  tasksTotal: z.number().int(),
  tasksOverdue: z.number().int(),
  projectsTotal: z.number().int(),
  recentUsers: z.array(adminUserSchema),
});
export type AdminStats = z.infer<typeof adminStatsSchema>;

export const ADMIN_ACTIONS = [
  'role_change',
  'user_update',
  'user_delete',
  'user_block',
  'user_unblock',
  'sessions_revoke',
] as const;
export const adminActionSchema = z.enum(ADMIN_ACTIONS);
export type AdminAction = z.infer<typeof adminActionSchema>;

export const adminLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(ADMIN_MAX_PER_PAGE).default(20),
});
export type AdminLogsQuery = z.infer<typeof adminLogsQuerySchema>;

export const adminLogItemSchema = z.object({
  id: z.string(),
  actorId: z.string(),
  actorName: z.string().nullable(),
  targetId: z.string().nullable(),
  targetName: z.string().nullable(),
  action: adminActionSchema,
  meta: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
});
export type AdminLogItem = z.infer<typeof adminLogItemSchema>;

export const paginatedAdminLogsSchema = z.object({
  items: z.array(adminLogItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  perPage: z.number().int(),
});
export type PaginatedAdminLogs = z.infer<typeof paginatedAdminLogsSchema>;
