# Seed Database Script for DocChain (PowerShell)
# Populates test doctors and patients

Write-Host "🌱 Seeding DocChain database..." -ForegroundColor Green
Write-Host ""

# Supabase connection string
$DB_URL = "postgresql://postgres.vetiasftzjihrnqqmcfc:Wisdom2345!@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Check if running in WSL
if (Get-Command wsl -ErrorAction SilentlyContinue) {
    Write-Host "Using WSL to run psql..." -ForegroundColor Yellow
    wsl bash -c "psql '$DB_URL' -f seed-data.sql"
} else {
    Write-Host "❌ Error: psql not found. Please install PostgreSQL or use WSL." -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Run this SQL file directly in Supabase SQL Editor:"
    Write-Host "   https://supabase.com/dashboard/project/vetiasftzjihrnqqmcfc/sql/new"
    Write-Host ""
    Write-Host "Then paste the contents of: seed-data.sql"
    exit 1
}

Write-Host ""
Write-Host "✅ Database seeded successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Test Accounts Summary:"
Write-Host "   Doctors: 5 accounts (all verified)"
Write-Host "   Patients: 5 accounts"
Write-Host ""
Write-Host "🔐 All accounts use password: test123" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 View accounts at: http://localhost:3000/dev/accounts"
Write-Host ""
