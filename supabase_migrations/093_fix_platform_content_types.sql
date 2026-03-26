-- Migration 093: Fix platform content_type routing
-- Videos → personal accounts, Posts → business accounts
-- 
-- VIDEO accounts (Marcin Nowosielski personal):
--   YouTube: DentistMarcIn
--   Instagram: nowosielski_marcin  
--   Facebook: marcindentist
--   TikTok: nowosielskimarcin
--
-- POST accounts (Mikrostomart business):
--   Instagram: mikrostomart_opole
--   Facebook: mikrostomart

-- ============================================================
-- 1. Set personal accounts to VIDEO only
-- ============================================================

-- YouTube DentistMarcIn → video
UPDATE social_platforms 
SET content_type = 'video', updated_at = now()
WHERE platform = 'youtube' AND (
    account_name ILIKE '%dentistmarcin%' OR 
    account_name ILIKE '%DentistMarcIn%'
);

-- Instagram nowosielski_marcin → video
UPDATE social_platforms 
SET content_type = 'video', updated_at = now()
WHERE platform = 'instagram' AND (
    account_name ILIKE '%nowosielski_marcin%' OR 
    account_name ILIKE '%nowosielskimarcin%'
);

-- Facebook marcindentist → video
UPDATE social_platforms 
SET content_type = 'video', updated_at = now()
WHERE platform = 'facebook' AND (
    account_name ILIKE '%marcindentist%' OR
    account_name ILIKE '%dentist%marcin%'
);

-- TikTok nowosielskimarcin → video
UPDATE social_platforms 
SET content_type = 'video', updated_at = now()
WHERE platform = 'tiktok' AND (
    account_name ILIKE '%nowosielskimarcin%' OR 
    account_name ILIKE '%nowosielski%'
);

-- ============================================================
-- 2. Set business accounts to POSTS only
-- ============================================================

-- Instagram mikrostomart_opole → posts
UPDATE social_platforms 
SET content_type = 'posts', updated_at = now()
WHERE platform = 'instagram' AND (
    account_name ILIKE '%mikrostomart%'
);

-- Facebook mikrostomart → posts
UPDATE social_platforms 
SET content_type = 'posts', updated_at = now()
WHERE platform = 'facebook' AND (
    account_name ILIKE '%mikrostomart%'
);

-- ============================================================
-- 3. Verification query (run to confirm changes)
-- ============================================================
-- SELECT id, platform, account_name, content_type FROM social_platforms ORDER BY platform, content_type;
