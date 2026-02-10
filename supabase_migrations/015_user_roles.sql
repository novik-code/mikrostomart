-- ============================================
-- Migration: User Roles System
-- ============================================
-- Date: 2026-02-10
-- Purpose: Unified role-based access control for admin, employee, patient zones

-- ============================================
-- 1. Create user_roles table
-- ============================================

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User reference (Supabase auth.users)
    user_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    
    -- Role
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'employee', 'patient')),
    
    -- Audit
    granted_by VARCHAR(255),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One user can't have same role twice
    UNIQUE(user_id, role)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_email ON user_roles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Comments
COMMENT ON TABLE user_roles IS 
    'Unified role system: each user can have multiple roles (admin, employee, patient)';

COMMENT ON COLUMN user_roles.user_id IS 
    'References auth.users(id) from Supabase Auth';

COMMENT ON COLUMN user_roles.role IS 
    'One of: admin, employee, patient';

COMMENT ON COLUMN user_roles.granted_by IS 
    'Email of admin who granted this role (or system for seed data)';

-- ============================================
-- 2. Seed: Grant Marcin Nowosielski all 3 roles
-- ============================================
-- dr.nowosielski@gmail.com should have admin + employee + patient

DO $$
DECLARE
    marcin_user_id UUID;
BEGIN
    -- Find Marcin's Supabase auth user ID
    SELECT id INTO marcin_user_id 
    FROM auth.users 
    WHERE email = 'dr.nowosielski@gmail.com'
    LIMIT 1;
    
    IF marcin_user_id IS NOT NULL THEN
        -- Grant admin role
        INSERT INTO user_roles (user_id, email, role, granted_by)
        VALUES (marcin_user_id, 'dr.nowosielski@gmail.com', 'admin', 'system')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Grant employee role
        INSERT INTO user_roles (user_id, email, role, granted_by)
        VALUES (marcin_user_id, 'dr.nowosielski@gmail.com', 'employee', 'system')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Grant patient role
        INSERT INTO user_roles (user_id, email, role, granted_by)
        VALUES (marcin_user_id, 'dr.nowosielski@gmail.com', 'patient', 'system')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Granted all 3 roles to dr.nowosielski@gmail.com (user_id: %)', marcin_user_id;
    ELSE
        RAISE NOTICE 'User dr.nowosielski@gmail.com not found in auth.users - run after user exists';
    END IF;
END $$;

-- ============================================
-- 3. Verification queries
-- ============================================

-- Check table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'user_roles';

-- Check roles
SELECT email, role, granted_at FROM user_roles ORDER BY email, role;
