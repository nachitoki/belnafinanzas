-- 11. Incomes
DROP TABLE IF EXISTS incomes CASCADE;
CREATE TABLE incomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    frequency TEXT DEFAULT 'monthly',
    is_variable BOOLEAN DEFAULT FALSE,
    month TEXT,
    min_amount NUMERIC,
    next_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Commitments
DROP TABLE IF EXISTS commitments CASCADE;
CREATE TABLE commitments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    frequency TEXT DEFAULT 'monthly',
    flow_category TEXT,
    next_date DATE,
    installments_total INTEGER DEFAULT 0,
    installments_paid INTEGER DEFAULT 0,
    is_variable BOOLEAN DEFAULT FALSE,
    last_paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Events
DROP TABLE IF EXISTS events CASCADE;
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount_estimate NUMERIC DEFAULT 0,
    date DATE,
    is_mandatory BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
