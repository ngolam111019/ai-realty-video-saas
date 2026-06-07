// services/main-api/src/video-job/video-job.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { VideoJobService } from './video-job.service';

@Controller('video-jobs')
@UseGuards(AuthGuard)
export class VideoJobController {
  constructor(private videoJobService: VideoJobService) {}

  @Post()
  async createVideoJob(@Req() req: any, @Body() data: any) {
    const res = await this.videoJobService.createVideoJob(req.user.id, data);
    return {
      success: true,
      data: res,
    };
  }

  @Get(':id/status')
  async getJobStatus(@Req() req: any, @Param('id') id: string) {
    const status = await this.videoJobService.getJobStatus(req.user.id, id);
    return {
      success: true,
      data: status,
    };
  }
}
