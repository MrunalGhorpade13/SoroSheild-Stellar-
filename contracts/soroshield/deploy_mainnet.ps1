# SoroShield Smart Contract - Mainnet Deployment Script (Windows PowerShell)
# This script automates building, optimizing, and deploying the Soroban smart contract to Stellar Mainnet.

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   SoroShield Stellar Mainnet Deployer       " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Configuration (Modify these for your final deployment)
$DEPLOYER_SOURCE = "deployer"          # Stellar CLI Identity Name (pre-configured with mainnet keys and XLM)
$NATIVE_TOKEN_ID = "CAS3J7GYGCZ47LNNDOH44G3P5SFFW4V5452XOG2YN2KIKNKOXJAGR32T"  # Native XLM Contract on Mainnet
$SCAN_FEE = "5000000"                  # 0.5 XLM scan fee (in stroops / 7 decimal places)

# Prompt for confirmations to prevent accidental real money spend
Write-Host ""
Write-Host "⚠️  WARNING: You are about to deploy to Stellar MAINNET. This will cost real XLM. ⚠️" -ForegroundColor Yellow
$confirm = Read-Host "Are you sure you want to proceed? (Type 'YES' to confirm)"
if ($confirm -ne "YES") {
    Write-Host "Deployment aborted by user." -ForegroundColor Red
    exit
}

$ADMIN_ADDR = Read-Host "Enter the Admin public address (starts with G...)"
$TREASURY_ADDR = Read-Host "Enter the Treasury public address (starts with G...)"

if ([string]::IsNullOrEmpty($ADMIN_ADDR) -or [string]::IsNullOrEmpty($TREASURY_ADDR)) {
    Write-Host "Error: Admin and Treasury addresses are required." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "[1/4] Building WASM binary..." -ForegroundColor Cyan
cargo build --target wasm32-unknown-unknown --release

Write-Host ""
Write-Host "[2/4] Optimizing WASM binary..." -ForegroundColor Cyan
# Optimize the WASM payload size to reduce on-chain fee costs
stellar contract optimize --wasm ../../target/wasm32-unknown-unknown/release/soroshield_contract.wasm

Write-Host ""
Write-Host "[3/4] Deploying contract to Stellar Mainnet..." -ForegroundColor Cyan
$CONTRACT_ID = stellar contract deploy `
  --wasm ../../target/wasm32-unknown-unknown/release/soroshield_contract.optimized.wasm `
  --source $DEPLOYER_SOURCE `
  --network public

Write-Host "🎉 Contract successfully deployed!" -ForegroundColor Green
Write-Host "Mainnet Contract ID: $CONTRACT_ID" -ForegroundColor Green

Write-Host ""
Write-Host "[4/4] Initializing contract state..." -ForegroundColor Cyan
# Invoke initialization
stellar contract invoke `
  --id $CONTRACT_ID `
  --source $DEPLOYER_SOURCE `
  --network public `
  -- initialize `
  --admin $ADMIN_ADDR `
  --treasury $TREASURY_ADDR `
  --native_token $NATIVE_TOKEN_ID `
  --fee $SCAN_FEE

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "   SoroShield Deployment Completed Successfully! " -ForegroundColor Green
Write-Host "   Contract ID: $CONTRACT_ID" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "Make sure to update your API and Frontend .env files with VITE_CONTRACT_ID=$CONTRACT_ID" -ForegroundColor Yellow
