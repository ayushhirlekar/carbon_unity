# 🌱 CarbonUnity

A Web3-based carbon credit marketplace connecting farmers and buyers through blockchain-enabled transparency and decentralized trading.

---

## 📁 Project Structure

```
carbon_unity/
├── landing-page/        # Static landing page
├── frontend/            # React (Vite) application
├── backend/             # Node.js + Express API
├── database/            # Supabase schema
├── smart-contracts/     # Solidity contracts
├── docs/                # Documentation
└── README.md
```

---

## 🚀 Tech Stack

* **Frontend:** React (Vite) + MetaMask
* **Backend:** Node.js + Express
* **Database:** Supabase (PostgreSQL)
* **Blockchain:** Ethereum (Sepolia Testnet)
* **Smart Contracts:** Solidity
* **Authentication:** Wallet-based (MetaMask signatures)
* **RPC Provider:** Alchemy / Infura

---

# ⚙️ Setup Guide

Follow the steps below in order to run the project locally.

---

## 🗄️ 1. Supabase Setup

You do **not** need to create a new Supabase project.

I will send you an invite to the existing project.

### Steps:

1. Accept the invitation from Supabase (check your email)
2. Go to: https://supabase.com/dashboard
3. Open the shared **CarbonUnity** project

---

### Verify Database

* Navigate to **Table Editor**
* Ensure the following tables exist:

  * `users`
  * `projects`
  * `credits`
  * `transactions`

---

### Get API Credentials

Go to **Settings → API** and copy:

* `Project URL`
* `sb_publishable_...` → Frontend key
* `sb_secret_...` → Backend key (keep this private)

---

### ⚠️ Important Rules

* Do not modify database schema without discussion
* Do not delete or alter existing tables
* Do not rotate API keys

---

## ⛓️ 2. Smart Contract Setup

The platform uses a deployed smart contract on the **Sepolia test network**.

### Contract File:

```
smart-contracts/CarbonCreditMarketplace.sol
```

### Notes:

* A contract will already be deployed and shared
* You only need the **contract address**

---

## 🔑 3. Backend Setup

### Install dependencies

```bash
cd backend
npm install
```

---

### Configure environment variables

Create a file: `backend/.env`

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
CONTRACT_ADDRESS=your_contract_address
RPC_URL=your_alchemy_or_infura_url
PORT=5000
```

---

### Run backend

```bash
npm run dev
```

Backend runs on:

```
http://localhost:5000
```

---

## 🎨 4. Frontend Setup

### Install dependencies

```bash
cd frontend
npm install
```

---

### Configure environment variables

Create a file: `frontend/.env`

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_CONTRACT_ADDRESS=your_contract_address
VITE_RPC_URL=your_rpc_url
```

---

### Run frontend

```bash
npm run dev
```

Frontend runs on:

```
http://localhost:5173
```

---

## 🧪 5. Required Tools

### MetaMask

* Install MetaMask browser extension
* Connect your wallet

---

### Sepolia Test ETH

You will need test ETH for transactions:

https://sepoliafaucet.com/

---

### Network Configuration

Ensure MetaMask is set to:

```
Sepolia Test Network
```

---

## 🧠 System Architecture

```
Frontend (React)
        ↓
Backend (Node.js API)
        ↓
Supabase (Database)
        ↓
Ethereum Smart Contract
```

---

## ⚠️ Common Issues

### CORS Error

Ensure backend allows frontend origin:

```js
app.use(cors({
  origin: ["http://localhost:5173"],
  credentials: true
}));
```

---

### Supabase: Invalid API Key

* Use `sb_publishable_...` in frontend
* Use `sb_secret_...` in backend

---

### MetaMask Errors

**User rejected request**
→ Transaction was cancelled manually

**Invalid listing ID**
→ Listing does not exist on contract or wrong network

---

## 🔒 Security Guidelines

* Never expose `SUPABASE_SERVICE_ROLE_KEY`
* Do not commit `.env` files
* Keep private keys secure

---

## 🤝 Team Notes

* All developers use the same Supabase project
* All developers use the same deployed contract
* Backend must be running before frontend
* Any major changes (DB or contract) should be communicated beforehand

---

