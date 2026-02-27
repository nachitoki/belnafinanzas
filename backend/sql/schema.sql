-- Esquema de Base de Datos para Finanzas Familiares (Supabase/PostgreSQL)

-- 1. Tablas Maestras
CREATE TABLE households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    essential BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Transacciones y Gastos
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL,
    occurred_on TIMESTAMP WITH TIME ZONE NOT NULL,
    description TEXT,
    store_id TEXT,
    product_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Compromisos Fijos (Commitments)
CREATE TABLE commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    frequency TEXT DEFAULT 'monthly', -- 'weekly', 'biweekly', 'monthly', 'one_time', 'yearly'
    next_date DATE,
    last_paid_at TIMESTAMP WITH TIME ZONE,
    flow_category TEXT, -- 'estructural', 'provisión', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Eventos Futuros
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount_estimate NUMERIC(15, 2) NOT NULL,
    date DATE NOT NULL,
    is_mandatory BOOLEAN DEFAULT false,
    flow_category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Ingresos (Incomes)
CREATE TABLE incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    frequency TEXT DEFAULT 'monthly',
    next_date DATE,
    is_variable BOOLEAN DEFAULT false,
    min_amount NUMERIC(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Bitácora de Proyectos/Notas
CREATE TABLE bitacora (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    kind TEXT NOT NULL, -- 'project', 'note', 'alert'
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Deudas y Créditos (Paydown Radar)
CREATE TABLE debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL, -- Monto total adeudado inicial
    remaining_amount NUMERIC(15, 2) NOT NULL, -- Monto restante por pagar
    monthly_payment NUMERIC(15, 2), -- Cuota mensual de referencia
    interest_rate NUMERIC(5, 2), -- Tasa de interés mensual/anual
    total_installments INTEGER, -- Total de cuotas (ej: 24)
    paid_installments INTEGER DEFAULT 0, -- Cuotas pagadas (ej: 6)
    expected_payoff_date DATE, -- Fecha proyectada de término de deuda
    status TEXT DEFAULT 'active', -- 'active', 'paid_off'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Historial de Pagos de Deudas
CREATE TABLE debt_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debt_id UUID REFERENCES debts(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Simuladores "What-If" (Escenarios IA)
CREATE TABLE simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    scenario_data JSONB NOT NULL, -- Variables alteradas: {"income_increase": 200000, "new_debt_monthly": 50000}
    projection_result JSONB, -- Resultado de la simulación mes a mes
    ai_advice TEXT, -- Decisión o consejo del Asesor IA
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para velocidad
CREATE INDEX idx_transactions_household_date ON transactions(household_id, occurred_on);
CREATE INDEX idx_commitments_household ON commitments(household_id);
CREATE INDEX idx_categories_household ON categories(household_id);
CREATE INDEX idx_debts_household ON debts(household_id);
CREATE INDEX idx_simulations_household ON simulations(household_id);
