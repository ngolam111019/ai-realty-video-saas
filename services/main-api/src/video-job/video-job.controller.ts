// services/main-api/src/video-job/video-job.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { VideoJobService } from './video-job.service';
import { existsSync, createReadStream } from 'fs';

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

  @Get(':id/video')
  async serveVideo(@Param('id') id: string, @Res() res: any) {
    const videoPath = `/tmp/realty-videos/${id}.mp4`;
    if (!existsSync(videoPath)) {
      return res.status(404).send('Video not found');
    }
    res.setHeader('Content-Type', 'video/mp4');
    createReadStream(videoPath).pipe(res);
  }

  @Get(':id/thumbnail')
  async serveThumbnail(@Param('id') id: string, @Res() res: any) {
    const thumbPath = `/tmp/realty-videos/${id}-thumb.jpg`;
    if (!existsSync(thumbPath)) {
      return res.status(404).send('Thumbnail not found');
    }
    res.setHeader('Content-Type', 'image/jpeg');
    createReadStream(thumbPath).pipe(res);
  }
}
