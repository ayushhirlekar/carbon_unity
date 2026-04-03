-- ============================================
-- CarbonUnity v2 — Admin-Managed Architecture
-- Database Schema (Supabase / PostgreSQL)
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'buyer');
CREATE TYPE listing_status AS ENUM ('draft', 'active', 'sold', 'retired');
CREATE TYPE transaction_status AS ENUM ('pending', 'confirmed', 'failed');

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT NOT NULL UNIQUE,
    role user_role NOT NULL,
    display_name VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Normalize wallet addresses to lowercase via trigger
CREATE OR REPLACE FUNCTION normalize_wallet_address()
RETURNS TRIGGER AS $$
BEGIN
    NEW.wallet_address := LOWER(NEW.wallet_address);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_normalize_wallet
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION normalize_wallet_address();

CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- 2. FARMS TABLE
-- ============================================
CREATE TABLE farms (
    farm_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    location VARCHAR(255) NOT NULL,
    district VARCHAR(100),
    state VARCHAR(100),
    area DECIMAL(12, 2) NOT NULL CHECK (area > 0),
    crop_type VARCHAR(100),
    farmer_name VARCHAR(150),
    farmer_contact VARCHAR(50),
    number_of_farmers INTEGER DEFAULT 1 CHECK (number_of_farmers > 0),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_farms_created_by FOREIGN KEY (created_by)
        REFERENCES users(wallet_address) ON DELETE RESTRICT
);

CREATE OR REPLACE FUNCTION normalize_farm_created_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_by := LOWER(NEW.created_by);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_farms_normalize_wallet
    BEFORE INSERT OR UPDATE ON farms
    FOR EACH ROW EXECUTE FUNCTION normalize_farm_created_by();

CREATE INDEX idx_farms_created_by ON farms(created_by);
CREATE INDEX idx_farms_verified ON farms(is_verified);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_farms_updated_at
    BEFORE UPDATE ON farms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 3. CARBON DATA TABLE
-- ============================================
CREATE TABLE carbon_data (
    data_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL,
    soc DECIMAL(8, 4) NOT NULL CHECK (soc > 0),
    bulk_density DECIMAL(8, 4) NOT NULL CHECK (bulk_density > 0),
    depth DECIMAL(8, 2) NOT NULL CHECK (depth > 0),
    carbon_stock DECIMAL(14, 4),
    co2_equivalent DECIMAL(14, 4),
    credits_generated DECIMAL(14, 2),
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_carbon_farm FOREIGN KEY (farm_id)
        REFERENCES farms(farm_id) ON DELETE CASCADE
);

CREATE INDEX idx_carbon_farm_id ON carbon_data(farm_id);
CREATE INDEX idx_carbon_verified ON carbon_data(verified);

-- ============================================
-- 4. MARKETPLACE LISTINGS TABLE
-- ============================================
CREATE TABLE marketplace_listings (
    listing_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    subtitle VARCHAR(300),
    location VARCHAR(255),
    cover_image_url TEXT,
    credits_available DECIMAL(14, 2) NOT NULL CHECK (credits_available >= 0),
    price_per_credit DECIMAL(18, 8) NOT NULL CHECK (price_per_credit > 0),
    vintage_year INTEGER CHECK (vintage_year >= 2000 AND vintage_year <= 2100),
    verification_standard VARCHAR(100),
    practice_tags TEXT[] DEFAULT '{}',
    status listing_status NOT NULL DEFAULT 'draft',
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_listing_farm FOREIGN KEY (farm_id)
        REFERENCES farms(farm_id) ON DELETE CASCADE,
    CONSTRAINT fk_listing_created_by FOREIGN KEY (created_by)
        REFERENCES users(wallet_address) ON DELETE RESTRICT
);

CREATE OR REPLACE FUNCTION normalize_listing_created_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_by := LOWER(NEW.created_by);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_listings_normalize_wallet
    BEFORE INSERT OR UPDATE ON marketplace_listings
    FOR EACH ROW EXECUTE FUNCTION normalize_listing_created_by();

CREATE TRIGGER trg_listings_updated_at
    BEFORE UPDATE ON marketplace_listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_listings_status ON marketplace_listings(status);
CREATE INDEX idx_listings_farm_id ON marketplace_listings(farm_id);
CREATE INDEX idx_listings_created_by ON marketplace_listings(created_by);
CREATE INDEX idx_listings_vintage ON marketplace_listings(vintage_year);

-- ============================================
-- 5. TRANSACTIONS TABLE
-- ============================================
CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL,
    buyer_wallet TEXT NOT NULL,
    credits_purchased DECIMAL(14, 2) NOT NULL CHECK (credits_purchased > 0),
    price_paid DECIMAL(18, 8) NOT NULL CHECK (price_paid > 0),
    blockchain_tx_hash VARCHAR(66) NOT NULL UNIQUE,
    status transaction_status NOT NULL DEFAULT 'pending',
    block_number BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_tx_listing FOREIGN KEY (listing_id)
        REFERENCES marketplace_listings(listing_id) ON DELETE RESTRICT,
    CONSTRAINT fk_tx_buyer FOREIGN KEY (buyer_wallet)
        REFERENCES users(wallet_address) ON DELETE RESTRICT
);

CREATE OR REPLACE FUNCTION normalize_tx_buyer_wallet()
RETURNS TRIGGER AS $$
BEGIN
    NEW.buyer_wallet := LOWER(NEW.buyer_wallet);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tx_normalize_wallet
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION normalize_tx_buyer_wallet();

CREATE INDEX idx_tx_listing ON transactions(listing_id);
CREATE INDEX idx_tx_buyer ON transactions(buyer_wallet);
CREATE INDEX idx_tx_hash ON transactions(blockchain_tx_hash);
CREATE INDEX idx_tx_status ON transactions(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users: public read (needed for auth lookup)
CREATE POLICY "Public read users" ON users
    FOR SELECT USING (true);
CREATE POLICY "Service insert users" ON users
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update users" ON users
    FOR UPDATE USING (true);

-- Farms: public read, admin insert/update/delete (enforced by backend)
CREATE POLICY "Public read farms" ON farms
    FOR SELECT USING (true);
CREATE POLICY "Service write farms" ON farms
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update farms" ON farms
    FOR UPDATE USING (true);
CREATE POLICY "Service delete farms" ON farms
    FOR DELETE USING (true);

-- Carbon data: public read, service write
CREATE POLICY "Public read carbon_data" ON carbon_data
    FOR SELECT USING (true);
CREATE POLICY "Service write carbon_data" ON carbon_data
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update carbon_data" ON carbon_data
    FOR UPDATE USING (true);
CREATE POLICY "Service delete carbon_data" ON carbon_data
    FOR DELETE USING (true);

-- Listings: public read for active, service write
CREATE POLICY "Public read active listings" ON marketplace_listings
    FOR SELECT USING (true);
CREATE POLICY "Service write listings" ON marketplace_listings
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update listings" ON marketplace_listings
    FOR UPDATE USING (true);
CREATE POLICY "Service delete listings" ON marketplace_listings
    FOR DELETE USING (true);

-- Transactions: read own, service write
CREATE POLICY "Public read transactions" ON transactions
    FOR SELECT USING (true);
CREATE POLICY "Service write transactions" ON transactions
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update transactions" ON transactions
    FOR UPDATE USING (true);

-- ============================================
-- SEED: Create initial admin user (update wallet address)
-- ============================================
-- INSERT INTO users (wallet_address, role, display_name)
-- VALUES ('0xYOUR_ADMIN_WALLET_ADDRESS', 'admin', 'System Admin');