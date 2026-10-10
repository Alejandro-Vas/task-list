import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  AuthUser as SharedAuthUser,
  CreateTaskInput,
  Task as SharedTask,
  TaskStatus,
  UpdateTaskDueDateInput,
  UpdateTaskInput,
  UpdateTaskStatusInput,
} from '@repo/shared';

import { USER_ROLES } from '@repo/shared';

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
