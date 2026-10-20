create type public.app_role as enum ('admin','user');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());
create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text not null default '' check (char_length(display_name) <= 40), created_at timestamptz not null default now());
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name) values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1), ''), 40)) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.subscriptions (
  user_id uuid primary key,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'none',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "own subscription read" on public.subscriptions for select to authenticated using (user_id = auth.uid());

create or replace function public.is_premium(_user_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.subscriptions where user_id=_user_id and status in ('active','trialing') and (current_period_end is null or current_period_end > now()))
$$;

create table public.stripe_events (id text primary key, type text not null, received_at timestamptz not null default now());
grant all on public.stripe_events to service_role;
alter table public.stripe_events enable row level security;

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  display_name text not null default '',
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 10 and 1000),
  verified_subscriber boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
grant select on public.reviews to anon;
grant select, insert, update, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "approved reviews public" on public.reviews for select to anon, authenticated using (status = 'approved');
create policy "own review read" on public.reviews for select to authenticated using (user_id = auth.uid());
create policy "admins read all" on public.reviews for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "own review insert" on public.reviews for insert to authenticated with check (user_id = auth.uid());
create policy "own review delete" on public.reviews for delete to authenticated using (user_id = auth.uid());
create policy "admins moderate" on public.reviews for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.reviews_before_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.status := 'pending';
  new.created_at := now();
  new.verified_subscriber := exists(select 1 from public.subscriptions where user_id = new.user_id and stripe_subscription_id is not null and status in ('active','trialing','past_due','canceled'));
  new.display_name := coalesce(nullif((select display_name from public.profiles where id = new.user_id), ''), 'PitchIQ user');
  return new;
end $$;
create trigger reviews_before_insert before insert on public.reviews for each row execute function public.reviews_before_insert();

create or replace function public.reviews_before_update() returns trigger language plpgsql set search_path = public as $$
begin
  if new.user_id <> old.user_id or new.rating <> old.rating or new.body <> old.body or new.verified_subscriber <> old.verified_subscriber or new.display_name <> old.display_name then
    raise exception 'Only status can be changed';
  end if;
  return new;
end $$;
create trigger reviews_before_update before update on public.reviews for each row execute function public.reviews_before_update();

create or replace function public.review_stats() returns table(review_count bigint, average numeric) language sql stable security definer set search_path = public as $$
  select count(*), round(avg(rating)::numeric, 1) from public.reviews where status = 'approved'
$$;
grant execute on function public.review_stats() to anon, authenticated;