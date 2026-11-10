// Kleine Einstellungen nur auf diesem Gerät (Browser-Speicher).
// Wenn der Browser-Speicher nicht verfügbar ist (z. B. privates Fenster), gelten die Standardwerte.

const TOLERANZ_KEY = 'mikro1.toleranz';
const RUNDE_KEY = 'mikro1.runde';
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
