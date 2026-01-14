-- Create 'news' table
create table news (
  id text primary key, -- Text because existing IDs are strings (e.g. "320")
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  date date not null,
  image text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table news enable row level security;

-- Policy: Everyone can view news
create policy "Public News are viewable by everyone"
  on news for select
  using ( true );

-- Policy: Service Role can do everything (implicit, but good to note)
-- No explicit policy needed for service role key usage.
