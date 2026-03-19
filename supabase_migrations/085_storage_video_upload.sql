-- Migration 085: Allow client-side uploads to social-media storage bucket
-- This enables direct upload from the browser (bypassing Vercel's 4.5MB body limit)

-- Create the bucket if it doesn't exist (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('social-media', 'social-media', true, 524288000) -- 500MB
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 524288000;

-- Allow anyone to upload to the videos/ folder (for video upload from mobile)
CREATE POLICY "Allow video uploads" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'social-media' AND (storage.foldername(name))[1] = 'videos');

-- Allow public read access
CREATE POLICY "Allow public read social-media" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'social-media');

-- Allow service role to delete
CREATE POLICY "Allow service delete social-media" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'social-media');
