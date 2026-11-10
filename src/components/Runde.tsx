import { useEffect, useState } from 'react';
import { AUFGABEN, KAPITEL } from '../lib/aufgaben';
import { heute } from '../lib/datum';
import {
  ladeLaufendeRunde,
  ladeToleranz,
  speichereLaufendeRunde,
  type LaufendeRunde,
} from '../lib/einstellungen';
import {
  HERKUNFT_TEXT,
  RUNDE_GROESSE,
  fortschrittNachRunde,
  handicapAenderung,
  naechsteWiederholung,
  neuesHandicap,
  waehleRunde,
  type Herkunft,
  type RundenAufgabe,
} from '../lib/runde';
import {
  START_HANDICAP,
  initialisiereHandicaps,
  ladeAntworten,
  ladeFortschritt,
  ladeHandicaps,
  ladeWiederholungen,
  speichereAntwort,
  speichereFortschritt,
  speichereHandicap,
  speichereWiederholung,
  type Ergebnis,
  type Fortschritt,
  type Wiederholung,
} from '../lib/speicher';
import { AufgabeKarte } from './AufgabeKarte';

const nachId = new Map(AUFGABEN.map((a) => [a.id, a]));
const kapitelTitel = (nr: number) => KAPITEL.find((k) => k.nr === nr)?.titel ?? `Kapitel ${nr}`;

