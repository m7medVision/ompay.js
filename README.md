# ompay.js

Unofficial TypeScript/Node.js SDK for OMPAY Payment Gateway integration.

## Installation

```bash
# npm
npm install ompay.js

# yarn
yarn add ompay.js

# pnpm
pnpm add ompay.js

# bun
bun add ompay.js
```

## Quick Start

```typescript
import { OMPayClient } from 'ompay.js';

const client = new OMPayClient({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  environment: 'sandbox',
});

const order = await client.createCheckout({
  amount: 100.0,
  currency: 'OMR',
  customer: {
    name: 'Omar Al-Busaidi',
    email: 'omar@example.com',
    phone: '+96891234567',
  },
});

console.log('Order ID:', order.orderId);
```

## Configuration

```typescript
interface OMPayConfig {
  clientId: string;
  clientSecret: string;
  environment?: 'sandbox' | 'production';
  timeout?: number;
  merchant?: {
    domain?: string;
    browserFingerprint?: string;
    userAgent?: string;
    ipAddress?: string;
    acceptLanguage?: string;
    cardEncryptionKey?: string;
  };
}
```

Use `merchant` defaults when calling merchant-hosted APIs. You can also pass a per-request `MerchantRequestContext` as the second argument to merchant-hosted methods.

## Bank-Hosted Checkout

### Create Checkout

Use either `customer` or `customerFields`. Both map to the gateway `customerFields` payload.

```typescript
const order = await client.createCheckout({
  amount: 100.0,
  currency: 'OMR',
  customerFields: {
    name: 'Omar Al-Busaidi',
    email: 'omar@example.com',
    phone: '+96891234567',
  },
  uiMode: 'checkout',
  redirectType: 'redirect',
  receiptId: 'ORDER-123',
  description: 'Order description',
  curn: 'CURN-123',
  metadata: { customField: 'value' },
});
```

### Check Payment Status

```typescript
const status = await client.checkStatus('order-id');

console.log('Status:', status.status);
console.log('Payment ID:', status.paymentId);
```

### Build Hosted Checkout URL

```typescript
const checkoutUrl = client.buildCheckoutUrl(
  'order-id',
  'https://merchant.example.com/return',
);
```

You can also pass an object form:

```typescript
const checkoutUrl = client.buildCheckoutUrl({
  orderId: 'order-id',
  redirectUrl: 'https://merchant.example.com/return',
  clientId: 'optional-client-id-override',
});
```

## Merchant-Hosted Flow

```typescript
import { OMPayClient } from 'ompay.js';

const client = new OMPayClient({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  environment: 'sandbox',
  merchant: {
    browserFingerprint: 'fingerprint-123',
    userAgent: 'Mozilla/5.0',
    domain: 'https://merchant.example.com',
    acceptLanguage: 'en-US',
    cardEncryptionKey: '64-char-hex-key-from-merchant-dashboard',
  },
});

const order = await client.createOrder({
  amount: 100.0,
  currency: 'OMR',
  description: 'Hosted order',
  receiptId: 'INV-1',
  customerFields: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '91234567',
  },
});

const encryptedCardDetails = client.encryptCardDetails({
  cardNumber: '4111111111111111',
  cardExpMonth: '02',
  cardExpYear: '27',
  cardCVV: '123',
});

const payment = await client.initiateTransaction({
  orderId: order.orderId,
  encryptedCardDetails,
  cardHolderName: 'Jane Doe',
  redirectionUrl: 'https://merchant.example.com/return',
  paymentMode: 'card',
  secureCard: true,
});

const paymentStatus = await client.getTransactionStatus(payment.paymentId);
```

Other merchant-hosted methods:

- `client.refundTransaction({ paymentId, amount }, context?)`
- `client.listDigitalCards(customerId, context?)`
- `client.deleteDigitalCard(customerId, digitalCardId, context?)`

Advanced merchant-hosted helpers:

- `client.buildMerchantHeaders(apiPath, context?, payload?)`
- `client.generateMerchantSignature(apiPath, payload?)`

