# Chargezio API Reference

Base URL: `http://localhost:5000/api`

All **protected** routes require:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

All responses follow:
```json
{ "success": true, "message": "...", "data": { } }
```

---

## Auth

### POST /auth/send-otp
Sends an OTP SMS to the given phone number via 2Factor.in.

**No Authorization header required.**

**Request**
```json
{ "phone": "+919876543210" }
```
Accepts `+91XXXXXXXXXX`, `91XXXXXXXXXX`, or `XXXXXXXXXX` (10-digit).

**Response 200**
```json
{
  "success": true,
  "message": "OTP sent",
  "data": { "sessionId": "2factorsessionid123" }
}
```
Store `sessionId` on the client — you need it for `verify-otp`.

---

### POST /auth/verify-otp
Verifies the OTP. Creates a new user if first login. Returns a JWT.

**No Authorization header required.**

**Request**
```json
{
  "sessionId": "2factorsessionid123",
  "otp": "123456",
  "phone": "+919876543210"
}
```

**Response 200 — Returning user**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userId": "6673abc12345def678901234",
    "phone": "+919876543210",
    "isNewUser": false,
    "isProfileComplete": true
  }
}
```

**Response 201 — New user**
```json
{
  "success": true,
  "message": "User registered",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userId": "6673abc12345def678901234",
    "phone": "+919876543210",
    "isNewUser": true,
    "isProfileComplete": false
  }
}
```

**Client logic:**
- Store `token` securely (AsyncStorage / Keychain)
- `isNewUser || !isProfileComplete` → Create Profile screen
- otherwise → Home

**Error 401** — OTP incorrect or expired

---

### POST /auth/logout
**Protected.** Signals logout. The client must discard the JWT.

**Response 200**
```json
{ "success": true, "message": "Logged out successfully", "data": null }
```

---

## Profile

### GET /profile
Returns full profile + active vehicles array.

**Response 200**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "_id": "6673abc12345def678901234",
    "phone": "+919876543210",
    "name": "Arjun Mehta",
    "email": "arjun.mehta@email.com",
    "dob": "1992-05-15T00:00:00.000Z",
    "gender": "male",
    "city": "Bengaluru",
    "preferredConnector": "CCS2",
    "preferredSpeed": "DC Fast",
    "walletBalance": 1250.75,
    "level": "Level 2 Explorer",
    "isProfileComplete": true,
    "vehicles": [
      {
        "_id": "6673abc12345def678901235",
        "brand": "Tata",
        "model": "Nexon EV",
        "type": "BEV",
        "batteryKWh": 40.5,
        "rangeKm": 465,
        "connector": "CCS2",
        "plateNumber": "KA01AB1234",
        "isPrimary": true
      }
    ]
  }
}
```

---

### POST /profile
Creates the user's profile (one-time, called from Create Profile screen).
Accepts optional `vehicle` — if provided, created as primary.

**Required:** `name` | **Optional:** `email`, `dob`, `gender`, `city`, `preferredConnector`, `preferredSpeed`, `vehicle`
**Vehicle required fields (if sent):** `brand`, `model`, `type`

**Response 201** | **Error 409** — profile already exists (use PUT)

---

### PUT /profile
Partial update. At least one field required.

**Valid fields:** `name`, `email`, `dob`, `gender`, `city`, `preferredConnector`, `preferredSpeed`

**Response 200**

---

### DELETE /profile
Soft-deletes account and all vehicles (`isActive: false`).

**Response 200**

---

### GET /profile/stats
Charging activity totals. Returns zeros until Phase 3 (ChargingSession) is built.

**Response 200**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "totalSessions": 0,
    "totalSpentINR": 0,
    "totalEnergyKWh": 0,
    "totalDistanceKm": 0,
    "avgSessionDurationMin": 0,
    "vehicleCount": 1,
    "level": "Level 1 Starter"
  }
}
```

---

## Vehicles

### GET /profile/vehicles
Lists active vehicles. Primary first.

### POST /profile/vehicles
Adds a vehicle. First vehicle or `isPrimary: true` → becomes primary.

**Required:** `brand`, `model`, `type`
**Valid types:** `BEV`, `PHEV`, `HYBRID`
**Valid connectors:** `CCS2`, `CHAdeMO`, `Type2`, `GBT`, `CCS1`

**Response 201**

### PUT /profile/vehicles/:id
Partial update. `isPrimary: true` promotes this vehicle.

**Response 200**

### DELETE /profile/vehicles/:id
Soft-deletes. If primary, next most-recent is auto-promoted.

**Response 200**

### PATCH /profile/vehicles/:id/primary
Sets as primary. All others demoted. No request body.

**Response 200**

---

## Error Responses

| Status | When |
|--------|------|
| 400 | Validation error, missing required field |
| 401 | Missing/expired/invalid JWT, or incorrect OTP |
| 404 | Resource not found |
| 409 | Conflict (e.g. profile already exists) |
| 429 | Rate limit exceeded (100 req / 15 min per IP) |
| 502 | 2Factor.in API call failed |
| 500 | Unexpected server error |

**Error shape**
```json
{ "success": false, "message": "Human-readable error description" }
```