function fehlertext(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

interface Stand {
  datum: string;
  aufgaben: RundenAufgabe[];
  ergebnisse: { id: string; ergebnis: Ergebnis }[];
  handicapStart: Record<number, number>;
}

export function Runde({ onZurueck }: { onZurueck: () => void }) {
  const [stand, setStand] = useState<Stand | null>(null);
  const [index, setIndex] = useState(0);
  const [handicaps, setHandicaps] = useState<Record<number, number>>({});
  const [wiederholungen, setWiederholungen] = useState<Map<string, Wiederholung>>(new Map());
  const [fortschritt, setFortschritt] = useState<Fortschritt | null>(null);
  const [fertig, setFertig] = useState<Fortschritt | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [toleranz] = useState(ladeToleranz);

  // Laden und Runde zusammenstellen (oder angefangene Runde fortsetzen)
  useEffect(() => {
    (async () => {
      try {
        await initialisiereHandicaps();
        const [h, w, a, f] = await Promise.all([
          ladeHandicaps(),
          ladeWiederholungen(),
          ladeAntworten(),
          ladeFortschritt(),
        ]);
        setHandicaps(h);
        setWiederholungen(new Map(w.map((x) => [x.aufgabe_id, x])));
        setFortschritt(f);

        const tag = heute();
        const gemerkt = ladeLaufendeRunde();
        let neu: Stand;
        if (
          gemerkt &&
          gemerkt.datum === tag &&
          gemerkt.aufgaben.every((x) => nachId.has(x.id)) &&
          gemerkt.ergebnisse.length < gemerkt.aufgaben.length
        ) {
          neu = {
            datum: tag,
            aufgaben: gemerkt.aufgaben.map((x) => ({ aufgabe: nachId.get(x.id)!, herkunft: x.herkunft as Herkunft })),
            ergebnisse: gemerkt.ergebnisse as Stand['ergebnisse'],
            handicapStart: gemerkt.handicapStart,
          };
        } else {
          neu = {
            datum: tag,
            aufgaben: waehleRunde({ aufgaben: AUFGABEN, wiederholungen: w, antworten: a, handicaps: h, heute: tag }),
            ergebnisse: [],
            handicapStart: h,
          };
        }
        merke(neu);
        setStand(neu);
        setIndex(neu.ergebnisse.length);
      } catch (e) {
        setFehler(fehlertext(e));
      }
    })();
  }, []);

  function merke(s: Stand | null) {
    const r: LaufendeRunde | null = s && {
      datum: s.datum,
      aufgaben: s.aufgaben.map((x) => ({ id: x.aufgabe.id, herkunft: x.herkunft })),
      ergebnisse: s.ergebnisse,
      handicapStart: s.handicapStart,
    };
    speichereLaufendeRunde(r);
  }

  async function bewerte(ergebnis: Ergebnis, eingabe: unknown): Promise<boolean> {
    if (!stand) return false;
    const { aufgabe } = stand.aufgaben[index];
    const tag = heute();
    const wNeu = naechsteWiederholung(wiederholungen.get(aufgabe.id), aufgabe, ergebnis, tag);
    const hAlt = handicaps[aufgabe.kapitel] ?? START_HANDICAP;
    const hNeu = neuesHandicap(hAlt, handicapAenderung(ergebnis, aufgabe.schwierigkeit));
    setSpeichert(true);
    setFehler(null);
    try {
      // Schon gespeichert (z. B. zweiter Versuch nach Teilfehler)? Dann Antwort nicht doppelt eintragen.
      const schonDa = stand.ergebnisse.length > index;
      if (!schonDa) await speichereAntwort({ aufgabe_id: aufgabe.id, kapitel: aufgabe.kapitel, modus: 'runde', ergebnis, eingabe });
      const ergebnisse = schonDa ? stand.ergebnisse : [...stand.ergebnisse, { id: aufgabe.id, ergebnis }];
      const zwischen = { ...stand, ergebnisse };
      setStand(zwischen);
      merke(zwischen);
      await Promise.all([speichereWiederholung(wNeu), speichereHandicap(aufgabe.kapitel, hNeu)]);
      setWiederholungen(new Map(wiederholungen).set(aufgabe.id, wNeu));
      setHandicaps({ ...handicaps, [aufgabe.kapitel]: hNeu });

      if (ergebnisse.length === stand.aufgaben.length && fortschritt) {
        const f = fortschrittNachRunde(fortschritt, tag);
        await speichereFortschritt(f);
        setFortschritt(f);
        setFertig(f);
        merke(null);
      }
      return true;
    } catch (e) {
      setFehler(fehlertext(e));
      return false;
    } finally {
      setSpeichert(false);
    }
  }

  function weiter() {
    if (!stand) return;
    setIndex(index + 1);
    window.scrollTo(0, 0);
  }

  if (!stand)
    return (
      <main className="seite">
        {fehler ? (
          <>
            <p className="meldung">Runde konnte nicht geladen werden: {fehler}</p>
            <button onClick={onZurueck}>Zurück</button>
          </>
        ) : (
          <p>Runde wird zusammengestellt …</p>
        )}
      </main>
    );

  if (stand.aufgaben.length === 0)
    return (
      <main className="seite">
        <p>Für heute gibt es keine Aufgaben mehr. Du hast alles bearbeitet.</p>
        <button onClick={onZurueck}>Zur Startseite</button>
      </main>
    );

  // ---------- Zusammenfassung ----------
  if (index >= stand.aufgaben.length) {
    const zaehle = (e: Ergebnis) => stand.ergebnisse.filter((x) => x.ergebnis === e).length;
    const kapitelInRunde = [...new Set(stand.aufgaben.map((x) => x.aufgabe.kapitel))].sort((a, b) => a - b);
    return (
      <main className="seite">
        <h1>Runde geschafft</h1>
        <section className="karte">
          <p className="gross">
            {zaehle('richtig')} richtig · {zaehle('teils')} teils · {zaehle('falsch')} falsch
          </p>
          {fertig && <p>Streak: {fertig.streak} {fertig.streak === 1 ? 'Tag' : 'Tage'}</p>}
        </section>
        <section className="karte">
          <h2>Handicap</h2>
          <ul className="liste">
            {kapitelInRunde.map((k) => {
              const alt = stand.handicapStart[k] ?? START_HANDICAP;
              const neu = handicaps[k] ?? alt;
              const diff = Math.round((neu - alt) * 10) / 10;
              return (
                <li key={k}>
                  <span>
                    {k}. {kapitelTitel(k)}
                  </span>
                  <span className="zahl">
                    {alt.toLocaleString('de-DE')} → <strong>{neu.toLocaleString('de-DE')}</strong>{' '}
                    <span className={diff < 0 ? 'treffer' : diff > 0 ? 'daneben' : 'klein'}>
                      ({diff > 0 ? '+' : ''}
                      {diff.toLocaleString('de-DE')})
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
        <button onClick={onZurueck}>Zur Startseite</button>
      </main>
    );
  }

  // ---------- Aktuelle Aufgabe ----------
  const aktuell = stand.aufgaben[index];
  const a = aktuell.aufgabe;
  return (
    <main className="seite">
      <header className="kopf">
        <span>
          Aufgabe {index + 1} / {stand.aufgaben.length}
        </span>
        <button className="link" onClick={onZurueck}>
          Pause
        </button>
      </header>
      <div className="balken" aria-hidden>
        <div style={{ width: `${(index / Math.max(stand.aufgaben.length, RUNDE_GROESSE)) * 100}%` }} />
      </div>
      <p className="klein">
        Kapitel {a.kapitel}: {kapitelTitel(a.kapitel)} · {HERKUNFT_TEXT[aktuell.herkunft]} · Schwierigkeit{' '}
        {'●'.repeat(a.schwierigkeit)}
        {'○'.repeat(5 - a.schwierigkeit)}
      </p>
      <AufgabeKarte
        key={a.id}
        aufgabe={a}
        toleranz={toleranz}
        speichert={speichert}
        onBewerte={bewerte}
        onWeiter={weiter}
      />
      {fehler && <p className="meldung">Speichern fehlgeschlagen: {fehler}</p>}
    </main>
  );
}
