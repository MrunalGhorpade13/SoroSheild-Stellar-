# SoroShield Smart Contract - Testnet Deployment Script (Windows PowerShell)
# This script automates building, optimizing, and deploying the Soroban smart contract to Stellar Testnet.

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   SoroShield Stellar Testnet Deployer       " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Configuration
$DEPLOYER_SOURCE = "my-wallet"          # Identity corresponding to GBEFDGOOIM45SY5NIA32OVG26GQ47ERDKUWE3HPJPVE3IAZUXHKLSNNZ
$NATIVE_TOKEN_ID = "CDLZFC3SYJYDZT7K67VZ75HPJSIZ2OHF2DTAZ62BVKM7Z27CC6A3J4QN"  # Native XLM Contract on Testnet
$SCAN_FEE = "5000000"                  # 0.5 XLM scan fee (in stroops)
$ADMIN_ADDR = "GBEFDGOOIM45SY5NIA32OVG26GQ47ERDKUWE3HPJPVE3IAZUXHKLSNNZ"
$TREASURY_ADDR = "GBEFDGOOIM45SY5NIA32OVG26GQ47ERDKUWE3HPJPVE3IAZUXHKLSNNZ"

Write-Host ""
Write-Host "[1/4] Building WASM binary..." -ForegroundColor Cyan
cargo build --target wasm32-unknown-unknown --release

Write-Host ""
Write-Host "[2/4] Optimizing WASM binary..." -ForegroundColor Cyan
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/soroshield_contract.wasm

Write-Host ""
Write-Host "[3/4] Deploying contract to Stellar Testnet..." -ForegroundColor Cyan
$CONTRACT_ID = stellar contract deploy `
  --wasm target/wasm32-unknown-unknown/release/soroshield_contract.optimized.wasm `
  --source $DEPLOYER_SOURCE `
  --network testnet

Write-Host "🎉 Contract successfully deployed to Testnet!" -ForegroundColor Green
Write-Host "Testnet Contract ID: $CONTRACT_ID" -ForegroundColor Green

Write-Host ""
Write-Host "[4/4] Initializing contract state..." -ForegroundColor Cyan
stellar contract invoke `
  --id $CONTRACT_ID `
  --source $DEPLOYER_SOURCE `
  --network testnet `
  -- initialize `
  --admin $ADMIN_ADDR `
  --treasury $TREASURY_ADDR `
  --native_token $NATIVE_TOKEN_ID `
  --fee $SCAN_FEE

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "   SoroShield Testnet Deployment Completed! " -ForegroundColor Green
Write-Host "   Contract ID: $CONTRACT_ID" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
