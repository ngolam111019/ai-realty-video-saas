// services/main-api/src/billing/billing.controller.ts
import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Post('payos/webhook')
  @HttpCode(200)
  async handlePayOsWebhook(@Body() payload: any) {
    // PayOS webhooks send { data, signature }
    const { data, signature } = payload || {};
    if (!data || !signature) {
      throw new BadRequestException('Invalid payload structure');
    }

    // Verify signature
    const isValid = this.billingService.verifyPayOsSignature(data, signature);
    if (!isValid) {
      throw new BadRequestException('Invalid signature');
    }

    // Process payment
    const result = await this.billingService.processWebhookPayment(
      data.orderCode?.toString(),
      data.amount,
      'PAYOS',
      data.paymentLinkId || 'payos-ref',
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post('stripe/webhook')
  @HttpCode(200)
  async handleStripeWebhook(
    @Body() rawBody: any,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing signature header');
    }

    // For E2E tests, the request body might be JSON or string
    const payloadString =
      typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);

    const isValid = this.billingService.verifyStripeSignature(
      payloadString,
      signature,
    );
    if (!isValid) {
      throw new BadRequestException('Invalid signature');
    }

    const event = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      await this.billingService.processWebhookPayment(
        intent.id,
        intent.amount,
        'STRIPE',
        intent.charges?.data?.[0]?.id || 'stripe-ref',
      );
    }

    return {
      success: true,
    };
  }
}
