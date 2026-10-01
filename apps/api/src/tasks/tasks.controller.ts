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
  updateTaskSchema,
  updateTaskStatusSchema,
  type CreateTaskInput,
  type FindAllTasksQuery,
  type UpdateTaskInput,
  type UpdateTaskStatusInput,
} from '@repo/shared';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@Query() query: unknown) {
    const parsed = findAllTasksQuerySchema.safeParse(query);

    if (!parsed.success) {
      throw new BadRequestException('Invalid status filter');
    }

    const { status }: FindAllTasksQuery = parsed.data;
    return this.tasksService.findAll(status);
  }

  @Get('overdue/count')
  async countOverdue() {
    return this.tasksService.countOverdue().then((count) => ({ count }));
  }

  @Post()
  create(@Body() body: unknown) {
    const input: CreateTaskInput = createTaskSchema.parse(body);
    return this.tasksService.create(input);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: unknown) {
    const input: UpdateTaskStatusInput = updateTaskStatusSchema.parse(body);
    return this.tasksService.updateStatus(id, input.status);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    const input: UpdateTaskInput = updateTaskSchema.parse(body);
    return this.tasksService.update(id, input);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.tasksService.delete(id);
  }
}
