#!/bin/bash
# SoroShield Smart Contract - Mainnet Deployment Script (Bash)
# This script automates building, optimizing, and deploying the Soroban smart contract to Stellar Mainnet.

set -e

echo "============================================="
echo "   SoroShield Stellar Mainnet Deployer"
echo "============================================="

# Configuration
DEPLOYER_SOURCE="deployer"          # Stellar CLI Identity Name
NATIVE_TOKEN_ID="CAS3J7GYGCZ47LNNDOH44G3P5SFFW4V5452XOG2YN2KIKNKOXJAGR32T"  # Native XLM Contract on Mainnet
SCAN_FEE="5000000"                  # 0.5 XLM scan fee (in stroops)

echo ""
echo "⚠️  WARNING: You are about to deploy to Stellar MAINNET. This will cost real XLM. ⚠️"
read -p "Are you sure you want to proceed? (Type 'YES' to confirm): " confirm

if [ "$confirm" != "YES" ]; then
    echo "Deployment aborted by user."
    exit 0
fi

read -p "Enter the Admin public address (starts with G...): " ADMIN_ADDR
read -p "Enter the Treasury public address (starts with G...): " TREASURY_ADDR

if [ -z "$ADMIN_ADDR" ] || [ -z "$TREASURY_ADDR" ]; then
    echo "Error: Admin and Treasury addresses are required."
    exit 1
fi

echo ""
echo "[1/4] Building WASM binary..."
cargo build --target wasm32-unknown-unknown --release

echo ""
echo "[2/4] Optimizing WASM binary..."
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/soroshield_contract.wasm

echo ""
echo "[3/4] Deploying contract to Stellar Mainnet..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/soroshield_contract.optimized.wasm \
  --source "$DEPLOYER_SOURCE" \
  --network public)

echo "🎉 Contract successfully deployed!"
echo "Mainnet Contract ID: $CONTRACT_ID"

echo ""
echo "[4/4] Initializing contract state..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$DEPLOYER_SOURCE" \
  --network public \
  -- initialize \
  --admin "$ADMIN_ADDR" \
  --treasury "$TREASURY_ADDR" \
  --native_token "$NATIVE_TOKEN_ID" \
  --fee "$SCAN_FEE"

echo ""
echo "============================================="
echo "   SoroShield Deployment Completed Successfully!"
echo "   Contract ID: $CONTRACT_ID"
echo "============================================="
echo "Make sure to update your API and Frontend .env files with VITE_CONTRACT_ID=$CONTRACT_ID"
