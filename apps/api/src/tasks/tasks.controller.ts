import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { createTaskSchema, type CreateTaskInput } from '@repo/shared';
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

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.tasksService.delete(id);
  }
}
