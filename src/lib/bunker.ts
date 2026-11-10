// Fehler-Bunker: falsche Aufgaben kommen häufiger zurück.
// Rein: jede falsche Antwort (egal in welchem Modus).
// Raus: nach 2 richtigen Antworten an verschiedenen Tagen.
// Eine falsche Antwort im Bunker setzt den Fortschritt auf 0 zurück.
import type { Aufgabe } from './aufgaben';
import type { Antwort, BunkerEintrag, Ergebnis } from './speicher';
import { tagVon } from './datum';

export const RAUS_NACH_TAGEN = 2;

export type BunkerFolge =
  | { art: 'rein'; eintrag: BunkerEintrag } // neu im Bunker oder Fortschritt zurückgesetzt
  | { art: 'fortschritt'; eintrag: BunkerEintrag } // richtig, aber noch nicht raus
  | { art: 'raus' }
  | { art: 'nichts' };

export function bunkerNachAntwort(
  alt: BunkerEintrag | undefined,
  aufgabe: Aufgabe,
  ergebnis: Ergebnis,
  heute: string,
): BunkerFolge {
  if (ergebnis === 'falsch')
    return {
      art: 'rein',
      eintrag: { aufgabe_id: aufgabe.id, kapitel: aufgabe.kapitel, seit: alt?.seit ?? new Date().toISOString(), richtig_tage: [] },
    };
  if (!alt || ergebnis === 'teils') return { art: 'nichts' };
  const tage = alt.richtig_tage.includes(heute) ? alt.richtig_tage : [...alt.richtig_tage, heute];
  if (tage.length >= RAUS_NACH_TAGEN) return { art: 'raus' };
  return { art: 'fortschritt', eintrag: { ...alt, richtig_tage: tage } };
}

/**
 * Spielt die Antworthistorie nach denselben Regeln ab.
 * Damit kommen auch Fehler aus der Zeit vor dem Bunker nachträglich hinein.
 */
export function bunkerAusHistorie(antworten: Antwort[], nachId: Map<string, Aufgabe>): Map<string, BunkerEintrag> {
  const bunker = new Map<string, BunkerEintrag>();
  const chronologisch = [...antworten].sort((a, b) => a.erstellt_am.localeCompare(b.erstellt_am));
  for (const a of chronologisch) {
    const aufgabe = nachId.get(a.aufgabe_id);
    if (!aufgabe) continue;
    const folge = bunkerNachAntwort(bunker.get(a.aufgabe_id), aufgabe, a.ergebnis, tagVon(a.erstellt_am));
    if (folge.art === 'rein' && !bunker.has(a.aufgabe_id)) folge.eintrag.seit = a.erstellt_am;
    if (folge.art === 'rein' || folge.art === 'fortschritt') bunker.set(a.aufgabe_id, folge.eintrag);
    else if (folge.art === 'raus') bunker.delete(a.aufgabe_id);
  }
  return bunker;
}

/** Tage mit richtiger Antwort, z. B. "1/2". */
export function bunkerStand(e: BunkerEintrag): string {
  return `${Math.min(e.richtig_tage.length, RAUS_NACH_TAGEN)}/${RAUS_NACH_TAGEN}`;
}
