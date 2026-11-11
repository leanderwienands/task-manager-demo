// Logik der Täglichen Runde: Auswahl, Bewertung, Spaced Repetition, Handicap, Streak.
// Reine Funktionen ohne Datenbankzugriff, damit sie leicht prüfbar sind.
import type { Aufgabe } from './aufgaben';
import type { Antwort, BunkerEintrag, Ergebnis, Fortschritt, Wiederholung } from './speicher';
import { START_HANDICAP } from './speicher';
import { plusTage, tagVon } from './datum';

export const RUNDE_GROESSE = 9;
const MAX_BUNKER = 3;
const MAX_BUNKER_UND_FAELLIG = 6;
const MAX_SCHWACH = 1;
const MAX_INTERVALL = 60;
export const HANDICAP_MIN = 0;
export const HANDICAP_MAX = 54;

export type Herkunft = 'bunker' | 'faellig' | 'schwach' | 'neu' | 'vorgezogen';

export const HERKUNFT_TEXT: Record<Herkunft, string> = {
  bunker: 'Fehler-Bunker',
  faellig: 'Wiederholung',
  schwach: 'Schwachstelle',
  neu: 'Neu',
  vorgezogen: 'Wiederholung (vorgezogen)',
};

export interface RundenAufgabe {
  aufgabe: Aufgabe;
  herkunft: Herkunft;
}

// ---------- Auswahl ----------

/** Wunsch-Schwierigkeit je Handicap: 36 → 1,5 · 18 → 3,5 · 0 → 5. */
function zielSchwierigkeit(handicap: number): number {
  return Math.min(5, Math.max(1, 1.5 + (START_HANDICAP - handicap) / 9));
}

