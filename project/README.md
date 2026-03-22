# NepalDaan — Blockchain Charity Donation System
## Complete Bug-Free Run Guide

---

## 🐛 Bugs Fixed in This Version

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 1 | `insertId` always returned `0` | `db.export()` inside `saveDb()` resets sql.js `last_insert_rowid` to 0 | Read rowid **before** calling `saveDb()` |
| 2 | Transaction `COMMIT` fails | `db.export()` inside `saveDb()` implicitly commits any open transaction | Skip `saveDb()` while `inTransaction = true`; save only on explicit commit |
| 3 | `IN (?)` array params broken | sql.js doesn't expand JS arrays into multiple `?` | Added `queryIn()` helper that builds `IN (?,?,?)` dynamically |
| 4 | `released_at = NOW()` fails | `NOW()` is MySQL syntax, not SQLite | Changed to `datetime('now')` |
| 5 | Schema mismatch | Old `migrate.js` used different column names than routes | Unified schema in `db.js` auto-migration |
| 6 | Unused import crash risk | `sendAndConfirmTransaction` imported but unused in `Donate.jsx` | Removed unused import |
| 7 | Invalid treasury wallet | `CHARITY_PROGRAM_ID` placeholder used as SOL recipient (invalid pubkey) | Use a real devnet address as fallback |
| 8 | `stream-browserify` alias | Vite alias for `stream` required uninstalled package | Removed alias; `@solana/web3.js` v1.91 handles it internally |

---

## 📁 Project Structure

```
nepaldaan/
├── backend/
│   ├── src/
│   │   ├── index.js              ← Express server entry point
│   │   ├── middleware/
│   │   │   └── auth.js           ← JWT bearer token middleware
│   │   ├── models/
│   │   │   ├── db.js             ← sql.js wrapper (all bugs fixed)
│   │   │   ├── seed.js           ← Demo data seeder
│   │   │   └── migrate.js        ← Schema migration runner
│   │   └── routes/
│   │       ├── auth.js           ← Register / Login / /me / link wallet
│   │       ├── campaigns.js      ← Campaign CRUD + donate + milestones
│   │       ├── organizations.js  ← Org registration + verification
│   │       ├── ipfs.js           ← Pinata IPFS file/JSON upload
│   │       └── admin.js          ← Admin panel APIs
│   ├── .env                      ← Environment variables
│   ├── package.json
│   └── charity.db                ← SQLite database (auto-created)
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx              ← React root with all providers
│   │   ├── App.jsx               ← Router + protected routes
│   │   ├── components/
│   │   │   └── Navbar.jsx        ← Navigation with wallet button
│   │   ├── pages/
│   │   │   ├── Home.jsx          ← Landing page with live stats
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Campaigns.jsx     ← Filterable campaign grid
│   │   │   ├── CampaignDetail.jsx← Detail + milestones + donations
│   │   │   ├── Donate.jsx        ← Full Solana transaction flow
│   │   │   ├── Dashboard.jsx     ← Role-based donor/org/admin view
│   │   │   ├── OrgRegister.jsx   ← Organization registration form
│   │   │   └── AdminPanel.jsx    ← Verify orgs, manage users/campaigns
│   │   ├── services/
│   │   │   ├── api.js            ← Axios client for all API calls
│   │   │   └── AuthContext.jsx   ← Auth state (user, login, logout)
│   │   ├── wallet/
│   │   │   └── WalletContext.jsx ← Phantom wallet provider
│   │   └── styles/
│   │       └── global.css        ← Full design system (Syne + DM Sans)
│   ├── .env
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── anchor/
    ├── programs/charity/src/
    │   └── lib.rs                ← Solana smart contract (Rust)
    ├── Anchor.toml
    └── Cargo.toml
```

---

## ✅ Prerequisites — Install These First

### 1. Node.js (v18 or higher)
Download from: https://nodejs.org/en/download
```
Verify: node --version   (must show v18.x or higher)
        npm --version
```

### 2. Git (optional but recommended)
Download from: https://git-scm.com

### 3. Phantom Wallet (browser extension)
Install from: https://phantom.app
- Available for Chrome, Firefox, Brave, Edge

---

## 🚀 STEP-BY-STEP RUN GUIDE

### STEP 1 — Extract the Project

```powershell
# Extract the zip to a folder, then open it
cd path\to\nepaldaan
```

Your folder should look like:
```
nepaldaan/
  backend/
  frontend/
  anchor/
  README.md
```

---

### STEP 2 — Setup & Start the Backend

Open **PowerShell Terminal 1** and run these commands one by one:

```powershell
# Go into backend folder
cd backend

# Install all Node.js dependencies
npm install
```

You should see packages installing. This takes 1-2 minutes.

```powershell
# Seed the database with demo data (runs automatically, creates charity.db)
node src/models/seed.js
```

