# Order Notification Implementation Plan

## Goal
Send order confirmation notifications after a successful payment.
1. **Seller**: Email (`gabinet@mikrostomart.pl`) + Telegram Bot.
2. **Buyer**: Email (to the address provided in checkout).

## Steps

### 1. Create `/api/order-confirmation/route.ts`
- **Input**: `cartItems`, `total`, `customerDetails`, `paymentId`.
- **Logic**:
    - **Telegram**: Send summary message to configured Chat IDs.
    - **Seller Email**: Send clean HTML summary to `gabinet@mikrostomart.pl`.
    - **Buyer Email**: Send "Thank you for your order" email to `customerDetails.email`.
- **Dependencies**: `resend`, environment variables (`TELEGRAM_BOT_TOKEN`, `RESEND_API_KEY`).

### 2. Update `CheckoutForm.tsx`
- In `handlePaymentSuccess`:
    - Before calling `onSuccess` (which closes modal/clears cart), call `/api/order-confirmation`.
    - Pass necessary data (`cart`, `total`, `formData`, `paymentIntent.id`).
    - Note: Cart clearing should happen *after* the API call starts (or pass data before clearing).

### 3. Verification
- Perform a test purchase (using 2 PLN test product).
- Verify emails arrival.
- Verify Telegram message arrival.

## Environment Variables Needed
(Already exist from Contact Form work, checking if they are set correctly).
- `RESEND_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
