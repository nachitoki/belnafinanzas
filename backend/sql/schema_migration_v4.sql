-- ==============================================
-- Schema Migration V4 - Tablas y columnas faltantes
-- ==============================================

-- 1. Agregar columna settings a households
ALTER TABLE households ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- 2. Agregar columna email a users  
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Relajar constraints en transactions que bloquean inserts
ALTER TABLE transactions ALTER COLUMN description DROP NOT NULL;
ALTER TABLE transactions ALTER COLUMN occurred_on TYPE TIMESTAMP WITH TIME ZONE USING occurred_on::timestamp with time zone;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_source_check;
-- Agregar columnas que usan las rutas
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS store_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS bucket TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;

-- 4. Crear tabla bitacora
CREATE TABLE IF NOT EXISTS bitacora (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    text TEXT,
    kind TEXT DEFAULT 'nota',
    answer TEXT,
    meta JSONB DEFAULT '{}',
    source_id TEXT,
    status TEXT DEFAULT 'active',
    created_by TEXT,
    title TEXT,
    summary TEXT,
    detail TEXT,
    impact TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Crear tabla meal_plans
CREATE TABLE IF NOT EXISTS meal_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    type TEXT DEFAULT 'lunch',
    recipe_id TEXT,
    recipe_name TEXT DEFAULT '',
    recipe_cost INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(household_id, date, type)
);

-- 6. Crear tabla shopping_list
CREATE TABLE IF NOT EXISTS shopping_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    estimated_cost INTEGER DEFAULT 0,
    is_checked BOOLEAN DEFAULT FALSE,
    month TEXT NOT NULL
);

-- 7. Agregar columnas extras a products que el catálogo usa
ALTER TABLE products ADD COLUMN IF NOT EXISTS manual_price NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS manual_unit TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS "group" TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_tag TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS recipe_linked BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS perishable BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
-- Relajar NOT NULL en products para datos parciales
ALTER TABLE products ALTER COLUMN name_norm DROP NOT NULL;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_unit_base_check;

-- 8. Agregar archived a stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
