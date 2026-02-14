-- ============================================
-- Migration: Employees Table
-- ============================================
-- Date: 2026-02-14
-- Purpose: Dedicated employees table for centralized staff management,
--          linked to Supabase Auth and Prodentis operators.

-- ============================================
-- 1. Create employees table
-- ============================================

CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Supabase Auth reference
    user_id UUID,
    
    -- Employee info
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    
    -- Prodentis integration
    prodentis_id VARCHAR(100),
    
    -- Optional metadata
    position VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_prodentis_id ON employees(prodentis_id);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);

-- Comments
COMMENT ON TABLE employees IS 
    'Dedicated employee registry — auto-populated when employee accounts are created';

COMMENT ON COLUMN employees.user_id IS 
    'References auth.users(id) from Supabase Auth (nullable for pre-registration entries)';

COMMENT ON COLUMN employees.prodentis_id IS 
    'Operator ID from Prodentis system (set when matched with Prodentis staff scan)';

COMMENT ON COLUMN employees.position IS 
    'Job title / position (e.g. Lekarz, Higienistka, Asystentka, Recepcja)';

-- ============================================
-- 2. Seed existing employees from user_roles
-- ============================================
-- Inserts all current employee-role users into the employees table.
-- Name field uses '<<< WPISZ IMIĘ >>>' placeholder — update manually.

INSERT INTO employees (user_id, email, name) 
SELECT ur.user_id, ur.email, ur.email  -- email as placeholder name
FROM user_roles ur
WHERE ur.role = 'employee'
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 3. Verification
-- ============================================
SELECT id, email, name, user_id, prodentis_id, is_active, created_at 
FROM employees 
ORDER BY email;
