import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
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
  adminUsersQuerySchema,
  updateAdminUserSchema,
  updateUserRoleSchema,
  type AdminUsersQuery,
  type UpdateAdminUserInput,
  type UpdateUserRoleInput,
} from '@repo/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/authenticated-request.type';
import {
  AdminStats,
  AdminUser,
  PaginatedAdminUsers,
  UpdateAdminUserBody,
  UpdateUserRoleBody,
} from '../swagger/api-schemas';
import { UsersAdminService } from './users-admin.service';

@ApiTags('admin')
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Missing or expired access token' })
@Roles('ADMIN', 'OWNER')
@Controller('admin/users')
export class UsersAdminController {
  constructor(private readonly service: UsersAdminService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: 'integer' })
  @ApiQuery({
    name: 'perPage',
    required: false,
    type: 'integer',
    description: `1..${ADMIN_MAX_PER_PAGE}, default 20.`,
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'role', required: false, enum: ['OWNER', 'ADMIN', 'USER'] })
  @ApiOkResponse({ type: PaginatedAdminUsers })
  findAll(@CurrentUser() actor: AuthUser, @Query() query: unknown) {
    const parsed = adminUsersQuerySchema.safeParse(query);

    if (!parsed.success) {
      throw new BadRequestException('Invalid users query');
    }

    const input: AdminUsersQuery = parsed.data;
    return this.service.findAll(actor, input);
  }

  @Get('stats')
  @ApiOkResponse({ type: AdminStats })
  stats() {
    return this.service.stats();
  }

  @Get(':id')
  @ApiOkResponse({ type: AdminUser })
  findOne(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.service.findOne(actor, id);
  }

  @Patch(':id/role')
  @ApiOkResponse({ type: AdminUser })
  @ApiOperation({
    description:
      'Assigns a role below the actor. Own role and sessions are revoked after a change.',
  })
  updateRole(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateUserRoleBody,
  ) {
    const parsed = updateUserRoleSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException('Invalid role');
    }

    const input: UpdateUserRoleInput = parsed.data;
    return this.service.updateRole(actor, id, input);
  }

  @Patch(':id')
  @ApiOkResponse({ type: AdminUser })
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateAdminUserBody,
  ) {
    const parsed = updateAdminUserSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException('Invalid user data');
    }

    const input: UpdateAdminUserInput = parsed.data;
    return this.service.update(actor, id, input);
  }

  @Post(':id/block')
  @HttpCode(200)
  @ApiOkResponse({ type: AdminUser })
  @ApiOperation({ description: 'Blocks the user and revokes their sessions.' })
  block(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.service.setBlocked(actor, id, true);
  }

  @Delete(':id/block')
  @ApiOkResponse({ type: AdminUser })
  unblock(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.service.setBlocked(actor, id, false);
  }

  @Post(':id/revoke-sessions')
  @HttpCode(204)
  @ApiOperation({ description: 'Drops every refresh token of the user.' })
  revokeSessions(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.service.revokeSessions(actor, id);
  }

  @Delete(':id')
  @ApiOkResponse({ type: AdminUser })
  @ApiOperation({
    description:
      'Deletes the user with all their tasks and projects. Cannot be undone.',
  })
  remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.service.delete(actor, id);
  }
}
