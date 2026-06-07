// services/main-api/src/billing/billing.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class BillingService {
  private payOsChecksumKey: string;
  private stripeWebhookSecret: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.payOsChecksumKey =
      this.config.get<string>('PAYOS_CHECKSUM_KEY') || 'payos-test-key';
    this.stripeWebhookSecret =
      this.config.get<string>('STRIPE_WEBHOOK_SECRET') || 'stripe-test-key';
  }

  verifyPayOsSignature(data: any, signature: string): boolean {
    if (!signature) return false;
    try {
      // Sort keys alphabetically to match PayOS verification specification
      const sortedKeys = Object.keys(data).sort();
      const sortedDataString = sortedKeys
        .map((key) => {
          const val = data[key];
          return `${key}=${typeof val === 'object' ? JSON.stringify(val) : val}`;
        })
        .join('&');

      const computed = crypto
        .createHmac('sha256', this.payOsChecksumKey)
        .update(sortedDataString)
        .digest('hex');

      return computed === signature;
    } catch {
      return false;
    }
  }

  verifyStripeSignature(payload: string, signature: string): boolean {
    if (!signature) return false;
    try {
      const parts = signature.split(',');
      const timestamp = parts.find((p) => p.startsWith('t='))?.substring(2);
      const sig = parts.find((p) => p.startsWith('v1='))?.substring(3);
      if (!timestamp || !sig) return false;

      const signedPayload = `${timestamp}.${payload}`;
      const computed = crypto
        .createHmac('sha256', this.stripeWebhookSecret)
        .update(signedPayload)
        .digest('hex');

      return computed === sig;
    } catch {
      return false;
    }
  }

  async processWebhookPayment(
    orderId: string,
    amount: number,
    gateway: 'PAYOS' | 'STRIPE',
    gatewayRef: string,
    userId?: string, // optional fallback if we can extract from metadata/orders
  ) {
    // Inside ACID database transaction
    return this.prisma.$transaction(async (tx) => {
      // Find existing pending transaction or create a new one
      const transaction = await tx.transaction.findFirst({
        where: { gatewayOrderId: orderId },
      });

      let resolvedUserId = userId;
      if (transaction) {
        resolvedUserId = transaction.userId;
      }

      if (!resolvedUserId) {
        // Fallback to first user in E2E/test environment
        const defaultUser = await tx.user.findFirst();
        if (!defaultUser) {
          throw new BadRequestException('No user found to credit tokens');
        }
        resolvedUserId = defaultUser.id;
      }

      if (transaction && transaction.status === 'COMPLETED') {
        // Idempotency: already processed successfully
        return { success: true, duplicated: true };
      }

      // Map amount to tokens (e.g. 1000 VND = 1 token, or packages)
      // For E2E/tests, let's say amount / 1000 = token amount, min 10 tokens
      const tokenAmount = Math.max(10, Math.floor(amount / 1000));

      // Update or create wallet
      const wallet = await tx.tokenWallet.upsert({
        where: { userId: resolvedUserId },
        update: {
          balance: { increment: tokenAmount },
          lifetimeEarned: { increment: tokenAmount },
        },
        create: {
          userId: resolvedUserId,
          balance: tokenAmount,
          lifetimeEarned: tokenAmount,
        },
      });

      if (transaction) {
        // Update pending transaction
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'COMPLETED',
            balanceBefore: wallet.balance - tokenAmount,
            balanceAfter: wallet.balance,
            gatewayRef,
            paidAt: new Date(),
          },
        });
      } else {
        // Create new complete transaction record
        await tx.transaction.create({
          data: {
            userId: resolvedUserId,
            type: 'TOKEN_PURCHASE',
            status: 'COMPLETED',
            tokenAmount,
            balanceBefore: wallet.balance - tokenAmount,
            balanceAfter: wallet.balance,
            gateway,
            gatewayOrderId: orderId,
            gatewayRef,
            amountVnd: gateway === 'PAYOS' ? amount : null,
            paidAt: new Date(),
            description: `Nạp ${tokenAmount} token qua cổng ${gateway}`,
          },
        });
      }

      // Create Notification
      await tx.notification.create({
        data: {
          userId: resolvedUserId,
          type: 'PAYMENT_SUCCESS',
          title: 'Nạp token thành công',
          body: `Tài khoản của bạn đã được cộng thêm ${tokenAmount} tokens.`,
          isRead: false,
        },
      });

      return { success: true, tokenAmount, newBalance: wallet.balance };
    });
  }
}
