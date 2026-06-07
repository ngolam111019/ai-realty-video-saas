// services/main-api/src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from './auth.guard';
import * as crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

@Controller('auth')
export class AuthController {
  constructor(private prisma: PrismaService) {}

  @Post('register')
  async register(@Body() body: any) {
    const { email, password, name } = body;
    if (!email || !password || !name) {
      throw new BadRequestException('Email, mật khẩu và tên là bắt buộc');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email đã tồn tại trên hệ thống');
    }

    const passwordHash = hashPassword(password);

    // Create user and wallet in a transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: 'USER',
          status: 'ACTIVE',
        },
      });

      await tx.tokenWallet.create({
        data: {
          userId: newUser.id,
          balance: 10,
        },
      });

      return newUser;
    });

    // Fetch user with wallet
    const userWithWallet = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { wallet: true },
    });

    return {
      user: userWithWallet,
      token: user.id,
    };
  }

  @Post('login')
  async login(@Body() body: any) {
    const { email, password } = body;
    if (!email || !password) {
      throw new BadRequestException('Email và mật khẩu là bắt buộc');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { wallet: true },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // If passwordHash is not set (e.g. OAuth user), do not allow login via credentials
    if (!user.passwordHash || user.passwordHash !== hashPassword(password)) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    return {
      user,
      token: user.id,
    };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Req() req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      include: { wallet: true },
    });
    return user;
  }
}