Expected output:
```
💾 SQLite database: ...\charity.db
🌱 Seeding NepalDaan database…
✅ Admin user id: 1
✅ OrgAdmin user id: 2
✅ Donor user id: 3
✅ Organization id: 1
✅ Campaign 1 id: 1
✅ Campaign 2 id: 2
✅ Campaign 3 id: 3
✅ Seed complete!
```

```powershell
# Start the backend server
npm run dev
```

Expected output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   NepalDaan — Charity Donation API v1.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ JWT_SECRET: ***
✅ SOLANA_NETWORK: devnet
ℹ️  PINATA: not configured (dummy CIDs)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 SQLite database: ...\charity.db
🚀 NepalDaan API running on http://localhost:5000
```

**Keep this terminal open.**

✅ Verify backend works: Open browser → http://localhost:5000/api/health
You should see: `{"status":"ok","version":"1.0.0","network":"devnet"}`

---

### STEP 3 — Setup & Start the Frontend

Open **PowerShell Terminal 2** (new window) and run:

```powershell
# Go into frontend folder
cd frontend

# Install all Node.js dependencies (includes Solana wallet adapter)
npm install
```

This installs React, Vite, Solana wallet adapter, and all dependencies.

```powershell
# Start the frontend dev server
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in 2000ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

**Keep this terminal open too.**

✅ Open browser → http://localhost:5173
You should see the NepalDaan homepage with campaigns listed.

---

### STEP 4 — Setup Phantom Wallet for Devnet

1. Click the **Phantom** extension icon in your browser
2. If new: Create a wallet → save your seed phrase securely
3. Switch to **Devnet**:
   - Click the gear icon ⚙️ (Settings)
   - Click **"Developer Settings"** (or "Change Network")
   - Select **"Devnet"**
4. Get free test SOL:
   - Go to: https://faucet.solana.com
   - Paste your Phantom wallet address
   - Request 2 SOL (free on devnet)
   - Wait ~10 seconds for it to arrive

---

### STEP 5 — Test the Full Donation Flow

#### A. Login as Donor

1. Go to http://localhost:5173/login
2. Login with:
   - Email: `ramesh@gmail.com`
   - Password: `donor123`

#### B. Connect Phantom Wallet

1. Click **"Select Wallet"** button in the navbar
2. Select **Phantom**
3. Approve the connection in Phantom popup
4. Your wallet address appears in the navbar

#### C. Browse Campaigns

1. Click **"Campaigns"** in the navbar (or go to /campaigns)
2. You will see 3 pre-seeded campaigns:
   - Build 3 Schools in Karnali Province
   - Mobile Health Clinics — Dolpa District
   - Earthquake Relief — Jajarkot Families

#### D. Donate

1. Click on any campaign
2. Click **"Donate with SOL ⚡"**
3. On the Donate page:
   - Your wallet balance is shown
   - Enter an amount (e.g., `0.1`)
   - Optionally add a message
   - Click **"Donate 0.1000 SOL ⚡"**
4. **Phantom popup appears** → Click "Approve"
5. Wait ~5 seconds for confirmation
6. You see the success screen with:
   - ✅ Transaction signature
   - Link to Solana Explorer

---

### STEP 6 — Test Organization Admin Flow

#### A. Login as Org Admin

1. Logout → Login with:
   - Email: `org@helpnepal.com`
   - Password: `org123`

#### B. Dashboard

1. Go to `/dashboard`
2. You see the org admin dashboard
3. "Help Nepal Foundation" shows as **Verified** ✅
4. You can see all 3 campaigns under your org
5. Click **"+ New Campaign"** to create a new campaign

---

### STEP 7 — Test Admin Panel

#### A. Login as Admin

1. Logout → Login with:
   - Email: `admin@nepaldaan.com`
   - Password: `admin123`

#### B. Admin Panel

1. Go to http://localhost:5173/admin
2. You see platform stats (users, orgs, campaigns, donations)
3. **Organizations tab**: Verify/reject pending organizations
4. **Campaigns tab**: Pause/activate any campaign
5. **Users tab**: Change user roles

---

### STEP 8 — Register a New Organization (Full Flow)

1. Register a new account at `/register` with role **"Organization"**
2. After registration, you're redirected to `/org/register`
3. Fill in your organization details → Submit
4. Login as admin → Go to Admin → Organizations tab
5. Click **"Verify"** on the pending organization
6. Now login back as the org admin → Create campaigns from Dashboard

---

## 🔑 Demo Accounts

| Role | Email | Password | What you can do |
|------|-------|----------|-----------------|
| **Admin** | admin@nepaldaan.com | admin123 | Full platform control |
| **Org Admin** | org@helpnepal.com | org123 | Create campaigns (org already verified) |
| **Donor** | ramesh@gmail.com | donor123 | Browse and donate |

---

## 🌐 API Endpoints Reference

