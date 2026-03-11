-- 080: Clean up duplicate push subscriptions
-- Keep only the most recent subscription per user_id.
-- Multiple endpoints per user cause duplicate notifications.
-- After this, each user_id will have at most 1 subscription row.

DELETE FROM push_subscriptions
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id
    FROM push_subscriptions
    ORDER BY user_id, created_at DESC
);

-- Add a unique constraint on user_id to prevent future duplicates
-- (the upsert in subscribe/route.ts will update existing rows instead of inserting new ones)
-- Note: We also keep the unique constraint on endpoint to handle re-subscribes
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_user_id_unique ON push_subscriptions(user_id);
