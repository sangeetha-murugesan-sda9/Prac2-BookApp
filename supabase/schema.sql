-- run this once in the Supabase SQL editor (Project -> SQL Editor -> New query)
-- before starting the api service.

-- needed for the exclusion constraint below, which stops overlapping
-- bookings on the same room at the database level, not just in app code.
create extension if not exists btree_gist;

create table if not exists rooms (
  id serial primary key,
  name text not null,
  capacity int not null default 4
);

create table if not exists bookings (
  id serial primary key,
  room_id int not null references rooms(id) on delete cascade,
  customer_name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint valid_range check (ends_at > starts_at),
  -- this is the real business rule: two bookings for the same room can't
  -- have overlapping time ranges. postgres enforces this itself, so even
  -- a bug in the app's own overlap check can't create a double-booking.
  constraint no_double_booking exclude using gist (
    room_id with =,
    tstzrange(starts_at, ends_at) with &&
  )
);

insert into rooms (name, capacity) values
  ('Alder', 4),
  ('Birch', 8),
  ('Cedar', 2)
on conflict do nothing;