Base URL: `http://localhost:5000/api`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /health | ❌ | Server health check |
| POST | /auth/register | ❌ | Register new user |
| POST | /auth/login | ❌ | Login |
| GET | /auth/me | ✅ | Current user info |
| PATCH | /auth/wallet | ✅ | Link Phantom wallet |
| GET | /campaigns | ❌ | List active campaigns |
| GET | /campaigns/stats/platform | ❌ | Platform statistics |
| GET | /campaigns/:id | ❌ | Campaign detail + milestones + donations |
| POST | /campaigns | ✅ org_admin | Create campaign |
| POST | /campaigns/:id/donate | ✅ | Record donation (after on-chain tx) |
| GET | /campaigns/:id/donations | ❌ | Donation history |
| GET | /organizations | ❌ | List verified organizations |
| GET | /organizations/mine | ✅ | Your organization |
| POST | /organizations | ✅ | Register organization |
| GET | /admin/stats | ✅ admin | Platform stats |
| GET | /admin/users | ✅ admin | All users |
| PATCH | /admin/users/:id/role | ✅ admin | Change user role |
| GET | /admin/organizations | ✅ admin | All organizations |
| PATCH | /admin/organizations/:id/verify | ✅ admin | Verify/reject org |
| GET | /admin/campaigns | ✅ admin | All campaigns |
| PATCH | /admin/campaigns/:id/toggle | ✅ admin | Pause/activate campaign |

---

## ⚓ Anchor Program (Solana Smart Contract)

The Anchor program is in `anchor/programs/charity/src/lib.rs`.

### To Build and Deploy:

```powershell
# Install Rust (if not installed)
# Windows: https://rustup.rs  → download and run rustup-init.exe

# Install Solana CLI
# https://docs.solana.com/cli/install-solana-cli-tools

# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install 0.29.0
avm use 0.29.0

# Create a Solana keypair
solana-keygen new

# Set to devnet
solana config set --url devnet

# Get free SOL for deployment
solana airdrop 2

# Build the program
cd anchor
anchor build

# Get your program ID
solana address -k target/deploy/charity-keypair.json

# IMPORTANT: Copy the program ID above, then edit:
# 1. anchor/programs/charity/src/lib.rs → replace declare_id!("CHARiTY111...") 
# 2. backend/.env → CHARITY_PROGRAM_ID=<your_program_id>
# 3. frontend/.env → VITE_CHARITY_PROGRAM_ID=<your_program_id>
# Then rebuild: anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

---

## 🔧 Environment Variables

### backend/.env (already configured)
```
PORT=5000
NODE_ENV=development
JWT_SECRET=nepaldaan_super_secret_jwt_key_2026_change_me
JWT_EXPIRES_IN=7d
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
CHARITY_PROGRAM_ID=CHARiTY1111111111111111111111111111111111111
FRONTEND_URL=http://localhost:5173
PINATA_API_KEY=your_pinata_api_key      ← optional, for real IPFS
PINATA_SECRET_KEY=your_pinata_secret_key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### frontend/.env (already configured)
```
VITE_API_URL=http://localhost:5000/api
VITE_SOLANA_NETWORK=devnet
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_CHARITY_PROGRAM_ID=CHARiTY1111111111111111111111111111111111111
```

---

## 🐛 Troubleshooting

### "Cannot connect to backend" / CORS error
→ Make sure backend is running on port 5000
→ Check `FRONTEND_URL=http://localhost:5173` in `backend/.env`

### "Module not found" on npm install
→ Delete `node_modules` folder and `package-lock.json`, then `npm install` again

### Phantom wallet not showing on devnet
→ Open Phantom → Settings → Developer Settings → Enable Devnet
→ Make sure you're on "Devnet" not "Mainnet"

### "Insufficient balance" on Donate page
→ Go to https://faucet.solana.com → paste your devnet wallet address → request SOL

### "Transaction rejected" in Phantom
→ This means you clicked "Reject" in Phantom, or Phantom timed out
→ Try again and click "Approve" quickly

### "Organization must be verified first"
→ Login as admin → Admin Panel → Organizations tab → click "Verify"

### Backend port 5000 already in use
→ Change `PORT=5001` in `backend/.env` and `proxy target` in `frontend/vite.config.js`

### Frontend Vite error about "global is not defined"
→ This is handled in `vite.config.js` with `define: { global: 'globalThis' }`
→ If it persists, clear Vite cache: `rm -rf node_modules/.vite` then `npm run dev`

### Database corrupted / want fresh start
```powershell
cd backend
del charity.db          # Windows PowerShell
node src/models/seed.js # re-creates and seeds
```

---

## 📋 Quick Start Summary (2 terminals)

```
Terminal 1 (Backend):         Terminal 2 (Frontend):
  cd backend                    cd frontend
  npm install                   npm install
  node src/models/seed.js       npm run dev
  npm run dev                   → http://localhost:5173

  → http://localhost:5000
```

Then:
1. Open http://localhost:5173
2. Install Phantom → switch to Devnet → get SOL from faucet
3. Login as donor (ramesh@gmail.com / donor123)
4. Connect Phantom wallet
5. Browse campaigns → Donate → Approve in Phantom → See transaction! 🎉
