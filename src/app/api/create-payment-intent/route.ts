import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeConfig } from '@/lib/stripeService';

export async function POST(request: Request) {
    try {
        const config = await getStripeConfig();

        if (!config.secretKey) {
            return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
        }

        const stripe = new Stripe(config.secretKey);
        const { amount, email } = await request.json();

        if (!amount) {
            return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Stripe expects integers in cents
            currency: 'pln',
            receipt_email: email,
            automatic_payment_methods: { enabled: true },
        });

        return NextResponse.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('create-payment-intent error:', message);
        return NextResponse.json(
            { error: `Internal Server Error: ${message}` },
            { status: 500 }
        );
    }
}
