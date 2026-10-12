import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ADMIN_MAX_PER_PAGE,
  adminLogsQuerySchema,
  type AdminLogsQuery,
} from '@repo/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginatedAdminLogs } from '../swagger/api-schemas';
import { AdminLogsService } from './admin-logs.service';

@ApiTags('admin')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or expired access token' })
@Roles('ADMIN', 'OWNER')
@Controller('admin/logs')
export class AdminLogsController {
  constructor(private readonly service: AdminLogsService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: 'integer' })
  @ApiQuery({
    name: 'perPage',
    required: false,
    type: 'integer',
    description: `1..${ADMIN_MAX_PER_PAGE}, default 20.`,
  })
  @ApiOkResponse({ type: PaginatedAdminLogs })
  @ApiOperation({
    description:
      'Audit trail of admin actions. Rows survive a deleted user: names are then null.',
  })
  findAll(@Query() query: unknown) {
    const parsed = adminLogsQuerySchema.safeParse(query);

    if (!parsed.success) {
      throw new BadRequestException('Invalid logs query');
    }

    const input: AdminLogsQuery = parsed.data;
    return this.service.findAll(input);
  }
}
