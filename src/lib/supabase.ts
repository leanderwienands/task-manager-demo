import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Fehlertext, falls die Keys fehlen (wird auf der Startseite angezeigt). */
export const konfigFehler: string | null =
  !url || !key
    ? 'Supabase ist nicht eingerichtet: VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY fehlen (siehe README).'
    : null;

export const supabase = createClient(url ?? 'http://localhost', key ?? 'fehlt', {
  auth: { persistSession: true, autoRefreshToken: true },
});
