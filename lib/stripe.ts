import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const PLATFORM_FEE_PERCENTAGE = parseInt(process.env.PLATFORM_FEE_PERCENTAGE || '12');

/**
 * Calculate platform fee and doctor payout
 */
export function calculateFees(priceInCents: number) {
  const platformFee = Math.round(priceInCents * (PLATFORM_FEE_PERCENTAGE / 100));
  const doctorPayout = priceInCents - platformFee;
  
  return {
    total: priceInCents,
    platformFee,
    doctorPayout,
  };
}

/**
 * Create Stripe Connect account for doctor
 */
export async function createConnectAccount(email: string, country: string = 'US') {
  const account = await stripe.accounts.create({
    type: 'express',
    country,
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  return account;
}

/**
 * Create account link for doctor onboarding
 */
export async function createAccountLink(accountId: string, returnUrl: string, refreshUrl: string) {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return accountLink;
}

/**
 * Create payment intent for appointment booking
 */
export async function createPaymentIntent(
  amount: number,
  doctorStripeAccountId: string | null,
  metadata: {
    appointment_id: string;
    doctor_id: string;
    patient_id: string;
  }
) {
  const fees = calculateFees(amount);

  // Build payment intent config
  const paymentConfig: any = {
    amount: fees.total,
    currency: 'usd',
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  };

  // Only add transfer_data if doctor has Stripe account (production)
  if (doctorStripeAccountId) {
    paymentConfig.application_fee_amount = fees.platformFee;
    paymentConfig.transfer_data = {
      destination: doctorStripeAccountId,
    };
  }

  const paymentIntent = await stripe.paymentIntents.create(paymentConfig);

  return { paymentIntent, fees };
}

/**
 * Create refund for cancelled appointment
 */
export async function createRefund(
  paymentIntentId: string,
  refundAmount: number,
  reason?: string
) {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: refundAmount,
    reason: reason as any,
  });

  return refund;
}

/**
 * Create instant payout to doctor (costs $0.50 extra)
 */
export async function createInstantPayout(
  accountId: string,
  amount: number
) {
  const payout = await stripe.payouts.create(
    {
      amount,
      currency: 'usd',
      method: 'instant',
    },
    {
      stripeAccount: accountId,
    }
  );

  return payout;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
