// Boss-Kampf: Klausur am Kapitelende mit Zeitlimit. Frei ab Handicap unter 18 im Kapitel.
import type { Aufgabe } from './aufgaben';
import type { Ergebnis } from './speicher';

export const BOSS_FREI_UNTER = 18;
export const BOSS_AUFGABEN = 5;
export const BESTEHEN_AB = 0.5; // 50 % der Punkte

/** Punkte je Aufgabe: 2 × Schwierigkeit. */
export function punkteFuer(a: Aufgabe): number {
  return 2 * a.schwierigkeit;
}

/** Minuten je Aufgabe: 2 × Schwierigkeit + 2 (Schwierigkeit 3 → 8 Minuten). */
export function minutenFuer(a: Aufgabe): number {
  return 2 * a.schwierigkeit + 2;
}

export function bossFrei(handicap: number | undefined): boolean {
  return handicap !== undefined && handicap < BOSS_FREI_UNTER;
}

/** Erreichte Punkte: richtig voll, teils halb, falsch 0. */
export function erreichtePunkte(a: Aufgabe, e: Ergebnis): number {
  return e === 'richtig' ? punkteFuer(a) : e === 'teils' ? punkteFuer(a) / 2 : 0;
}

/**
 * Wählt die Klausuraufgaben eines Kapitels:
 * bevorzugt Altklausuren (Dateiname enthält „Klausur“), dann Übungsblätter,
 * geprüfte Aufgaben, höhere Schwierigkeit; Multiple Choice nur als Notlösung.
 * Gleiche Aufgabentypen hintereinander werden abgewertet, damit es gemischt bleibt.
 */
export function waehleBoss(aufgaben: Aufgabe[], kapitel: number, zufall: () => number = Math.random): Aufgabe[] {
  const pool = aufgaben
    .filter((a) => a.kapitel === kapitel)
    .map((a) => {
      const datei = a.quelle.datei.toLowerCase();
      const wert =
        (datei.includes('klausur') ? 100 : 0) +
        (datei.startsWith('übung') ? 10 : 0) +
        (a.check ? 0 : 5) +
        4 * a.schwierigkeit +
        (a.typ === 'multiple_choice' ? -50 : 0) +
        4 * zufall();
      return { a, wert };
    });
  const gewaehlt: Aufgabe[] = [];
  const jeTyp = new Map<string, number>();
  while (gewaehlt.length < BOSS_AUFGABEN && pool.length > 0) {
    let besteI = 0;
    let besterWert = -Infinity;
    pool.forEach((p, i) => {
      const w = p.wert - 6 * (jeTyp.get(p.a.typ) ?? 0);
      if (w > besterWert) {
        besterWert = w;
        besteI = i;
      }
    });
    const [{ a }] = pool.splice(besteI, 1);
    gewaehlt.push(a);
    jeTyp.set(a.typ, (jeTyp.get(a.typ) ?? 0) + 1);
  }
  // Wie in einer Klausur: leichtere Aufgaben zuerst
  return gewaehlt.sort((x, y) => x.schwierigkeit - y.schwierigkeit);
}
