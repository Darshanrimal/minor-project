# NepalDaan — PowerShell Setup Script
# Run this from the project root: .\setup.ps1

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "   NepalDaan — Blockchain Charity Setup" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Backend setup
Write-Host ""
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Backend npm install failed" -ForegroundColor Red; exit 1 }

Write-Host "🌱 Seeding database..." -ForegroundColor Yellow
node src/models/seed.js
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Seed failed" -ForegroundColor Red; exit 1 }

Set-Location ..

# Frontend setup
Write-Host ""
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Frontend npm install failed" -ForegroundColor Red; exit 1 }
Set-Location ..

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "   ✅ Setup Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "Demo Accounts:" -ForegroundColor Cyan
Write-Host "  Admin:    admin@nepaldaan.com  / admin123"
Write-Host "  OrgAdmin: org@helpnepal.com    / org123"
Write-Host "  Donor:    ramesh@gmail.com     / donor123"
Write-Host ""
Write-Host "To start the app, open TWO PowerShell terminals:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Terminal 1 (Backend):"
Write-Host "    cd backend"
Write-Host "    npm run dev"
Write-Host ""
Write-Host "  Terminal 2 (Frontend):"
Write-Host "    cd frontend"
Write-Host "    npm run dev"
Write-Host ""
Write-Host "  Then open: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
