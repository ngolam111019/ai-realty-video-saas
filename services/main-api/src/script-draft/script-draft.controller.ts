// services/main-api/src/script-draft/script-draft.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ScriptDraftService } from './script-draft.service';

@Controller('script-drafts')
@UseGuards(AuthGuard)
export class ScriptDraftController {
  constructor(private scriptDraftService: ScriptDraftService) {}

  @Post()
  async createDraft(@Req() req: any, @Body() data: any) {
    const res = await this.scriptDraftService.createDraft(req.user.id, data);
    return {
      success: true,
      data: res,
    };
  }

  @Get(':id')
  async getDraft(@Req() req: any, @Param('id') id: string) {
    const draft = await this.scriptDraftService.getDraft(req.user.id, id);
    return {
      success: true,
      data: draft,
    };
  }

  @Put(':id')
  async updateDraft(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    const updated = await this.scriptDraftService.updateDraft(
      req.user.id,
      id,
      data,
    );
    return {
      success: true,
      data: {
        draftId: updated.id,
        updatedAt: updated.updatedAt,
      },
    };
  }
}
