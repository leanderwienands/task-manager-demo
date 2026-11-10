// Prüft die Supabase-Einstellungen aus Vercel/.env auf typische Kopierfehler.

export interface Konfig {
  url: string | null;
  key: string | null;
  host: string;
  keyArt: string;
  fehler: string[];
  hinweise: string[];
}

function saeubern(wert: string | undefined): string {
  // Leerzeichen, Zeilenumbrüche und versehentliche Anführungszeichen entfernen
  return (wert ?? '').trim().replace(/^["']|["']$/g, '').trim();
}

function jwtRolle(key: string): string | null {
  try {
    const teil = key.split('.')[1];
    const json = atob(teil.replace(/-/g, '+').replace(/_/g, '/'));
    return (JSON.parse(json) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

export function pruefeKonfig(rohUrl: string | undefined, rohKey: string | undefined): Konfig {
  const fehler: string[] = [];
  const hinweise: string[] = [];
  const urlText = saeubern(rohUrl);
  const key = saeubern(rohKey);
  let url: string | null = null;
  let host = '–';

  if (!urlText) fehler.push('VITE_SUPABASE_URL fehlt.');
  else {
    try {
      const u = new URL(urlText);
      host = u.host;
      if (u.protocol !== 'https:' && u.hostname !== 'localhost')
        fehler.push(`VITE_SUPABASE_URL muss mit https:// beginnen (ist: ${urlText}).`);
      else if (u.hostname === 'supabase.com' || u.hostname.endsWith('.supabase.com'))
        fehler.push(
          `VITE_SUPABASE_URL ist die Adresse des Supabase-Dashboards (${u.host}). Richtig ist die Project URL im Format https://<projekt-id>.supabase.co (Project Settings → API).`,
        );
      else {
        url = u.origin; // Pfade wie /rest/v1 oder ein Schrägstrich am Ende werden entfernt
        if (u.pathname !== '/' && u.pathname !== '') hinweise.push(`Pfad „${u.pathname}“ in der URL wurde ignoriert.`);
        if (!u.hostname.endsWith('.supabase.co')) hinweise.push(`Ungewöhnliche Supabase-Adresse: ${u.host}.`);
      }
    } catch {
      fehler.push(`VITE_SUPABASE_URL ist keine gültige Adresse (ist: „${urlText.slice(0, 60)}“).`);
    }
  }

  let keyArt = '–';
  if (!key) fehler.push('VITE_SUPABASE_ANON_KEY fehlt.');
  else if (!/^[A-Za-z0-9._-]+$/.test(key))
    fehler.push(
      'VITE_SUPABASE_ANON_KEY enthält unerlaubte Zeichen (z. B. „…“, Leerzeichen oder Umlaute). Den Key in Supabase über den Kopieren-Knopf neu kopieren und in Vercel ersetzen.',
    );
  else if (key.startsWith('sb_secret_')) fehler.push('Das ist der geheime Secret-Key. Bitte den öffentlichen Publishable-Key verwenden!');
  else if (key.startsWith('sb_publishable_')) keyArt = 'Publishable Key';
  else if (key.startsWith('eyJ')) {
    const rolle = jwtRolle(key);
    if (rolle === 'service_role') fehler.push('Das ist der geheime service_role-Key. Bitte den öffentlichen anon-Key verwenden!');
    else if (rolle === 'anon') keyArt = 'anon Key';
    else {
      keyArt = 'unbekannt';
      hinweise.push('Der Key sieht unvollständig aus. Wurde er ganz kopiert?');
    }
  } else {
    keyArt = 'unbekannt';
    hinweise.push('Unbekanntes Key-Format. Erwartet: beginnt mit „eyJ“ oder „sb_publishable_“.');
  }

  return { url, key: key || null, host, keyArt, fehler, hinweise };
}
