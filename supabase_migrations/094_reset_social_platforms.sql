-- Migration 094: RESET social_platforms — clean slate
-- Run in Supabase SQL Editor on PRODUCTION database (keucogopujdolzmfajjv)
-- 
-- After running this, go to Admin → Social Media → Platformy
-- and click 🔑 Połącz for each account to authorize tokens.

-- ============================================================
-- 1. DELETE all existing platform entries
-- ============================================================
DELETE FROM social_platforms;

-- ============================================================
-- 2. INSERT correct platforms
-- ============================================================

-- 🎬 VIDEO accounts (Marcin Nowosielski personal)
-- YouTube: https://www.youtube.com/c/DentistMarcIn
INSERT INTO social_platforms (platform, account_name, account_url, content_type, is_active)
VALUES ('youtube', 'DentistMarcIn', 'https://www.youtube.com/c/DentistMarcIn', 'video', true);

-- Instagram: https://www.instagram.com/nowosielski_marcin/
INSERT INTO social_platforms (platform, account_name, account_url, content_type, is_active)
VALUES ('instagram', 'nowosielski_marcin', 'https://www.instagram.com/nowosielski_marcin/', 'video', true);

-- Facebook: https://www.facebook.com/marcindentist
INSERT INTO social_platforms (platform, account_name, account_url, content_type, is_active)
VALUES ('facebook', 'marcindentist', 'https://www.facebook.com/marcindentist', 'video', true);

-- TikTok: https://www.tiktok.com/@nowosielskimarcin
INSERT INTO social_platforms (platform, account_name, account_url, content_type, is_active)
VALUES ('tiktok', 'nowosielskimarcin', 'https://www.tiktok.com/@nowosielskimarcin', 'video', true);

-- 📝 POST accounts (Mikrostomart business)
-- Instagram: https://www.instagram.com/mikrostomart_opole/
INSERT INTO social_platforms (platform, account_name, account_url, content_type, is_active)
VALUES ('instagram', 'mikrostomart_opole', 'https://www.instagram.com/mikrostomart_opole/', 'posts', true);

-- Facebook: https://www.facebook.com/mikrostomart/
INSERT INTO social_platforms (platform, account_name, account_url, content_type, is_active)
VALUES ('facebook', 'mikrostomart', 'https://www.facebook.com/mikrostomart/', 'posts', true);

-- ============================================================
-- 3. Verify
-- ============================================================
SELECT platform, account_name, content_type, is_active 
FROM social_platforms 
ORDER BY content_type, platform;
