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
  createTaskSchema,
  findAllTasksQuerySchema,
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
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: unknown) {
    const parsed = findAllTasksQuerySchema.safeParse(query);

    if (!parsed.success) {
      throw new BadRequestException('Invalid status filter');
    }

    const { status }: FindAllTasksQuery = parsed.data;
    return this.tasksService.findAll(user.userId, status);
  }

  @Get('overdue/count')
  async countOverdue(@CurrentUser() user: AuthUser) {
    return this.tasksService
      .countOverdue(user.userId)
      .then((count) => ({ count }));
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const input: CreateTaskInput = createTaskSchema.parse(body);
    return this.tasksService.create(user.userId, input);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input: UpdateTaskStatusInput = updateTaskStatusSchema.parse(body);
    return this.tasksService.updateStatus(user.userId, id, input.status);
  }

  @Patch(':id/due-date')
  updateDueDate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input: UpdateTaskDueDateInput = updateTaskDueDateSchema.parse(body);
    return this.tasksService.updateDueDate(user.userId, id, input.dueDate);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input: UpdateTaskInput = updateTaskSchema.parse(body);
    return this.tasksService.update(user.userId, id, input);
  }

  @Delete(':id')
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tasksService.delete(user.userId, id);
  }
}
