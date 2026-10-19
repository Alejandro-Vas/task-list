import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  AdminLogItem as SharedAdminLogItem,
  AdminStats as SharedAdminStats,
  AdminUser as SharedAdminUser,
  AuthUser as SharedAuthUser,
  CreateTaskInput,
  Task as SharedTask,
  TaskStatus,
  UpdateAdminUserInput,
  UpdateTaskDueDateInput,
  UpdateTaskInput,
  UpdateTaskStatusInput,
  UpdateUserRoleInput,
} from '@repo/shared';

import { ADMIN_ACTIONS, USER_ROLES } from '@repo/shared';

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;

/**
 * Swagger schemas are derived from the real `@repo/shared` types: `implements`
 * fails compilation when a field is added or removed in the shared schema, so
 * the spec cannot drift from the code. Examples are omitted on purpose — Nest
 * generates them from the types automatically.
 */
export class Task implements SharedTask {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ type: 'string', nullable: true })
  description!: string | null;

  @ApiProperty({ enum: TASK_STATUSES })
  status!: TaskStatus;

  @ApiProperty({ type: 'string', nullable: true })
  assigneeId!: string | null;

  @ApiProperty()
  ownerId!: string;

  @ApiProperty({ type: 'string', nullable: true })
  projectId!: string | null;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  dueDate!: string | null;

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  pendingDeletionAt!: string | null;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  updatedAt!: string;
}

export class AuthUser implements SharedAuthUser {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: USER_ROLES })
  role!: SharedAuthUser['role'];
}

export class LoginBody {
  @ApiProperty()
  email!: string;

  @ApiProperty()
  password!: string;
}

export class RegisterBody {
  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  password!: string;
}

export class ChangePasswordBody {
  @ApiProperty()
  currentPassword!: string;

  @ApiProperty()
  newPassword!: string;
}

export class AuthResponse {
  @ApiProperty({ type: AuthUser })
  user!: AuthUser;

  @ApiProperty({
    description:
      'JWT access token (15 min). Refresh token is set in the httpOnly cookie `refresh_token`.',
  })
  accessToken!: string;
}

export class RefreshResponse {
  @ApiProperty({ description: 'New access token; the refresh cookie is rotated.' })
  accessToken!: string;
}

export class CreateTaskBody implements CreateTaskInput {
  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  dueDate?: string;
}

export class UpdateTaskBody implements UpdateTaskInput {
  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description?: string;
}

export class UpdateTaskStatusBody implements UpdateTaskStatusInput {
  @ApiProperty({ enum: TASK_STATUSES })
  status!: TaskStatus;
}

export class UpdateTaskDueDateBody implements UpdateTaskDueDateInput {
  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    description: 'null — clear date.',
  })
  dueDate!: string | null;
}

export class OverdueCount {
  @ApiProperty({ type: 'integer' })
  count!: number;
}

export class Health {
  @ApiProperty()
  status!: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  timestamp!: string;
}

export class AdminUser implements SharedAdminUser {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: USER_ROLES })
  role!: SharedAdminUser['role'];

  @ApiProperty()
  isBlocked!: boolean;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt!: string;

  @ApiProperty({
    type: 'integer',
    description: 'Tasks owned by the user.',
  })
  tasksCount!: number;

  @ApiProperty({ type: 'integer' })
  projectsCount!: number;
}

export class PaginatedAdminUsers {
  @ApiProperty({ type: [AdminUser] })
  items!: AdminUser[];

  @ApiProperty({ type: 'integer' })
  total!: number;

  @ApiProperty({ type: 'integer' })
  page!: number;

  @ApiProperty({ type: 'integer' })
  perPage!: number;
}

export class UpdateUserRoleBody implements UpdateUserRoleInput {
  @ApiProperty({ enum: USER_ROLES })
  role!: UpdateUserRoleInput['role'];
}

export class UpdateAdminUserBody implements UpdateAdminUserInput {
  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  email?: string;
}

export class AdminUsersByRole {
  @ApiProperty({ type: 'integer' })
  OWNER!: number;

  @ApiProperty({ type: 'integer' })
  ADMIN!: number;

  @ApiProperty({ type: 'integer' })
  USER!: number;
}

export class AdminStats implements SharedAdminStats {
  @ApiProperty({ type: 'integer' })
  usersTotal!: number;

  @ApiProperty({ type: AdminUsersByRole })
  usersByRole!: AdminUsersByRole;

  @ApiProperty({ type: 'integer' })
  tasksTotal!: number;

  @ApiProperty({ type: 'integer' })
  tasksOverdue!: number;

  @ApiProperty({ type: 'integer' })
  projectsTotal!: number;

  @ApiProperty({ type: [AdminUser] })
  recentUsers!: AdminUser[];
}

export class AdminLogItem implements SharedAdminLogItem {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  actorId!: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'null — the actor was deleted.',
  })
  actorName!: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  targetId!: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'null — the target was deleted.',
  })
  targetName!: string | null;

  @ApiProperty({ enum: ADMIN_ACTIONS })
  action!: SharedAdminLogItem['action'];

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  meta!: SharedAdminLogItem['meta'];

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt!: string;
}

export class PaginatedAdminLogs {
  @ApiProperty({ type: [AdminLogItem] })
  items!: AdminLogItem[];

  @ApiProperty({ type: 'integer' })
  total!: number;

  @ApiProperty({ type: 'integer' })
  page!: number;

  @ApiProperty({ type: 'integer' })
  perPage!: number;
}
