// services/main-api/src/video-job/video-job.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { VideoJobController } from './video-job.controller';
import { VideoJobService } from './video-job.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'realty.video.render',
    }),
  ],
  controllers: [VideoJobController],
  providers: [VideoJobService],
  exports: [VideoJobService],
})
export class VideoJobModule {}
