#!/bin/bash

# Seed Database Script for DocChain
# Populates test doctors and patients

echo "🌱 Seeding DocChain database..."
echo ""

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Construct Supabase connection string
DB_URL="postgresql://postgres.vetiasftzjihrnqqmcfc:Wisdom2345!@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Run seed file
psql "$DB_URL" -f seed-data.sql

echo ""
echo "✅ Database seeded successfully!"
echo ""
echo "📋 Test Accounts Summary:"
echo "   Doctors: 5 accounts (all verified)"
echo "   Patients: 5 accounts"
echo ""
echo "🔐 All accounts use password: test123"
echo ""
echo "🚀 View accounts at: http://localhost:3000/dev/accounts"
echo ""
