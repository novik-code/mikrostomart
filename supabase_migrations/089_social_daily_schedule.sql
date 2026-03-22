-- Migration 089: Activate daily social media schedule for auto-posting
-- Inserts a schedule that generates + auto-publishes a dental post every day at 11:00 CEST
-- to Facebook and Instagram Mikrostomart accounts.

INSERT INTO social_schedules (
    name,
    platform_ids,
    content_type,
    ai_prompt,
    frequency,
    preferred_hour,
    preferred_days,
    is_active,
    auto_publish
) VALUES (
    'Codzienny post stomatologiczny',
    -- Dynamically pick all active FB + IG platform IDs
    (SELECT ARRAY_AGG(id) FROM social_platforms WHERE platform IN ('facebook', 'instagram') AND is_active = true),
    'post_text_image',
    NULL,  -- uses random dental topic from DENTAL_TOPICS array in socialAI.ts
    'daily',
    9,     -- 9:00 UTC = 11:00 CEST (summer) / 10:00 CET (winter)
    '{1,2,3,4,5,6,7}',  -- every day of week
    true,
    true   -- auto-publish without admin approval
);
