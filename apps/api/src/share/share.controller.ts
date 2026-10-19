import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { ShareTaskResponse, SharedTask } from '@repo/shared';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/authenticated-request.type';
import { ShareService } from './share.service';

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000';

class SharedTaskDto {
  title!: string;
  description!: string | null;
  status!: string;
  dueDate!: string | null;
  createdAt!: string;
  ownerName!: string;
}

class ShareTaskResponseDto {
  url!: string;
  expiresAt!: string;
}

@ApiTags('share')
@Controller()
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Post('tasks/:id/share')
  @ApiBearerAuth('bearer')
  @ApiCreatedResponse({ type: ShareTaskResponseDto })
  async create(
    @CurrentUser() user: AuthUser,
    @Param('id') taskId: string,
  ): Promise<ShareTaskResponse> {
    const { token, expiresAt } = await this.shareService.createShareLink(
      user.userId,
      taskId,
    );

    return { url: `${WEB_URL}/s/${token}`, expiresAt };
  }

  @Delete('tasks/:id/share')
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ description: 'All share links for this task revoked' })
  async revoke(
    @CurrentUser() user: AuthUser,
    @Param('id') taskId: string,
  ): Promise<void> {
    await this.shareService.revokeShareLink(user.userId, taskId);
  }

  @Public()
  @Get('share/:token')
  @ApiOkResponse({ type: SharedTaskDto })
  resolve(@Param('token') token: string): Promise<SharedTask> {
    return this.shareService.resolveSharedTask(token);
  }
}
