import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProjectModule } from './project/project.module';
import { ScriptDraftModule } from './script-draft/script-draft.module';
import { VideoJobModule } from './video-job/video-job.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url:
            configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
          maxRetriesPerRequest: null,
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    AuthModule,
    ProjectModule,
    ScriptDraftModule,
    VideoJobModule,
    BillingModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
