// Kleine Einstellungen nur auf diesem Gerät (Browser-Speicher).
// Wenn der Browser-Speicher nicht verfügbar ist (z. B. privates Fenster), gelten die Standardwerte.

const TOLERANZ_KEY = 'mikro1.toleranz';
const RUNDE_KEY = 'mikro1.runde';
const BOSS_KEY = 'mikro1.boss';
export const STANDARD_TOLERANZ = 1;

function lies(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function schreib(key: string, wert: string | null) {
  try {
    if (wert === null) localStorage.removeItem(key);
    else localStorage.setItem(key, wert);
  } catch {
    /* egal */
  }
}

/** Toleranz bei Rechenaufgaben in Prozent. */
export function ladeToleranz(): number {
  const n = Number(lies(TOLERANZ_KEY));
  return Number.isFinite(n) && n > 0 ? n : STANDARD_TOLERANZ;
}
export function speichereToleranz(prozent: number) {
  schreib(TOLERANZ_KEY, String(prozent));
}

/** Angefangene Runde, damit sie nach Neuladen fortgesetzt werden kann. */
export interface LaufendeRunde {
  datum: string;
  aufgaben: { id: string; herkunft: string }[];
  ergebnisse: { id: string; ergebnis: string }[];
  handicapStart: Record<number, number>;
}

export function ladeLaufendeRunde(): LaufendeRunde | null {
  try {
    return JSON.parse(lies(RUNDE_KEY) ?? 'null') as LaufendeRunde | null;
  } catch {
    return null;
  }
}
export function speichereLaufendeRunde(r: LaufendeRunde | null) {
  schreib(RUNDE_KEY, r ? JSON.stringify(r) : null);
}

/** Laufender Boss-Kampf (Timer läuft auch weiter, wenn die Seite neu geladen wird). */
export interface LaufenderBoss {
  kapitel: number;
  ids: string[];
  /** Reihenfolge der Antwortmöglichkeiten bei Multiple Choice */
  optionen: Record<string, string[]>;
  start: number; // ms
  limitSek: number;
  index: number;
  antworten: Record<string, { zahlen?: string[]; text?: string; wahl?: string }>;
  abgegeben: number | null; // ms
  korrekturIndex: number;
  selbst: Record<string, 'richtig' | 'teils' | 'falsch'>;
  gespeichert: { antworten: boolean; folgen: string[]; boss: boolean };
  test: boolean;
}

export function ladeLaufendenBoss(): LaufenderBoss | null {
  try {
    return JSON.parse(lies(BOSS_KEY) ?? 'null') as LaufenderBoss | null;
  } catch {
    return null;
  }
}
export function speichereLaufendenBoss(b: LaufenderBoss | null) {
  schreib(BOSS_KEY, b ? JSON.stringify(b) : null);
}

/** Testmodus: Adresse mit ?bosstest öffnen. Schaltet alle Bosse frei, nichts wird gespeichert. */
export function bossTestModus(): boolean {
  try {
    return new URLSearchParams(window.location.search).has('bosstest');
  } catch {
    return false;
  }
}
