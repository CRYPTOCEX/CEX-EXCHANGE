# Payment gateway logos

Every file here is **400x240 PNG with alpha**. Keep that spec: the deposit UI sizes
against it, and `depositGateway.image` / `withdrawGateway.image` only accept a local
`/img/...` or `/uploads/...` path, so these are referenced as
`/img/gateways/<alias>.png` straight from the seeder rows.

## In use

Each of these matches a `deposit_gateway.alias` (and, for TransFi, a
`withdraw_gateway.alias` too).

| File | Size | Weight |
|---|---|---|
| `2checkout.png` | 400x240 | 11.7 KB |
| `adyen.png` | 400x240 | 6.5 KB |
| `authorizenet.png` | 400x240 | 19.3 KB |
| `dlocal.png` | 400x240 | 13.8 KB |
| `eway.png` | 400x240 | 23.3 KB |
| `ipay88.png` | 400x240 | 20.9 KB |
| `klarna.png` | 400x240 | 9.4 KB |
| `mollie.png` | 400x240 | 11.4 KB |
| `payfast.png` | 400x240 | 13.7 KB |
| `paypal.png` | 400x240 | 31.8 KB |
| `paysafe.png` | 400x240 | 10.8 KB |
| `paystack.png` | 400x240 | 12.8 KB |
| `paytm.png` | 400x240 | 8.6 KB |
| `payu.png` | 400x240 | 15.9 KB |
| `stripe.png` | 400x240 | 13.8 KB |
| `transfi.png` | 400x240 | 15.8 KB |

## Held for gateways not yet integrated

**Do not delete these.** They are finished brand assets at the correct spec, kept so
that adding the gateway later is a code task rather than an asset hunt. A logo on its
own buys nothing — a gateway also needs a backend directory under
`backend/src/api/finance/deposit/fiat/<alias>/`, a seeder row, and a
`REDIRECT_GATEWAY_CONFIGS` entry — so their presence here does NOT mean the gateway
is available.

| File | Size | Weight |
|---|---|---|
| `ccavenue.png` | 400x240 | 21.5 KB |
| `flutterwave.png` | 400x240 | 13.2 KB |
| `payway.png` | 400x240 | 14.3 KB |
| `razorpay.png` | 400x240 | 21.3 KB |
| `revolut.png` | 400x240 | 9.7 KB |
| `skrill.png` | 400x240 | 20.7 KB |
| `square.png` | 400x240 | 26.2 KB |

---

_Regenerate this table after adding or removing a logo._
