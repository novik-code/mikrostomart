-- Migration 125: lock down social-media storage bucket (P0-09)
--
-- Context: bucket `social-media` was created by migration 085 with two
-- permissive policies:
--
--   "Allow video uploads"  — FOR INSERT, anyone (incl. anon) can upload to
--                            videos/* folder. Designed for "direct upload
--                            from browser" but in practice the admin video
--                            page uses signedUploadUrl from a requireAdmin-
--                            protected endpoint, so this policy has been
--                            unused and was just an open door.
--
--   "Allow service delete" — FOR DELETE, no role check (despite the name).
--                            Anyone could DELETE files. Service role
--                            bypasses RLS anyway, so the policy was never
--                            needed for backend deletes.
--
-- Plus the bucket had file_size_limit = 500MB (overkill, cost exposure)
-- and no MIME type restriction.
--
-- This migration:
--   - Drops both permissive policies (anonymous INSERT / DELETE attack vector closed)
--   - Keeps "Allow public read social-media" — videos must be publicly readable
--     so external platforms (YouTube, TikTok, Meta) can fetch when our backend
--     publishes them via API. Read-only public access is intended.
--   - Reduces file_size_limit to 100MB (sufficient for short social posts).
--   - Constrains allowed_mime_types to video + image only.
--
-- The admin video upload flow continues to work because it routes through
-- /api/social/video-upload (requireAdmin) which uses service_role to create
-- signedUploadUrl — service_role bypasses RLS so removing policies doesn't
-- affect it.
--
-- Idempotent: DROP POLICY IF EXISTS + UPDATE.

DROP POLICY IF EXISTS "Allow video uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow service delete social-media" ON storage.objects;

UPDATE storage.buckets
SET
    file_size_limit = 104857600,                 -- 100 MB (was 500 MB)
    allowed_mime_types = ARRAY[
        'video/mp4', 'video/quicktime', 'video/webm',
        'image/jpeg', 'image/png', 'image/webp'
    ]
WHERE id = 'social-media';
