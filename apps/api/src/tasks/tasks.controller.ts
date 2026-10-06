import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  createTaskSchema,
  findAllTasksQuerySchema,
  TASK_FILTERS,
  updateTaskDueDateSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  type CreateTaskInput,
  type FindAllTasksQuery,
  type UpdateTaskDueDateInput,
  type UpdateTaskInput,
  type UpdateTaskStatusInput,
} from '@repo/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/authenticated-request.type';
import {
  CreateTaskBody,
  OverdueCount,
  Task,
  UpdateTaskBody,
  UpdateTaskDueDateBody,
  UpdateTaskStatusBody,
} from '../swagger/api-schemas';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or expired access token' })
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiQuery({ name: 'status', enum: TASK_FILTERS, required: false })
  @ApiOkResponse({ type: [Task] })
  findAll(@CurrentUser() user: AuthUser, @Query() query: unknown) {
    const parsed = findAllTasksQuerySchema.safeParse(query);

    if (!parsed.success) {
      throw new BadRequestException('Invalid status filter');
    }

    const { status }: FindAllTasksQuery = parsed.data;
    return this.tasksService.findAll(user.userId, status);
  }

  @Get('overdue/count')
  @ApiOkResponse({ type: OverdueCount })
  async countOverdue(@CurrentUser() user: AuthUser) {
    return this.tasksService
      .countOverdue(user.userId)
      .then((count) => ({ count }));
  }

  @Post()
  @ApiCreatedResponse({ type: Task })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateTaskBody) {
    const input: CreateTaskInput = createTaskSchema.parse(body);
    return this.tasksService.create(user.userId, input);
  }

  @Patch(':id/status')
  @ApiOkResponse({ type: Task })
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateTaskStatusBody,
  ) {
    const input: UpdateTaskStatusInput = updateTaskStatusSchema.parse(body);
    return this.tasksService.updateStatus(user.userId, id, input.status);
  }

  @Patch(':id/due-date')
  @ApiOkResponse({ type: Task })
  updateDueDate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateTaskDueDateBody,
  ) {
    const input: UpdateTaskDueDateInput =
      updateTaskDueDateSchema.parse(body);
    return this.tasksService.updateDueDate(user.userId, id, input.dueDate);
  }

  @Patch(':id')
  @ApiOkResponse({ type: Task })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateTaskBody,
  ) {
    const input: UpdateTaskInput = updateTaskSchema.parse(body);
    return this.tasksService.update(user.userId, id, input);
  }

  @Delete(':id')
  @ApiOkResponse({ type: Task })
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tasksService.delete(user.userId, id);
  }
}
