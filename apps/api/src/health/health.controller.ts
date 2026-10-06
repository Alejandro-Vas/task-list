import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Health } from '../swagger/api-schemas';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOkResponse({ type: Health })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
