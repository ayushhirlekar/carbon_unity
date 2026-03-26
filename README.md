# 🌱 CarbonUnity

### Decentralized Green Carbon Credit Marketplace (Web3)

---

## 🚀 Project Overview

**CarbonUnity** is a Web3-based carbon credit marketplace that enables small-scale farmers to generate carbon credits from soil data and sell them directly to buyers — eliminating intermediaries.

This platform combines:

* 🌍 Sustainability
* ⛓ Blockchain (Web3)
* 🤖 Data-driven carbon estimation

---

## 🧠 Core Idea

Farmers input soil data → Carbon credits are calculated → Listed on marketplace → Buyers purchase using crypto (ETH)

---

## 🏗️ Tech Stack

| Layer      | Technology                         |
| ---------- | ---------------------------------- |
| Frontend   | React + MetaMask                   |
| Backend    | Node.js + Express                  |
| Database   | Supabase (PostgreSQL)              |
| Blockchain | Ethereum (Sepolia Testnet)         |
| Auth       | Wallet-based (MetaMask Signatures) |

---

## 📁 Project Structure

```
carbon_unity/
├── landing-page/        # Static HTML (Already built)
├── frontend/            # React App (Upcoming)
├── backend/             # Node.js API (Current Phase)
├── database/            # Supabase schema
├── smart-contracts/     # Solidity (Upcoming)
└── docs/
```

---

## 👥 User Roles

### 👨‍🌾 Farmer

* Add farms
* Submit soil data
* Generate carbon credits
* List credits on marketplace

### 🏢 Buyer

* Browse marketplace
* Purchase credits using ETH
* View transaction history

---

## 🔐 Authentication

* No email/password ❌
* Wallet-based login ✅
* Uses MetaMask signature verification

---

## 🗄️ Database (Supabase)

### Tables:

* `users`
* `farms`
* `carbon_data`
* `marketplace_listings`
* `transactions`

---

## ⚙️ Backend Features (Phase 3)

* ✅ MetaMask Wallet Authentication
* ✅ JWT-based session management
* ✅ Role-based access (Farmer/Buyer)
* ✅ Carbon calculation engine
* ✅ Farm & soil data APIs
* ✅ Marketplace APIs (list, buy, cancel)
* ✅ Transaction tracking

---

## 📦 Backend Setup (For Teammates)

### 🔹 1. Clone Repository

```
git clone https://github.com/YOUR_USERNAME/carbonunity-backend.git
cd carbonunity-backend
```

---

### 🔹 2. Install Dependencies

```
npm install
```

---

### 🔹 3. Setup Environment Variables

Create a file:

```
backend/.env
```

Add:

```
PORT=5000

SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key

JWT_SECRET=your_secret_key
```

⚠️ **Do NOT commit `.env`**

---

### 🔹 4. Run Server

```
npm run dev
```

---

### 🔹 5. Test API

Open browser:

```
http://localhost:5000
```

Expected output:

```
CarbonUnity Backend Running 🚀
```

---

## 🧪 API Testing

Use:

* Postman
* Thunder Client (VS Code)

### Example Endpoints:

#### Register

```
POST /api/auth/register
```

#### Login

```
POST /api/auth/login
```

#### Add Farm

```
POST /api/farmer/add-farm
```

#### Create Listing

```
POST /api/marketplace/create
```

---

## 🧮 Carbon Calculation Formula

```
Carbon = SOC × Bulk Density × Depth × Area
CO2 = Carbon × 3.67
Credits = CO2 (tons)
```

---

## 📊 Current Status

### ✅ Completed

* Project setup
* Database (Supabase)
* Backend architecture
* API structure

### 🔄 In Progress

* Backend testing
* API validation

### 🔜 Upcoming

* Smart Contracts (Solidity)
* React Frontend
* MetaMask Integration

---

## ⚠️ Important Notes

* Prototype uses **self-reported soil data**
* No verification (yet)
* Blockchain integration in next phase
* Credits stored in DB (not tokenized yet)

---

## 👨‍💻 Contributors

* Ayush Hirlekar (Lead Developer)

---

## 🎯 Vision

To empower small-scale farmers in India to:

* Monetize sustainable practices 🌱
* Access global carbon markets 🌍
* Eliminate intermediaries 💰

---

## 📌 Future Scope

* AI-based carbon estimation
* Satellite + IoT integration
* DAO governance
* Real-world carbon verification

---

## 🚀 Getting Started (Summary)

```
git clone <repo>
cd backend
npm install
create .env
npm run dev
```

---

## 💡 Tip for Teammates

Always:

* Pull latest changes before working
* Never push `.env`
* Test APIs before building frontend

---

## 📬 Contact

For queries or contributions:

* Open an issue
* Contact project maintainer

---

**🌱 Building the future of sustainable finance with Web3.**
