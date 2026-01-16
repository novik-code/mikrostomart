-- Create blog_posts table
create table if not exists public.blog_posts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  image text,
  date timestamp with time zone,
  tags text[],
  is_published boolean default true
);

-- Enable RLS
alter table public.blog_posts enable row level security;

-- Create policies
create policy "Public can view published posts"
  on public.blog_posts for select
  using (is_published = true);

create policy "Admins can insert posts"
  on public.blog_posts for insert
  with check (auth.role() = 'authenticated');

create policy "Admins can update posts"
  on public.blog_posts for update
  using (auth.role() = 'authenticated');

create policy "Admins can delete posts"
  on public.blog_posts for delete
  using (auth.role() = 'authenticated');
