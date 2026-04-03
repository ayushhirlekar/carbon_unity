# CarbonUnity Backend API

Backend server for CarbonUnity - A Web3 Carbon Credit Marketplace

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Supabase account with project created
- MetaMask for testing

### Installation

1. **Navigate to backend folder:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
   - Copy `.env` file and update with your Supabase credentials:
   ```
   SUPABASE_URL=your-project-url
   SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   SUPABASE_SERVICE_KEY=your-service-key (optional)
   ```

4. **Start the server:**
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will run on `http://localhost:5000`

---

## 📡 API Endpoints

### Base URL
```
http://localhost:5000/api
```

---

## 🔐 Authentication Endpoints

### 1. Request Nonce
**POST** `/auth/request-nonce`

Request a nonce for wallet signature authentication.

**Request Body:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nonce": "abc123...",
    "message": "Welcome to CarbonUnity!...",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }
}
```

---

### 2. Register
**POST** `/auth/register`

Register a new user with wallet signature.

**Request Body:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "signature": "0x...",
  "message": "Welcome to CarbonUnity!...",
  "role": "farmer",
  "displayName": "John's Farm"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {...},
    "token": "jwt-token-here"
  }
}
```

---

### 3. Login
**POST** `/auth/login`

Login with existing wallet.

**Request Body:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "signature": "0x...",
  "message": "Welcome to CarbonUnity!..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {...},
    "token": "jwt-token-here"
  }
}
```

---

### 4. Get Profile
**GET** `/auth/profile`

Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "wallet_address": "0x...",
    "role": "farmer",
    "display_name": "John's Farm",
    "credits_balance": 150.5,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

## 🌾 Farmer Endpoints

All farmer endpoints require authentication and farmer role.

**Headers for all requests:**
```
Authorization: Bearer <jwt-token>
```

---

### 1. Add Farm
**POST** `/farmer/farms`

**Request Body:**
```json
{
  "farmName": "Green Valley Farm",
  "location": "Maharashtra, India",
  "area": 10.5,
  "cropType": "Wheat"
}
```

---

### 2. Get Farms
**GET** `/farmer/farms`

Get all farms for logged-in farmer.

---

### 3. Submit Soil Data
**POST** `/farmer/soil-data`

Submit soil data and generate carbon credits.

**Request Body:**
```json
{
  "farmId": 1,
  "soc": 2.5,
  "bulkDensity": 1.3,
  "depth": 0.3
}
```

**Response:**
```json
{
  "success": true,
  "message": "Soil data submitted and credits generated",
  "data": {
    "carbonData": {...},
    "creditsGenerated": 45.67,
    "calculationDetails": {
      "calculatedCarbon": 12.44,
      "calculatedCo2": 45.67,
      "creditsGenerated": 45.67
    }
  }
}
```

---

### 4. Get Carbon Data
**GET** `/farmer/carbon-data/:farmId`

Get carbon data history for a specific farm.

---

### 5. Get Dashboard
**GET** `/farmer/dashboard`

Get farmer dashboard summary.

**Response:**
```json
{
  "success": true,
  "data": {
    "creditsBalance": 150.5,
    "totalFarms": 3,
    "totalSubmissions": 12,
    "activeListings": 2
  }
}
```

---

## 🛒 Marketplace Endpoints

### Public (Both Farmers & Buyers)

### 1. Get All Listings
**GET** `/marketplace/listings`

Get all active marketplace listings.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

---

## 🌾 Farmer Marketplace Endpoints

### 2. Create Listing
**POST** `/marketplace/listings`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "creditsAmount": 50,
  "pricePerCredit": 0.001
}
```

---

### 3. Get My Listings
**GET** `/marketplace/my-listings`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

---

### 4. Cancel Listing
**DELETE** `/marketplace/listings/:listingId`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

---

## 🏢 Buyer Marketplace Endpoints

### 5. Purchase Credits
**POST** `/marketplace/purchase`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "listingId": 1,
  "blockchainTxHash": "0x..."
}
```

---

### 6. Get Purchase History
**GET** `/marketplace/purchases`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

---

### 7. Get Buyer Dashboard
**GET** `/marketplace/buyer/dashboard`

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "creditsBalance": 75.5,
    "totalPurchases": 5,
    "totalEthSpent": "0.2500"
  }
}
```

---

## 🧪 Testing with Thunder Client / Postman

### Example Authentication Flow:

1. **Request Nonce:**
```
POST http://localhost:5000/api/auth/request-nonce
Body: { "walletAddress": "0x..." }
```

2. **Sign Message in MetaMask** (use the returned message)

3. **Register/Login:**
```
POST http://localhost:5000/api/auth/register
Body: {
  "walletAddress": "0x...",
  "signature": "0x...",
  "message": "...",
  "role": "farmer"
}
```

4. **Use JWT Token:**
Copy the token from response and add to headers:
```
Authorization: Bearer <your-jwt-token>
```

---

## 📊 Carbon Calculation Formula

```
Carbon (tons) = SOC × Bulk Density × Depth × Area
CO2 (tons) = Carbon × 3.67
Credits = CO2 (tons)
```

**Units:**
- SOC: % (Soil Organic Carbon)
- Bulk Density: g/cm³
- Depth: meters
- Area: hectares

---

## 🔧 Tech Stack

- **Framework:** Express.js
- **Database:** Supabase (PostgreSQL)
- **Authentication:** JWT + MetaMask Wallet Signatures
- **Blockchain:** Ethers.js (for signature verification)

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── supabase.js       # Supabase client
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── farmerController.js
│   │   └── marketplaceController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── farmerRoutes.js
│   │   └── marketplaceRoutes.js
│   ├── middleware/
│   │   └── auth.js            # Authentication middleware
│   ├── services/
│   │   └── carbonCalculation.js
│   ├── utils/
│   │   ├── auth.js            # Wallet auth utilities
│   │   └── jwt.js             # JWT utilities
│   └── server.js              # Main server file
├── .env
├── package.json
└── README.md
```

---

## 🐛 Common Issues

### 1. CORS Error
Make sure `FRONTEND_URL` in `.env` matches your React app URL.

### 2. Supabase Connection Error
Verify your `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are correct.

### 3. JWT Token Invalid
Token expires in 7 days. Request a new token by logging in again.

---

## 📝 Notes

- This is a **prototype version** with simplified payment flow
- Actual blockchain transactions happen on frontend via MetaMask
- Backend stores transaction hashes for reference
- RLS (Row Level Security) is enabled in Supabase

---

## 🚀 Next Steps

1. Test all endpoints with Thunder Client/Postman
2. Build React frontend
3. Integrate MetaMask wallet connection
4. Deploy smart contracts (Phase 4)
5. Connect frontend to backend API

---

**Made with ❤️ for CarbonUnity**