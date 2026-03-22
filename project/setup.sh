#!/bin/bash
# NepalDaan — Bash Setup Script
# Usage: chmod +x setup.sh && ./setup.sh

set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   NepalDaan — Blockchain Charity Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Backend
echo "📦 Installing backend dependencies..."
cd backend
npm install
echo "🌱 Seeding database..."
node src/models/seed.js
cd ..

# Frontend
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   ✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Demo Accounts:"
echo "  Admin:    admin@nepaldaan.com  / admin123"
echo "  OrgAdmin: org@helpnepal.com    / org123"
echo "  Donor:    ramesh@gmail.com     / donor123"
echo ""
echo "Start app (2 terminals):"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd frontend && npm run dev"
echo "  Open: http://localhost:5173"
echo ""
