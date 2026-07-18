# Chargezio Backend — CLAUDE.md

## What This Is
REST API for the **ChargeOnGo** EV charging mobile app (India).
OTP auth via 2Factor.in. Data in MongoDB Atlas. Sessions via JWT.

## Stack
| Layer | Choice |
|-------|--------|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Database | MongoDB + Mongoose 8 |
| Auth | 2Factor.in OTP → JWT (jsonwebtoken) |
| Validation | Joi |
| Security | Helmet, CORS, express-rate-limit |

## Folder Layout
```
src/
  config/       db.js (Mongoose connection)
  controllers/  Thin — call service, return ApiResponse. No business logic here.
  middleware/   auth.js (verifyToken/JWT), errorHandler.js, validate.js (body + query)
  models/       User, Vehicle, OtpSession, OtpAttempt, ChargingStation, ChargingSession, Transaction
  routes/       index.js → auth, profile, stations, sessions, wallet
  services/     All business logic: auth, profile, station, session, wallet
  utils/        ApiError.js, ApiResponse.js, asyncHandler.js
  validators/   Joi schemas: auth, profile, station, session, wallet
```

## Auth Flow
1. Client sends `POST /api/auth/send-otp { phone }` → backend generates OTP, calls 2Factor.in SMS API
2. Backend stores OTP in `OtpSession` (TTL 10 min, up to 3 live OTPs per phone)
3. User enters OTP → client sends `POST /api/auth/verify-otp { phone, otp }`
4. Backend verifies against any active OtpSession — any of the last 3 sent OTPs works
5. On success: finds or creates User, issues JWT signed with `JWT_SECRET` (30d default)
6. Client sends `Authorization: Bearer <token>` on all protected calls
7. `verifyToken` middleware decodes JWT, loads User from MongoDB, attaches `req.user`

## Rate Limiting & Security
- 5 failed OTP attempts → phone blocked 15 min
- 60s cooldown between OTP resend requests
- `OtpAttempt` collection tracks per-phone failures (soft block)

## Response Shape
```json
{ "success": true|false, "message": "...", "data": { ... } }
```

## All Implemented APIs

### Auth
```
POST   /api/auth/send-otp             Public — { phone } → { expiresAt }
POST   /api/auth/verify-otp           Public — { phone, otp } → { token, userId, isNewUser, isProfileComplete }
POST   /api/auth/logout               Auth — client discards JWT
```

### Profile
```
GET    /api/profile                   Auth — full profile + vehicles array
POST   /api/profile                   Auth — create profile (one-time; 409 if already done)
PUT    /api/profile                   Auth — partial update
DELETE /api/profile                   Auth — soft-delete user + all vehicles
GET    /api/profile/stats             Auth — real session aggregates (sessions, spend, energy, avg duration)
GET    /api/profile/vehicles          Auth — list active vehicles (primary first)
POST   /api/profile/vehicles          Auth — add vehicle
PUT    /api/profile/vehicles/:id      Auth — partial update vehicle
DELETE /api/profile/vehicles/:id      Auth — soft-delete, auto-promotes next primary
PATCH  /api/profile/vehicles/:id/primary  Auth — set as primary
```

### Charging Stations
```
GET    /api/stations/nearby?lat=&lng=&radius=&connector=&type=   Auth — geospatial search
GET    /api/stations/:id              Auth — station detail with charger availability
```

### Charging Sessions
```
POST   /api/sessions/start            Auth — { stationId, chargerId, targetSocPercent?, startSocPercent?, vehicleId? }
GET    /api/sessions                  Auth — session history (Trips tab); ?status=&page=&limit=
GET    /api/sessions/:id              Auth — live session data (poll every ~5s while active)
PATCH  /api/sessions/:id/stop         Auth — stop charging, finalize cost, deduct wallet
```

### Wallet
```
GET    /api/wallet                    Auth — { balance, recentTransactions[10] }
POST   /api/wallet/topup/initiate     Auth — { amount: 50–10000 } → creates Razorpay order, returns { orderId, amount (paise), currency, keyId }
POST   /api/wallet/topup/verify       Auth — { razorpayOrderId, razorpayPaymentId, razorpaySignature } → verifies HMAC, credits wallet
GET    /api/wallet/transactions       Auth — paginated ledger; ?page=&limit=
```

### Webhooks
```
POST   /api/webhooks/razorpay         Public (Razorpay server) — handles payment.captured event; raw body + HMAC verification
```

## Key Decisions
- **OTP self-generated** — `crypto.randomInt` for 6-digit OTP; 2Factor.in is SMS carrier only
- **JWT auth** — signed with `JWT_SECRET`, 30d default; logout is client-side only
- **Soft deletes everywhere** — `isActive: false`; historical data preserved
- **Station geospatial** — `2dsphere` index on `location.coordinates [lng, lat]`
- **Session snapshots** — station/charger/vehicle data copied at session-start so history is stable
- **Live session data** — computed deterministically from elapsed time + charger specs (real OCPP data in production)
- **Wallet minimum** — ₹50 balance required to start a session
- **Session ID format** — `S{YYYY}-{MM}-{DD}-{NNNN}` (e.g. `S2024-05-24-0012`)
- **User level** — updated on session stop via `user.computeLevel(completedCount)`
- **Stats** — `GET /api/profile/stats` runs real aggregation on ChargingSession collection
- **Razorpay payment flow** — two-step: `initiate` creates Razorpay order, `verify` checks HMAC signature before crediting wallet; `RazorpayOrder` model guards idempotency (status=paid prevents double-credit); webhook is a fallback safety net
- **Webhook raw body** — `express.raw({ type: 'application/json' })` applied only to `/api/webhooks/razorpay` before `express.json()` so HMAC verification works correctly

## Env Vars Required
| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `TWO_FACTOR_API_KEY` | 2Factor.in API key |
| `JWT_SECRET` | Long random string for signing JWTs |
| `JWT_EXPIRES_IN` | Token lifespan (default: `30d`) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `RAZORPAY_KEY_ID` | Razorpay API Key ID (Dashboard → Settings → API Keys) |
| `RAZORPAY_KEY_SECRET` | Razorpay API Key Secret |
| `RAZORPAY_WEBHOOK_SECRET` | Set when creating webhook in Razorpay Dashboard |

## Running
```bash
npm install
cp .env.example .env   # fill in values
npm run dev
```
Health check: `GET /health` → `{ "status": "ok" }`

## Adding New Phases
Follow the same pattern: model → validator → service → controller → route → update this file.