function mische<T>(liste: T[], zufall: () => number): T[] {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(zufall() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Stellt die Runde zusammen:
 * 0. bis zu 3 Aufgaben aus dem Fehler-Bunker (am längsten drin zuerst),
 * 1. fällige Wiederholungen, bis zusammen mit dem Bunker 6 Plätze belegt sind,
 * 2. 1 Schwachstelle (zuletzt falsch/teils, aber nicht im Bunker und nicht fällig),
 * 3. neue Aufgaben, bevorzugt aus Kapiteln mit hohem Handicap, Schwierigkeit passend zum Handicap,
 * 4. falls dann noch Plätze frei sind: weitere fällige bzw. vorgezogene Wiederholungen.
 * Aufgaben, die heute schon beantwortet wurden, kommen nicht noch einmal.
 */
export function waehleRunde(p: {
  aufgaben: Aufgabe[];
  wiederholungen: Wiederholung[];
  antworten: Antwort[]; // neueste zuerst
  bunker?: BunkerEintrag[];
  handicaps: Record<number, number>;
  heute: string;
  zufall?: () => number;
}): RundenAufgabe[] {
  const zufall = p.zufall ?? Math.random;
  const hc = (k: number) => p.handicaps[k] ?? START_HANDICAP;
  const nachId = new Map(p.aufgaben.map((a) => [a.id, a]));
  const gewaehlt: RundenAufgabe[] = [];
  const vergeben = new Set<string>();
  const frei = () => RUNDE_GROESSE - gewaehlt.length;
  const imBunker = new Set((p.bunker ?? []).map((b) => b.aufgabe_id));
  const nimm = (a: Aufgabe, herkunft: Herkunft) => {
    gewaehlt.push({ aufgabe: a, herkunft: imBunker.has(a.id) ? 'bunker' : herkunft });
    vergeben.add(a.id);
  };

  for (const a of p.antworten) if (tagVon(a.erstellt_am) === p.heute) vergeben.add(a.aufgabe_id);

  const letztesErgebnis = new Map<string, Ergebnis>();
  const fehlerpunkte = new Map<string, number>();
  for (const a of p.antworten) {
    if (!letztesErgebnis.has(a.aufgabe_id)) letztesErgebnis.set(a.aufgabe_id, a.ergebnis);
    const f = a.ergebnis === 'falsch' ? 1 : a.ergebnis === 'teils' ? 0.5 : 0;
    fehlerpunkte.set(a.aufgabe_id, (fehlerpunkte.get(a.aufgabe_id) ?? 0) + f);
  }

  // Wiederholungen nach Fälligkeit sortiert (bei Gleichstand: Kapitel mit höherem Handicap zuerst)
  const wiederholungen = p.wiederholungen
    .filter((w) => nachId.has(w.aufgabe_id))
    .sort((x, y) => x.faellig_am.localeCompare(y.faellig_am) || hc(y.kapitel) - hc(x.kapitel));
  const gesehen = new Set([...p.wiederholungen.map((w) => w.aufgabe_id), ...letztesErgebnis.keys()]);

  // 0. Fehler-Bunker
  const bunker = (p.bunker ?? [])
    .filter((b) => nachId.has(b.aufgabe_id) && !vergeben.has(b.aufgabe_id))
    .sort((x, y) => x.richtig_tage.length - y.richtig_tage.length || x.seit.localeCompare(y.seit));
  for (const b of bunker.slice(0, MAX_BUNKER)) nimm(nachId.get(b.aufgabe_id)!, 'bunker');

  // 1. Fällige
  for (const w of wiederholungen) {
    if (gewaehlt.length >= MAX_BUNKER_UND_FAELLIG) break;
    if (w.faellig_am <= p.heute && !vergeben.has(w.aufgabe_id) && !imBunker.has(w.aufgabe_id)) nimm(nachId.get(w.aufgabe_id)!, 'faellig');
  }

  // 2. Schwachstellen
  const schwach = p.aufgaben
    .filter((a) => !vergeben.has(a.id) && !imBunker.has(a.id) && ['falsch', 'teils'].includes(letztesErgebnis.get(a.id) ?? ''))
    .sort((x, y) => (fehlerpunkte.get(y.id) ?? 0) - (fehlerpunkte.get(x.id) ?? 0) || hc(y.kapitel) - hc(x.kapitel));
  for (const a of schwach.slice(0, Math.min(MAX_SCHWACH, frei()))) nimm(a, 'schwach');

  // 3. Neue Aufgaben, verteilt über die Kapitel
  const neuJeKapitel = new Map<number, Aufgabe[]>();
  for (const a of mische(p.aufgaben, zufall)) {
    if (gesehen.has(a.id) || vergeben.has(a.id)) continue;
    neuJeKapitel.set(a.kapitel, [...(neuJeKapitel.get(a.kapitel) ?? []), a]);
  }
  const jeKapitelInRunde = new Map<number, number>();
  for (const g of gewaehlt) jeKapitelInRunde.set(g.aufgabe.kapitel, (jeKapitelInRunde.get(g.aufgabe.kapitel) ?? 0) + 1);
  while (frei() > 0) {
    const kandidaten = [...neuJeKapitel.entries()].filter(([, l]) => l.length > 0);
    if (kandidaten.length === 0) break;
    // Hohes Handicap zieht, schon viele Aufgaben aus dem Kapitel in der Runde bremsen.
    const bewertet = kandidaten.map((c) => ({ c, wert: hc(c[0]) - 6 * (jeKapitelInRunde.get(c[0]) ?? 0) + zufall() }));
    const [kapitel, liste] = bewertet.reduce((best, b) => (b.wert > best.wert ? b : best)).c;
    const ziel = zielSchwierigkeit(hc(kapitel));
    let besteI = 0;
    liste.forEach((a, i) => {
      if (Math.abs(a.schwierigkeit - ziel) < Math.abs(liste[besteI].schwierigkeit - ziel)) besteI = i;
    });
    nimm(liste.splice(besteI, 1)[0], 'neu');
    jeKapitelInRunde.set(kapitel, (jeKapitelInRunde.get(kapitel) ?? 0) + 1);
  }

  // 4. Auffüllen mit weiteren (auch noch nicht fälligen) Wiederholungen
  for (const w of wiederholungen) {
    if (frei() <= 0) break;
    if (!vergeben.has(w.aufgabe_id))
      nimm(nachId.get(w.aufgabe_id)!, w.faellig_am <= p.heute ? 'faellig' : 'vorgezogen');
  }

  return mische(gewaehlt, zufall);
}

// ---------- Rechenaufgaben prüfen ----------

/** Liest "2,5", "2.5", "-3/4", "40 %" usw. Gibt null zurück, wenn es keine Zahl ist. */
export function leseZahl(text: string): number | null {
  let s = text.trim().replace(/\s+/g, '').replace(/[−–]/g, '-').replace(/,/g, '.');
  if (s === '') return null;
  let faktor = 1;
  if (s.endsWith('%')) {
    faktor = 0.01;
    s = s.slice(0, -1);
  }
  const zahl = /^[+-]?(\d+\.?\d*|\.\d+)$/;
  if (zahl.test(s)) return Number(s) * faktor;
  const bruch = s.split('/');
  if (bruch.length === 2 && zahl.test(bruch[0]) && zahl.test(bruch[1]) && Number(bruch[1]) !== 0)
    return (Number(bruch[0]) / Number(bruch[1])) * faktor;
  return null;
}

/** Toleranz in Prozent vom Sollwert; bei Sollwert 0 gilt sie als absoluter Abstand (1 % → 0,01). */
export function istNah(ist: number, soll: number, toleranzProzent: number): boolean {
  const t = toleranzProzent / 100;
  const erlaubt = soll === 0 ? t : Math.abs(soll) * t;
  return Math.abs(ist - soll) <= erlaubt + 1e-9;
}

/** Alle Werte richtig → richtig, einige → teils, keiner → falsch. */
export function bewerteRechnung(treffer: boolean[]): Ergebnis {
  const n = treffer.filter(Boolean).length;
  return n === treffer.length ? 'richtig' : n > 0 ? 'teils' : 'falsch';
}

// ---------- Spaced Repetition ----------

/**
 * Nächster Termin. Richtig: 2 → 5 → 13 → 33 → 60 Tage. Teils: Abstand wächst kaum.
 * Falsch: morgen wieder, Zähler auf 0.
 */
export function naechsteWiederholung(
  alt: Wiederholung | undefined,
  aufgabe: Aufgabe,
  ergebnis: Ergebnis,
  heute: string,
): Wiederholung {
  const altIntervall = Math.max(1, alt?.intervall_tage ?? 1);
  let wiederholungen = alt?.wiederholungen ?? 0;
  let intervall: number;
  if (ergebnis === 'richtig') {
    wiederholungen += 1;
    intervall = wiederholungen === 1 ? 2 : Math.round(altIntervall * 2.5);
  } else if (ergebnis === 'teils') {
    intervall = Math.round(altIntervall * 1.2);
  } else {
    wiederholungen = 0;
    intervall = 1;
  }
  intervall = Math.min(MAX_INTERVALL, Math.max(1, intervall));
  return {
    aufgabe_id: aufgabe.id,
    kapitel: aufgabe.kapitel,
    intervall_tage: intervall,
    faellig_am: plusTage(heute, intervall),
    wiederholungen,
  };
}

// ---------- Handicap ----------

/**
 * Änderung je Antwort (niedriger = besser):
 * richtig: −0,75 (Schwierigkeit 1) bis −1,75 (Schwierigkeit 5)
 * teils:   −0,25
 * falsch:  +1,5 (Schwierigkeit 1) bis +0,5 (Schwierigkeit 5)
 */
export function handicapAenderung(ergebnis: Ergebnis, schwierigkeit: number): number {
  if (ergebnis === 'richtig') return -(0.5 + 0.25 * schwierigkeit);
  if (ergebnis === 'teils') return -0.25;
  return 1.75 - 0.25 * schwierigkeit;
}

export function neuesHandicap(alt: number, aenderung: number): number {
  const wert = Math.round((alt + aenderung) * 10) / 10;
  return Math.min(HANDICAP_MAX, Math.max(HANDICAP_MIN, wert));
}

// ---------- Streak ----------

/** Streak nach einer abgeschlossenen Runde heute. */
export function fortschrittNachRunde(alt: Fortschritt, heute: string): Fortschritt {
  if (alt.letzter_tag === heute) return alt;
  const streak = alt.letzter_tag === plusTage(heute, -1) ? alt.streak + 1 : 1;
  return { streak, laengster_streak: Math.max(alt.laengster_streak, streak), letzter_tag: heute };
}

/** Angezeigter Streak: verfällt, wenn gestern keine Runde gespielt wurde. */
export function aktuellerStreak(f: Fortschritt, heute: string): number {
  return f.letzter_tag === heute || f.letzter_tag === plusTage(heute, -1) ? f.streak : 0;
}
