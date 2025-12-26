# ompay.js

Unofficial Node.js SDK for OMPAY Payment Gateway integration.

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
  environment: 'sandbox', // or 'production'
});

// Create a checkout order
const order = await client.createCheckout({
  amount: 100.00,
  currency: 'OMR',
  customer: {
    name: 'Omar Al-Busaidi',
    email: 'omar@example.com',
    phone: '+96891234567',
  },
});

console.log('Order ID:', order.orderId);
```

## API Reference

### Configuration

```typescript
interface OMPayConfig {
  clientId: string;
  clientSecret: string;
  environment?: 'sandbox' | 'production'; // default: 'sandbox'
  timeout?: number; // default: 30000ms
}
```

### Create Checkout

Create a new payment order:

```typescript
const order = await client.createCheckout({
  amount: 100.00,
  currency: 'OMR',
  customer: {
    name: 'Omar Al-Busaidi',
    email: 'omar@example.com',
    phone: '+96891234567',
  },
  uiMode: 'checkout', // optional
  redirectType: 'redirect', // or 'post'
  orderReference: 'ORDER-123', // optional
  metadata: { customField: 'value' }, // optional
});
```

### Check Payment Status

Verify the status of an order:

```typescript
const status = await client.checkStatus('order-id');

console.log('Status:', status.status);
console.log('Payment ID:', status.paymentId);
```

### Verify Payment Signature

Verify webhook/callback signatures:

```typescript
const isValid = client.verifySignature(
  { orderId: 'order-id', paymentId: 'payment-id' },
  'signature-from-webhook'
);

// Or throw on invalid signature
client.verifySignatureOrThrow(
  { orderId: 'order-id', paymentId: 'payment-id' },
  'signature-from-webhook'
);
```

## Error Handling

```typescript
import { OMPayClient, OMPayError } from 'ompay.js';

try {
  const order = await client.createCheckout({ /* ... */ });
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

## Test Cards

Use these cards in the UAT/sandbox environment:

### Local Debit Card
- **Card Number:** 4393570006367857
- **Expiry:** 03/28
- **CVV:** 152

### Credit/International Card
- **Card Number:** 4012001037490006
- **Expiry:** 12/25
- **CVV:** 123

## Environment URLs

| Environment | URL |
|-------------|-----|
| Sandbox (UAT) | https://api.uat.gateway.ompay.com |
| Production | https://api.gateway.ompay.com |

## Development

```bash
# Install dependencies
bun install

# Run tests
bun run test

# Build
bun run build

# Type check
bun run typecheck
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Push to the branch (`git push origin feat/amazing-feature`)
4. Open a Pull Request

## License

MIT
