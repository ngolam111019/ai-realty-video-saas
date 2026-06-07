// services/main-api/src/auth/auth.module.ts
import { Module, Global } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}
