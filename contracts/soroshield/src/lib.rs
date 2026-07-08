#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, BytesN, Env, Symbol, Vec,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Certificate {
    pub code_hash: BytesN<32>,
    pub submitter: Address,
    pub critical_count: u32,
    pub warning_count: u32,
    pub info_count: u32,
    pub scanner_version: Symbol,
    pub ledger: u32,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Treasury,
    ScanFee,
    NativeToken,
    TotalCertificates,
    TotalIssuesFound,
    RecentHashes,
    Certificate(BytesN<32>),
}

#[contract]
pub struct SoroShieldContract;

#[contractimpl]
impl SoroShieldContract {
    /// Initialize the scanner contract with admin, treasury, native token, and default scan fee
    pub fn initialize(
        env: Env,
        admin: Address,
        treasury: Address,
        native_token: Address,
        fee: i128,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Contract is already initialized.");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Treasury, &treasury);
        env.storage().instance().set(&DataKey::NativeToken, &native_token);
        env.storage().instance().set(&DataKey::ScanFee, &fee);
        env.storage().instance().set(&DataKey::TotalCertificates, &0u32);
        env.storage().instance().set(&DataKey::TotalIssuesFound, &0u32);
        env.storage().instance().set(&DataKey::RecentHashes, &Vec::<BytesN<32>>::new(&env));
    }

    /// Mint an audit certificate by transferring ScanFee from submitter to treasury
    pub fn mint_certificate(
        env: Env,
        submitter: Address,
        code_hash: BytesN<32>,
        critical_count: u32,
        warning_count: u32,
        info_count: u32,
        scanner_version: Symbol,
    ) -> Certificate {
        submitter.require_auth();

        // 1. Charge ScanFee from submitter
        let native_token: Address = env.storage().instance().get(&DataKey::NativeToken).unwrap();
        let treasury: Address = env.storage().instance().get(&DataKey::Treasury).unwrap();
        let fee: i128 = env.storage().instance().get(&DataKey::ScanFee).unwrap();

        if fee > 0 {
            let token_client = token::Client::new(&env, &native_token);
            token_client.transfer(&submitter, &treasury, &fee);
        }

        // 2. Build and store certificate
        let cert = Certificate {
            code_hash: code_hash.clone(),
            submitter: submitter.clone(),
            critical_count,
            warning_count,
            info_count,
            scanner_version,
            ledger: env.ledger().sequence(),
            timestamp: env.ledger().timestamp(),
        };

        let cert_key = DataKey::Certificate(code_hash.clone());
        env.storage().persistent().set(&cert_key, &cert);

        // 3. Update stats with checked arithmetic
        let mut total_certs: u32 = env.storage().instance().get(&DataKey::TotalCertificates).unwrap_or(0);
        let mut total_issues: u32 = env.storage().instance().get(&DataKey::TotalIssuesFound).unwrap_or(0);

        total_certs = total_certs.checked_add(1).expect("overflow total certificates");
        let added_issues = critical_count
            .checked_add(warning_count).expect("overflow warning count")
            .checked_add(info_count).expect("overflow info count");
        total_issues = total_issues.checked_add(added_issues).expect("overflow total issues");

        env.storage().instance().set(&DataKey::TotalCertificates, &total_certs);
        env.storage().instance().set(&DataKey::TotalIssuesFound, &total_issues);

        // 4. Update the rolling list of recent code hashes (capped at 20)
        let mut recent: Vec<BytesN<32>> = env
            .storage()
            .instance()
            .get(&DataKey::RecentHashes)
            .unwrap_or_else(|| Vec::new(&env));
        
        // Remove duplicate if already present in rolling list, then push to back
        let mut index_to_remove = None;
        for idx in 0..recent.len() {
            if recent.get(idx).unwrap() == code_hash {
                index_to_remove = Some(idx);
                break;
            }
        }
        if let Some(idx) = index_to_remove {
            recent.remove(idx);
        }
        
        recent.push_back(code_hash.clone());
        
        // Cap list size to 20 recent items
        if recent.len() > 20 {
            recent.remove(0);
        }
        env.storage().instance().set(&DataKey::RecentHashes, &recent);

        // 5. Emit CertificateMinted event
        env.events().publish(
            (Symbol::new(&env, "CertificateMinted"), submitter, code_hash),
            (critical_count, warning_count, info_count, env.ledger().sequence()),
        );

        cert
    }

    /// Retrieve an audit certificate by code hash
    pub fn get_certificate(env: Env, code_hash: BytesN<32>) -> Option<Certificate> {
        let cert_key = DataKey::Certificate(code_hash);
        env.storage().persistent().get(&cert_key)
    }