## Transaction Webhooks

Merchants can configure S2S callback URLs in the merchant dashboard to receive transaction and refund updates.

Supported event types:

| Event Type | Description |
|------------|-------------|
| `TRANSACTION_COMPLETED` | Transaction completed successfully |
| `TRANSACTION_FAILED` | Transaction failed |
| `REFUND_SUCCESS` | Refund completed successfully |
| `REFUND_FAILED` | Refund failed |

Webhook payloads are exported as TypeScript types:

```typescript
import { OMPayClient, type OMPayWebhookEvent } from 'ompay.js';

const client = new OMPayClient({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
});

app.post('/ompay/webhook', async (req, res) => {
  const rawBody = req.body.toString('utf8');
  const event = JSON.parse(rawBody) as OMPayWebhookEvent;

  if (!client.verifyWebhookSignature(rawBody, event.data.signature)) {
    res.status(400).send('Signature mismatched');
    return;
  }

  switch (event.eventType) {
    case 'TRANSACTION_COMPLETED':
    case 'TRANSACTION_FAILED':
      console.log(event.data.paymentId, event.data.transactionType);
      break;
    case 'REFUND_SUCCESS':
    case 'REFUND_FAILED':
      console.log(event.data.refundId, event.data.paymentId);
      break;
  }

  res.status(204).send();
});
```

Use raw-body middleware for this route, such as `express.raw({ type: 'application/json' })`, so `verifyWebhookSignature` receives the exact payload OMPAY signed.

## Signature Verification

Use `verifyWebhookSignature` for the exact raw webhook body received from OMPAY and `verifySignature` for the documented `orderId|paymentId` payment signature format.

```typescript
const rawWebhookBody = JSON.stringify({ paymentId: 'pay-123', status: 'success' });
const isWebhookValid = client.verifyWebhookSignature(
  rawWebhookBody,
  'signature-from-header',
);

const isPaymentValid = client.verifySignature(
  { orderId: 'order-id', paymentId: 'payment-id' },
  'signature-from-callback',
);

client.verifySignatureOrThrow(
  { orderId: 'order-id', paymentId: 'payment-id' },
  'signature-from-callback',
);
```

## Additional Helpers

- `client.getClientId()`
- `client.getEnvironment()`
- `client.getBaseUrl()`

## Error Handling

```typescript
import { OMPayClient, OMPayError } from 'ompay.js';

try {
  const order = await client.createCheckout({
    amount: 100.0,
    currency: 'OMR',
    customerFields: {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '91234567',
    },
  });
} catch (error) {
  if (error instanceof OMPayError) {
    console.error('Error code:', error.code);
    console.error('Message:', error.message);
    console.error('Status:', error.statusCode);
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `AUTHENTICATION_ERROR` | Invalid client ID or secret |
| `VALIDATION_ERROR` | Invalid request parameters |
| `API_ERROR` | Server-side error |
| `NETWORK_ERROR` | Network connectivity issue |
| `TIMEOUT_ERROR` | Request timed out |
| `SIGNATURE_MISMATCH` | Invalid payment signature |
| `UNKNOWN_ERROR` | Unexpected SDK or runtime error |

## Test Cards

Use these official cards in the UAT/sandbox environment:

### VISA Card (Always approved)

- **Card Number:** 4111111111111111
- **Expiry:** 12/30
- **CVV:** 123

### Master Card (Always approved)

- **Card Number:** 5186001700008785
- **Expiry:** 12/30
- **CVV:** 123

### Visa Card (Always Rejected)

- **Card Number:** 4393570006367857
- **Expiry:** 12/30
- **CVV:** 123

## Environment URLs

| Environment | URL |
|-------------|-----|
| Sandbox (UAT) | https://api.uat.gateway.ompay.com |
| Production | https://api.gateway.ompay.com |

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Push to the branch (`git push origin feat/amazing-feature`)
4. Open a Pull Request

## License

MIT
