import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  createTaskSchema,
  updateTaskStatusSchema,
  type CreateTaskInput,
  type UpdateTaskStatusInput,
} from '@repo/shared';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll() {
    return this.tasksService.findAll();
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

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.tasksService.delete(id);
  }
}
