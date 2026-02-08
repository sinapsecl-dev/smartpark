-- Create notifications table
create type notification_type as enum ('info', 'warning', 'success', 'error');

create table public.notifications (
    id uuid not null default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    body text not null,
    type notification_type not null default 'info',
    read boolean not null default false,
    data jsonb default '{}'::jsonb,
    created_at timestamp with time zone not null default now(),
    constraint notifications_pkey primary key (id)
);

-- Create push_subscriptions table
create table public.push_subscriptions (
    id uuid not null default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    endpoint text not null unique,
    auth text not null,
    p256dh text not null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint push_subscriptions_pkey primary key (id)
);

-- Enable RLS
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

-- Policies for notifications
create policy "Users can view their own notifications"
    on public.notifications for select
    using (auth.uid() = user_id);

create policy "Server can insert notifications"
    on public.notifications for insert
    with check (true); -- Ideally restricted to service role, but for now we rely on backend logic

create policy "Users can update their own notifications (mark as read)"
    on public.notifications for update
    using (auth.uid() = user_id);

-- Policies for push_subscriptions
create policy "Users can view their own subscriptions"
    on public.push_subscriptions for select
    using (auth.uid() = user_id);

create policy "Users can insert their own subscriptions"
    on public.push_subscriptions for insert
    with check (auth.uid() = user_id);

create policy "Users can delete their own subscriptions"
    on public.push_subscriptions for delete
    using (auth.uid() = user_id);

-- Add real-time
alter publication supabase_realtime add table public.notifications;
