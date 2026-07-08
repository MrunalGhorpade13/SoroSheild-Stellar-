use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Vec, Map, Symbol, token};

#[contract]
pub struct VulnerableContract;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    LedgerList,
}

#[contractimpl]
impl VulnerableContract {
    // 1. Missing require_auth and 9. Missing event emission on state write
    pub fn initialize(env: Env, admin: Address) {
        env.storage().persistent().set(&DataKey::Admin, &admin);
    }

    // 1. Missing require_auth on state-changing operations
    // 2. Unchecked arithmetic (+= and +)
    // 3. Missing input validation (amount is not bounds checked)
    // 6. Missing balance check before transfer
    // 9. Missing event emission
    pub fn withdraw(env: Env, token_addr: Address, to: Address, amount: i128) {
        // Missing require_auth check on `to` or `admin`
        let token_client = token::Client::new(&env, &token_addr);
        
        // Unchecked math and no validation that amount > 0
        let double_amount = amount + amount; 

        // Missing balance check (Rule 6) before payout
        token_client.transfer(&env.current_contract_address(), &to, &double_amount);
        
        // Writing to storage without checking authorization and missing event emission
        let mut list: Vec<i128> = env.storage().persistent().get(&DataKey::LedgerList).unwrap_or_else(|| Vec::new(&env));
        list.push_back(double_amount);
        env.storage().persistent().set(&DataKey::LedgerList, &list); // Rule 4: Unbounded storage growth
    }

    // 5. Unprotected contract upgrade (update_current_contract_wasm without require_auth)
    pub fn upgrade_contract(env: Env, new_wasm_hash: soroban_sdk::BytesN<32>) {
        // Critical: update_current_contract_wasm is called but there is norequire_auth
        env.deployer().update_current_contract_wasm(&new_wasm_hash);
    }

    // 7. Panics instead of graceful errors (unwrap, expect, panic!)
    pub fn check_something(env: Env, value: u32) -> u32 {
        if value == 0 {
            panic!("Value cannot be zero!"); // Rule 7
        }
        let stored_val: Option<u32> = env.storage().instance().get(&Symbol::new(&env, "val"));
        stored_val.unwrap() // Rule 7
    }

    // 8. Hardcoded secrets and public addresses
    pub fn test_secrets(env: Env) -> Address {
        let _public_key = "GDV44BEXC727D2Q5B7N44D3M2N5X6A7B7C2Y7U3K4J5H6G7F6D5S4A32"; // Rule 8
        let _secret_key = "SA234567ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGH234567AB"; // Rule 8
        Address::from_string(&env, &soroban_sdk::String::from_str(&env, "GDV44BEXC727D2Q5B7N44D3M2N5X6A7B7C2Y7U3K4J5H6G7F6D5S4A32"))
    }

    // 10. Check-Effects-Interactions violation (External call before state write)
    pub fn external_call_order(env: Env, token_addr: Address, to: Address, amount: i128) {
        to.require_auth();
        let token_client = token::Client::new(&env, &token_addr);
        
        // External call
        token_client.transfer(&env.current_contract_address(), &to, &amount);
        
        // State write occurs AFTER external call (reentrancy-adjacent violation)
        env.storage().persistent().set(&Symbol::new(&env, "last_withdrawn"), &amount);
    }
}
