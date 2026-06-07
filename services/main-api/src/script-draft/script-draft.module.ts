// services/main-api/src/script-draft/script-draft.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScriptDraftController } from './script-draft.controller';
import { ScriptDraftService } from './script-draft.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'realty.script.generate',
    }),
  ],
  controllers: [ScriptDraftController],
  providers: [ScriptDraftService],
  exports: [ScriptDraftService],
})
export class ScriptDraftModule {}
