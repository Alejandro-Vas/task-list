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

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;

/**
 * Swagger-схемы выведены из реальных типов `@repo/shared`: `implements` даёт
 * ошибку компиляции, если поле появится или исчезнет в общей схеме, так что
 * спека не разъезжается с кодом. Примеры не заданы — Nest подставляет их из
 * типов автоматически.
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

export class AuthResponse {
  @ApiProperty({ type: AuthUser })
  user!: AuthUser;

  @ApiProperty({
    description:
      'JWT access token (15 мин). Refresh token ставится в httpOnly cookie `refresh_token`.',
  })
  accessToken!: string;
}

export class RefreshResponse {
  @ApiProperty({ description: 'Новый access token, cookie ротируется.' })
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
    description: 'null — очистить дату.',
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
