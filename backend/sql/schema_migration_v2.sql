-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Households
CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    telegram_user_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Accounts
DROP TABLE IF EXISTS accounts CASCADE;
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'credit_card', 'utility', 'family_debt')),
    currency TEXT DEFAULT 'CLP',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Categories
DROP TABLE IF EXISTS categories CASCADE;
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
    essential BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Transactions
DROP TABLE IF EXISTS transactions CASCADE;
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    occurred_on DATE NOT NULL,
    amount INTEGER NOT NULL,
    description TEXT NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'posted')),
    source TEXT NOT NULL CHECK (source IN ('manual', 'telegram', 'receipt')),
    receipt_id UUID, -- Se referenciará después de crear receipts
    qty NUMERIC,
    unit TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Stores
DROP TABLE IF EXISTS stores CASCADE;
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    legal_names TEXT[] DEFAULT '{}',
    ruts TEXT[] DEFAULT '{}',
    aliases TEXT[] DEFAULT '{}',
    city TEXT,
    tags JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Products
DROP TABLE IF EXISTS products CASCADE;
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name_raw TEXT NOT NULL,
    name_norm TEXT NOT NULL,
    unit_base TEXT NOT NULL CHECK (unit_base IN ('g', 'ml', 'unit', 'kg', 'l')),
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Receipts
DROP TABLE IF EXISTS receipts CASCADE;
CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    occurred_on DATE,
    total INTEGER,
    image_url TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('uploaded', 'extracted', 'needs_review', 'confirmed', 'rejected')),
    extracted_json JSONB,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referencia circular resuelta: Agregar llave foránea a transactions apuntando a receipts (si existe)
ALTER TABLE transactions 
ADD CONSTRAINT fk_transaction_receipt 
FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE SET NULL;

-- 9. Receipt Items
DROP TABLE IF EXISTS receipt_items CASCADE;
CREATE TABLE receipt_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    name_raw TEXT NOT NULL,
    qty NUMERIC,
    unit TEXT,
    line_total INTEGER,
    unit_price NUMERIC,
    confidence NUMERIC NOT NULL,
    category_suggested TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Product Prices (Historial de precios)
DROP TABLE IF EXISTS product_prices CASCADE;
CREATE TABLE product_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    qty NUMERIC NOT NULL,
    unit TEXT NOT NULL CHECK (unit IN ('g', 'ml', 'unit', 'kg', 'l')),
    total_price INTEGER NOT NULL,
    unit_price NUMERIC NOT NULL,
    receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
