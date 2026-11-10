// Speicher-Schicht: alle Zugriffe auf Supabase laufen über diese Datei.
// Die user_id setzt die Datenbank automatisch (Standardwert auth.uid()),
// Row Level Security sorgt dafür, dass nur eigene Zeilen sichtbar sind.
import { supabase } from './supabase';
import { KAPITEL } from './aufgaben';

export type Ergebnis = 'richtig' | 'teils' | 'falsch';
export type Modus = 'runde' | 'bunker' | 'boss';

export const START_HANDICAP = 36;

export interface Antwort {
  id: number;
  aufgabe_id: string;
  kapitel: number;
  modus: Modus;
  ergebnis: Ergebnis;
  eingabe: unknown;
  erstellt_am: string;
}

export interface BunkerEintrag {
  aufgabe_id: string;
  kapitel: number;
  seit: string;
  richtig_tage: string[];
}

export interface Wiederholung {
  aufgabe_id: string;
  kapitel: number;
  intervall_tage: number;
  faellig_am: string;
  wiederholungen: number;
}

export interface Fortschritt {
  streak: number;
  laengster_streak: number;
  letzter_tag: string | null;
}

export interface BossErgebnis {
  kapitel: number;
  punkte: number;
  max_punkte: number;
  dauer_sek: number;
  bestanden: boolean;
}

function pruefe<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

// ---------- Handicap ----------

/** Liefert das Handicap je Kapitel (Kapitelnummer → Wert). */
export async function ladeHandicaps(): Promise<Record<number, number>> {
  const zeilen = pruefe(await supabase.from('handicap').select('kapitel, wert'));
  const ergebnis: Record<number, number> = {};
  for (const z of zeilen ?? []) ergebnis[z.kapitel] = Number(z.wert);
  return ergebnis;
}

/** Legt für jedes Kapitel Handicap 36 an, falls noch keine Zeile existiert. */
export async function initialisiereHandicaps(): Promise<void> {
  const zeilen = KAPITEL.map((k) => ({ kapitel: k.nr, wert: START_HANDICAP }));
  pruefe(
    await supabase
      .from('handicap')
      .upsert(zeilen, { onConflict: 'user_id,kapitel', ignoreDuplicates: true }),
  );
}

export async function speichereHandicap(kapitel: number, wert: number): Promise<void> {
  pruefe(
    await supabase
      .from('handicap')
      .upsert({ kapitel, wert, aktualisiert_am: new Date().toISOString() }, { onConflict: 'user_id,kapitel' }),
  );
}

// ---------- Antworthistorie ----------

export async function speichereAntwort(a: {
  aufgabe_id: string;
  kapitel: number;
  modus: Modus;
  ergebnis: Ergebnis;
  eingabe?: unknown;
}): Promise<void> {
  pruefe(await supabase.from('antworten').insert({ ...a, eingabe: a.eingabe ?? null }));
}

/** Mehrere Antworten auf einmal (Boss-Kampf). */
export async function speichereAntworten(
  liste: { aufgabe_id: string; kapitel: number; modus: Modus; ergebnis: Ergebnis; eingabe?: unknown }[],
): Promise<void> {
  if (liste.length === 0) return;
  pruefe(await supabase.from('antworten').insert(liste.map((a) => ({ ...a, eingabe: a.eingabe ?? null }))));
}

/** Neueste Antworten zuerst. */
export async function ladeAntworten(limit = 1000): Promise<Antwort[]> {
  return pruefe(
    await supabase.from('antworten').select('*').order('erstellt_am', { ascending: false }).limit(limit),
  ) as Antwort[];
}

// ---------- Fehler-Bunker ----------

export async function ladeBunker(): Promise<BunkerEintrag[]> {
  return pruefe(await supabase.from('bunker').select('aufgabe_id, kapitel, seit, richtig_tage')) as BunkerEintrag[];
}

export async function speichereBunkerEintrag(e: {
  aufgabe_id: string;
  kapitel: number;
  seit?: string;
  richtig_tage?: string[];
}): Promise<void> {
  pruefe(
    await supabase
      .from('bunker')
      .upsert({ ...e, richtig_tage: e.richtig_tage ?? [] }, { onConflict: 'user_id,aufgabe_id' }),
  );
}

/** Mehrere Einträge auf einmal (für den Abgleich mit der Historie). */
export async function speichereBunkerEintraege(e: BunkerEintrag[]): Promise<void> {
  if (e.length === 0) return;
  pruefe(await supabase.from('bunker').upsert(e, { onConflict: 'user_id,aufgabe_id' }));
}

export async function entferneAusBunker(aufgabe_id: string): Promise<void> {
  pruefe(await supabase.from('bunker').delete().eq('aufgabe_id', aufgabe_id));
}

// ---------- Spaced Repetition ----------

export async function ladeWiederholungen(): Promise<Wiederholung[]> {
  return pruefe(
    await supabase.from('wiederholung').select('aufgabe_id, kapitel, intervall_tage, faellig_am, wiederholungen'),
  ) as Wiederholung[];
}

export async function speichereWiederholung(w: Wiederholung): Promise<void> {
  pruefe(await supabase.from('wiederholung').upsert(w, { onConflict: 'user_id,aufgabe_id' }));
}

// ---------- Streak ----------

export async function ladeFortschritt(): Promise<Fortschritt> {
  const zeile = pruefe(
    await supabase.from('fortschritt').select('streak, laengster_streak, letzter_tag').maybeSingle(),
  );
  return zeile ?? { streak: 0, laengster_streak: 0, letzter_tag: null };
}

export async function speichereFortschritt(f: Fortschritt): Promise<void> {
  pruefe(await supabase.from('fortschritt').upsert(f, { onConflict: 'user_id' }));
}

// ---------- Boss-Kämpfe ----------

export async function speichereBossErgebnis(b: BossErgebnis): Promise<void> {
  pruefe(await supabase.from('boss_ergebnisse').insert(b));
}

export async function ladeBossErgebnisse(): Promise<(BossErgebnis & { erstellt_am: string })[]> {
  return pruefe(
    await supabase.from('boss_ergebnisse').select('kapitel, punkte, max_punkte, dauer_sek, bestanden, erstellt_am'),
  ) as (BossErgebnis & { erstellt_am: string })[];
}
