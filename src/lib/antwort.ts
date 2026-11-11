// Was nach jeder Antwort gespeichert wird – gemeinsam für Tägliche Runde und Bunker-Training.
import { AUFGABEN, type Aufgabe } from './aufgaben';
import { bunkerAusHistorie, bunkerNachAntwort, type BunkerFolge } from './bunker';
import { naechsteWiederholung } from './runde';
import {
  entferneAusBunker,
  ladeBunker,
  speichereBunkerEintraege,
  speichereBunkerEintrag,
  speichereWiederholung,
  type Antwort,
  type BunkerEintrag,
  type Ergebnis,
  type Wiederholung,
} from './speicher';

const nachId = new Map(AUFGABEN.map((a) => [a.id, a]));

/**
 * Speichert Wiederholungstermin und Bunker-Änderung. Kann gefahrlos wiederholt werden
 * (z. B. nach einem Verbindungsfehler), weil nur Endzustände geschrieben werden.
 */
export async function verbucheFolgen(p: {
  aufgabe: Aufgabe;
  ergebnis: Ergebnis;
  heute: string;
  wiederholung: Wiederholung | undefined;
  bunker: BunkerEintrag | undefined;
}): Promise<{ wiederholung: Wiederholung; bunker: BunkerFolge }> {
  const wiederholung = naechsteWiederholung(p.wiederholung, p.aufgabe, p.ergebnis, p.heute);
  const bunker = bunkerNachAntwort(p.bunker, p.aufgabe, p.ergebnis, p.heute);
  await Promise.all([
    speichereWiederholung(wiederholung),
    bunker.art === 'rein' || bunker.art === 'fortschritt'
      ? speichereBunkerEintrag({
          aufgabe_id: bunker.eintrag.aufgabe_id,
          kapitel: bunker.eintrag.kapitel,
          richtig_tage: bunker.eintrag.richtig_tage,
        })
      : bunker.art === 'raus'
        ? entferneAusBunker(p.aufgabe.id)
        : Promise.resolve(),
  ]);
  return { wiederholung, bunker };
}

/** Wendet eine Bunker-Folge auf die lokale Liste an. */
export function wendeBunkerFolgeAn(
  bunker: Map<string, BunkerEintrag>,
  aufgabeId: string,
  folge: BunkerFolge,
): Map<string, BunkerEintrag> {
  const neu = new Map(bunker);
  if (folge.art === 'rein' || folge.art === 'fortschritt')
    neu.set(aufgabeId, { ...folge.eintrag, seit: bunker.get(aufgabeId)?.seit ?? folge.eintrag.seit });
  else if (folge.art === 'raus') neu.delete(aufgabeId);
  return neu;
}

/**
 * Lädt den Bunker und ergänzt fehlende Einträge aus der Antworthistorie
 * (Fehler aus Runden, bevor es den Bunker gab).
 */
export async function ladeBunkerAbgeglichen(antworten: Antwort[]): Promise<Map<string, BunkerEintrag>> {
  // Einträge zu gelöschten Aufgaben ignorieren
  const gespeichert = new Map((await ladeBunker()).filter((e) => nachId.has(e.aufgabe_id)).map((e) => [e.aufgabe_id, e]));
  const fehlend = [...bunkerAusHistorie(antworten, nachId).values()].filter((e) => !gespeichert.has(e.aufgabe_id));
  if (fehlend.length > 0) {
    await speichereBunkerEintraege(fehlend);
    for (const e of fehlend) gespeichert.set(e.aufgabe_id, e);
  }
  return gespeichert;
}
