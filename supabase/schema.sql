-- Mikro-1-Lern-App: Datenbankschema für Supabase
-- Einfügen in: Supabase → SQL Editor → New query → Run
-- Das Skript kann gefahrlos mehrfach ausgeführt werden.

-- ---------------------------------------------------------------
-- 1. Antworthistorie: jede beantwortete Aufgabe
-- ---------------------------------------------------------------
create table if not exists public.antworten (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  aufgabe_id  text not null,
  kapitel     smallint not null check (kapitel between 0 and 20),
  modus       text not null check (modus in ('runde', 'bunker', 'boss')),
  ergebnis    text not null check (ergebnis in ('richtig', 'teils', 'falsch')),
  eingabe     jsonb,
  erstellt_am timestamptz not null default now()
);
create index if not exists antworten_user_zeit on public.antworten (user_id, erstellt_am desc);
create index if not exists antworten_user_aufgabe on public.antworten (user_id, aufgabe_id);

-- ---------------------------------------------------------------
-- 2. Handicap je Kapitel (Start 36, niedriger = besser)
-- ---------------------------------------------------------------
create table if not exists public.handicap (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kapitel        smallint not null check (kapitel between 0 and 20),
  wert           numeric(4, 1) not null default 36 check (wert between 0 and 54),
  aktualisiert_am timestamptz not null default now(),
  primary key (user_id, kapitel)
);

-- ---------------------------------------------------------------
-- 3. Fehler-Bunker: raus nach 2 richtigen Antworten an verschiedenen Tagen
-- ---------------------------------------------------------------
create table if not exists public.bunker (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  aufgabe_id  text not null,
  kapitel     smallint not null check (kapitel between 0 and 20),
  seit        timestamptz not null default now(),
  richtig_tage date[] not null default '{}',
  primary key (user_id, aufgabe_id)
);

-- ---------------------------------------------------------------
-- 4. Spaced Repetition: wann ist eine Aufgabe wieder fällig
-- ---------------------------------------------------------------
create table if not exists public.wiederholung (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  aufgabe_id     text not null,
  kapitel        smallint not null check (kapitel between 0 and 20),
  intervall_tage integer not null default 1 check (intervall_tage >= 0),
  faellig_am     date not null default current_date,
  wiederholungen integer not null default 0 check (wiederholungen >= 0),
  primary key (user_id, aufgabe_id)
);
create index if not exists wiederholung_faellig on public.wiederholung (user_id, faellig_am);

-- ---------------------------------------------------------------
-- 5. Fortschritt: Streak (Tage am Stück)
-- ---------------------------------------------------------------
create table if not exists public.fortschritt (
  user_id          uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  streak           integer not null default 0 check (streak >= 0),
  laengster_streak integer not null default 0 check (laengster_streak >= 0),
  letzter_tag      date
);

-- ---------------------------------------------------------------
-- 6. Boss-Kämpfe
-- ---------------------------------------------------------------
create table if not exists public.boss_ergebnisse (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kapitel     smallint not null check (kapitel between 0 and 20),
  punkte      numeric(6, 1) not null check (punkte >= 0),
  max_punkte  numeric(6, 1) not null check (max_punkte > 0),
  dauer_sek   integer not null check (dauer_sek >= 0),
  bestanden   boolean not null,
  erstellt_am timestamptz not null default now(),
  check (punkte <= max_punkte)
);
create index if not exists boss_user on public.boss_ergebnisse (user_id, kapitel);

-- ---------------------------------------------------------------
-- Row Level Security: jede Person sieht und ändert nur eigene Zeilen
-- ---------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['antworten', 'handicap', 'bunker', 'wiederholung', 'fortschritt', 'boss_ergebnisse']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "eigene_zeilen" on public.%I', t);
    execute format(
      'create policy "eigene_zeilen" on public.%I for all to authenticated '
      'using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
