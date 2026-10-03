-- CineShelf schema. Safe to re-run in Supabase SQL Editor.

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 50),
  avatar_url   text,
  is_public    boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.library_items (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  tmdb_movie_id integer not null check (tmdb_movie_id > 0),
  kind          text not null check (kind in ('liked', 'watchlist')),
  title         text not null,
  poster_path   text,
  created_at    timestamptz not null default now(),
  unique (user_id, tmdb_movie_id, kind)
);

create index if not exists library_items_user_kind_idx
  on public.library_items (user_id, kind, created_at desc);

-- Profile row is created by the signup trigger; username/display_name come from signUp options.data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    lower(new.raw_user_meta_data ->> 'username'),
    coalesce(new.raw_user_meta_data ->> 'display_name',
             new.raw_user_meta_data ->> 'username')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.username_available(name text)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles where username = lower(trim(name))
  );
$$;
revoke execute on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

alter table public.profiles      enable row level security;
alter table public.library_items enable row level security;

-- Only these profile columns are editable by their owner.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (username, display_name, avatar_url, is_public)
  on public.profiles to authenticated;
revoke update on public.library_items from anon, authenticated;

drop policy if exists "read public or own profile" on public.profiles;
create policy "read public or own profile" on public.profiles
  for select using (is_public or id = auth.uid());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "read own or public liked" on public.library_items;
create policy "read own or public liked" on public.library_items
  for select using (
    user_id = auth.uid()
    or (
      kind = 'liked'
      and exists (
        select 1 from public.profiles p
        where p.id = library_items.user_id and p.is_public
      )
    )
  );

drop policy if exists "insert own items" on public.library_items;
create policy "insert own items" on public.library_items
  for insert with check (user_id = auth.uid());

drop policy if exists "delete own items" on public.library_items;
create policy "delete own items" on public.library_items
  for delete using (user_id = auth.uid());
