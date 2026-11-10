import { createClient } from '@supabase/supabase-js';
import { pruefeKonfig } from './konfig';

export const konfig = pruefeKonfig(
  import.meta.env.VITE_SUPABASE_URL as string | undefined,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
);

/** Fehlertext, falls die Einstellungen unbrauchbar sind (App zeigt dann nur diese Meldung). */
export const konfigFehler: string | null = konfig.fehler.length > 0 ? konfig.fehler.join(' ') : null;

export const supabase = createClient(konfig.url ?? 'http://localhost', konfig.key ?? 'fehlt', {
  auth: { persistSession: true, autoRefreshToken: true },
});

/** Prüft, ob Supabase erreichbar ist und den Key akzeptiert. */
export async function testeVerbindung(): Promise<string> {
  try {
    const res = await fetch(`${konfig.url}/auth/v1/settings`, { headers: { apikey: konfig.key ?? '' } });
    if (res.ok) return `✓ Verbindung zu ${konfig.host} funktioniert, Key wird akzeptiert.`;
    const text = await res.text();
    if (res.status === 401 || res.status === 403)
      return `✗ Supabase erreicht, aber der Key wird abgelehnt (Status ${res.status}). Bitte den öffentlichen Key neu kopieren. Technisch: ${text.slice(0, 200)}`;
    return `✗ Supabase antwortet mit Status ${res.status}. Technisch: ${text.slice(0, 200)}`;
  } catch (e) {
    return `✗ ${konfig.host} ist nicht erreichbar. Stimmt die Project URL? Ist das Projekt pausiert? Technisch: ${technisch(e)}`;
  }
}

/** Fehlertext mit Typ, Meldung und Status – so wie er wirklich kam. */
export function technisch(e: unknown): string {
  if (e instanceof Error) {
    const status = (e as { status?: number }).status;
    const ursache = (e as { cause?: unknown }).cause;
    return [
      `${e.name}: ${e.message}`,
      status !== undefined ? `(Status ${status})` : '',
      ursache instanceof Error ? `– Ursache: ${ursache.name}: ${ursache.message}` : '',
    ]
      .filter(Boolean)
      .join(' ');
  }
  return typeof e === 'string' ? e : JSON.stringify(e);
}