    /// Get total certificates issued and total issues found across the ecosystem
    pub fn get_stats(env: Env) -> (u32, u32) {
        let total_certs: u32 = env.storage().instance().get(&DataKey::TotalCertificates).unwrap_or(0);
        let total_issues: u32 = env.storage().instance().get(&DataKey::TotalIssuesFound).unwrap_or(0);
        (total_certs, total_issues)
    }

    /// Retrieve up to limit of recent certificates
    pub fn list_recent_certificates(env: Env, limit: u32) -> Vec<Certificate> {
        let recent: Vec<BytesN<32>> = env
            .storage()
            .instance()
            .get(&DataKey::RecentHashes)
            .unwrap_or_else(|| Vec::new(&env));
        
        let mut result = Vec::new(&env);
        let len = recent.len();
        if len == 0 {
            return result;
        }

        // Iterate in reverse (newest first) up to the limit
        let start = if len > limit { len - limit } else { 0 };
        for idx in (start..len).rev() {
            if let Some(hash) = recent.get(idx) {
                if let Some(cert) = Self::get_certificate(env.clone(), hash) {
                    result.push_back(cert);
                }
            }
        }
        result
    }

    /// Admin only: Set scan fee
    pub fn set_scan_fee(env: Env, new_fee: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::ScanFee, &new_fee);
    }

    /// Admin only: Update treasury
    pub fn set_treasury(env: Env, new_treasury: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::Treasury, &new_treasury);
    }

    /// Admin only: Change admin address
    pub fn set_admin(env: Env, new_admin: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        Address, BytesN, Env, Symbol,
    };

    #[test]
    fn test_flow() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let treasury = Address::generate(&env);
        let user = Address::generate(&env);

        // Deploy native token
        let token_admin = Address::generate(&env);
        let token_contract_id = env.register_stellar_asset_contract(token_admin.clone());
        let token_client = token::Client::new(&env, &token_contract_id);
        let stellar_asset_client = token::StellarAssetClient::new(&env, &token_contract_id);

        // Fund user account
        let initial_balance = 10_000_000_000i128; // 1000 XLM
        stellar_asset_client.mint(&user, &initial_balance);

        // Register SoroShield contract
        let contract_id = env.register_contract(None, SoroShieldContract);
        let client = SoroShieldContractClient::new(&env, &contract_id);

        // Initialize SoroShield
        let scan_fee = 5_000_000i128; // 0.5 XLM
        client.initialize(&admin, &treasury, &token_contract_id, &scan_fee);

        // Assert initial stats
        let stats = client.get_stats();
        assert_eq!(stats.0, 0);
        assert_eq!(stats.1, 0);

        // Create dummy code hash
        let mut hash_bytes = [0u8; 32];
        hash_bytes[0] = 42;
        let code_hash = BytesN::from_array(&env, &hash_bytes);

        // Mint certificate
        let cert = client.mint_certificate(
            &user,
            &code_hash,
            &1, // critical
            &2, // warning
            &3, // info
            &Symbol::new(&env, "v1_0"),
        );

        // Check certificate details
        assert_eq!(cert.code_hash, code_hash);
        assert_eq!(cert.submitter, user);
        assert_eq!(cert.critical_count, 1);
        assert_eq!(cert.warning_count, 2);
        assert_eq!(cert.info_count, 3);
        assert_eq!(cert.scanner_version, Symbol::new(&env, "v1_0"));

        // Check updated balance
        let user_balance = token_client.balance(&user);
        assert_eq!(user_balance, initial_balance - scan_fee);
        let treasury_balance = token_client.balance(&treasury);
        assert_eq!(treasury_balance, scan_fee);

        // Check stats
        let stats = client.get_stats();
        assert_eq!(stats.0, 1); // 1 certificate
        assert_eq!(stats.1, 6); // 1 + 2 + 3 = 6 issues

        // Verify retrieval
        let retrieved = client.get_certificate(&code_hash).unwrap();
        assert_eq!(retrieved.submitter, user);

        // Verify recent directory
        let recent_certs = client.list_recent_certificates(&10);
        assert_eq!(recent_certs.len(), 1);
        assert_eq!(recent_certs.get(0).unwrap().code_hash, code_hash);

        // Change scan fee as admin
        client.set_scan_fee(&10_000_000i128); // 1.0 XLM
        
        // Assert authorization works and fee changes
        // (mock_all_auths takes care of verification)
    }
}
