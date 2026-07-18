# Chargezio Backend — Setup Guide

## Prerequisites
- Node.js 18+
- MongoDB Atlas cluster (free tier works)
- 2Factor.in account (for SMS OTP delivery)

## 1. Install dependencies
```bash
cd backend
npm install
```

## 2. Environment variables
Copy `.env.example` to `.env` and fill in the values:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/chargezio?retryWrites=true&w=majority
TWO_FACTOR_API_KEY=your-2factor-api-key
JWT_SECRET=a-long-random-string-minimum-64-chars
JWT_EXPIRES_IN=30d
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
```

### Getting the values
| Variable | Where to get it |
|----------|----------------|
| `MONGODB_URI` | MongoDB Atlas → Connect → Drivers |
| `TWO_FACTOR_API_KEY` | 2factor.in → Dashboard → API Key |
| `JWT_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |

## 3. MongoDB Atlas — required index
The `$near` geospatial query on `/api/stations/nearby` needs a `2dsphere` index.
It is created automatically when the `ChargingStation` model is registered (Mongoose syncs indexes on startup).
If you need to create it manually:
```js
db.chargingstations.createIndex({ location: "2dsphere" })
```

## 4. Start the server
```bash
npm run dev    # nodemon (development)
npm start      # plain node (production)
```

Health check: `GET http://localhost:5000/health`

## 5. Test the APIs
Open `requests.http` in VS Code with the **REST Client** extension and follow the numbered flow at the top of the file.

## Auth flow (how it works)
1. `POST /api/auth/send-otp { phone }` → backend generates a 6-digit OTP via `crypto.randomInt`, stores it in MongoDB (`OtpSession`, 10 min TTL), calls 2Factor.in to deliver the SMS
2. `POST /api/auth/verify-otp { phone, otp }` → backend checks any active `OtpSession` for this phone; on match, issues a JWT
3. All protected routes require `Authorization: Bearer <token>`
4. Up to 3 OTPs can be live simultaneously (handles resend + late SMS delivery)
5. 5 failed verify attempts → phone blocked 15 min
