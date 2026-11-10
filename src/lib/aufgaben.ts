import daten from '../data/aufgaben.json';

export type AufgabenTyp = 'rechnen' | 'freitext' | 'herleitung' | 'multiple_choice';

export interface Aufgabe {
  id: string;
  kapitel: number;
  typ: AufgabenTyp;
  aufgabentext: string;
  loesung: string;
  loesungsweg: string;
  schwierigkeit: number;
  quelle: { datei: string; seite: number };
  check: boolean;
  /** Nur bei Typ "rechnen": erwartete Zahlen für den Vergleich mit Toleranz. */
  werte?: { label: string; wert: number }[];
  /** Nur bei Typ "multiple_choice". */
  optionen?: string[];
}

export interface Kapitel {
  nr: number;
  titel: string;
}

export const KAPITEL: Kapitel[] = daten.kapitel;
export const AUFGABEN: Aufgabe[] = daten.aufgaben as Aufgabe[];
