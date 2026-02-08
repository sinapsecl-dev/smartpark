-- Create push_subscriptions table
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null unique,
  auth text not null,
  p256dh text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.push_subscriptions enable row level security;

-- Policies for push_subscriptions
create policy "Users can manage their own subscriptions"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id);

-- Create notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  body text not null,
  type text default 'info', -- 'info', 'success', 'warning', 'error'
  read boolean default false,
  data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Policies for notifications
create policy "Users can see their own notifications"
  on public.notifications
  for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications (mark as read)"
  on public.notifications
  for update
  using (auth.uid() = user_id);
  
-- Allow service role (server actions) to insert notifications
create policy "Service role can insert notifications"
  on public.notifications
  for insert
  with check (true);

-- Enable Realtime for notifications
alter publication supabase_realtime add table public.notifications;
