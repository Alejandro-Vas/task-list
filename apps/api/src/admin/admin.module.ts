import { Module } from '@nestjs/common';
import { AdminLogsController } from './admin-logs.controller';
import { AdminLogsService } from './admin-logs.service';
import { UsersAdminController } from './users-admin.controller';
import { UsersAdminService } from './users-admin.service';

@Module({
  controllers: [AdminLogsController, UsersAdminController],
  providers: [AdminLogsService, UsersAdminService],
})
export class AdminModule {}
