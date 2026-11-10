import { useEffect, useState } from 'react';
import { AUFGABEN, KAPITEL } from '../lib/aufgaben';
import { heute, tagVon } from '../lib/datum';
import { RAUS_NACH_TAGEN } from '../lib/bunker';
import { ladeBunkerAbgeglichen, verbucheFolgen, wendeBunkerFolgeAn } from '../lib/antwort';
import { ladeToleranz } from '../lib/einstellungen';
import {
  ladeAntworten,
  ladeWiederholungen,
  speichereAntwort,
  type BunkerEintrag,
  type Ergebnis,
  type Wiederholung,
} from '../lib/speicher';
import { AufgabeKarte } from './AufgabeKarte';
import { Mathe } from './Mathe';

const nachId = new Map(AUFGABEN.map((a) => [a.id, a]));
const kapitelTitel = (nr: number) => KAPITEL.find((k) => k.nr === nr)?.titel ?? `Kapitel ${nr}`;

function mische<T>(liste: T[]): T[] {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function datumKurz(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' });
}

interface Training {
  ids: string[];
  index: number;
  ergebnisse: Ergebnis[];
  befreit: number;
}

export function Bunker({ onZurueck }: { onZurueck: () => void }) {
  const [bunker, setBunker] = useState<Map<string, BunkerEintrag> | null>(null);
  const [wiederholungen, setWiederholungen] = useState<Map<string, Wiederholung>>(new Map());
  const [heuteBearbeitet, setHeuteBearbeitet] = useState<Set<string>>(new Set());
  const [training, setTraining] = useState<Training | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [toleranz] = useState(ladeToleranz);

  useEffect(() => {
    (async () => {
      try {
        const [a, w] = await Promise.all([ladeAntworten(), ladeWiederholungen()]);
        const tag = heute();
        setHeuteBearbeitet(new Set(a.filter((x) => tagVon(x.erstellt_am) === tag).map((x) => x.aufgabe_id)));
        setWiederholungen(new Map(w.map((x) => [x.aufgabe_id, x])));
        setBunker(await ladeBunkerAbgeglichen(a));
      } catch (e) {
        setFehler(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  if (!bunker)
    return (
      <main className="seite">
        {fehler ? (
          <>
            <p className="meldung">Bunker konnte nicht geladen werden: {fehler}</p>
            <button onClick={onZurueck}>Zurück</button>
          </>
        ) : (
          <p>Lädt …</p>
        )}
      </main>
    );

  const eintraege = [...bunker.values()]
    .filter((e) => nachId.has(e.aufgabe_id))
    .sort((x, y) => x.kapitel - y.kapitel || x.seit.localeCompare(y.seit));
  const trainierbar = eintraege.filter((e) => !heuteBearbeitet.has(e.aufgabe_id));

  // ---------- Training ----------
  if (training && training.index < training.ids.length) {
    const t = training;
    const aufgabe = nachId.get(t.ids[t.index])!;

    async function bewerte(ergebnis: Ergebnis, eingabe: unknown): Promise<boolean> {
      const tag = heute();
      setSpeichert(true);
      setFehler(null);
      try {
        const schonDa = t.ergebnisse.length > t.index;
        if (!schonDa)
          await speichereAntwort({ aufgabe_id: aufgabe.id, kapitel: aufgabe.kapitel, modus: 'bunker', ergebnis, eingabe });
        const ergebnisse = schonDa ? t.ergebnisse : [...t.ergebnisse, ergebnis];
        setTraining((alt) => alt && { ...alt, ergebnisse });
        setHeuteBearbeitet(new Set(heuteBearbeitet).add(aufgabe.id));
        const folgen = await verbucheFolgen({
          aufgabe,
          ergebnis,
          heute: tag,
          wiederholung: wiederholungen.get(aufgabe.id),
          bunker: bunker!.get(aufgabe.id),
        });
        setWiederholungen(new Map(wiederholungen).set(aufgabe.id, folgen.wiederholung));
        setBunker(wendeBunkerFolgeAn(bunker!, aufgabe.id, folgen.bunker));
        if (folgen.bunker.art === 'raus') setTraining((alt) => alt && { ...alt, befreit: alt.befreit + 1 });
        return true;
      } catch (e) {
        setFehler(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setSpeichert(false);
      }
    }

    return (
      <main className="seite">
        <header className="kopf">
          <span>
            Bunker {t.index + 1} / {t.ids.length}
          </span>
          <button className="link" onClick={() => setTraining(null)}>
            Pause
          </button>
        </header>
        <div className="balken" aria-hidden>
          <div style={{ width: `${(t.index / t.ids.length) * 100}%` }} />
        </div>
        <p className="klein">
          Kapitel {aufgabe.kapitel}: {kapitelTitel(aufgabe.kapitel)} ·{' '}
          {bunker.has(aufgabe.id)
            ? `Richtige Tage: ${bunker.get(aufgabe.id)!.richtig_tage.length}/${RAUS_NACH_TAGEN}`
            : 'Befreit ✓'}
        </p>
        <AufgabeKarte
          key={aufgabe.id}
          aufgabe={aufgabe}
          toleranz={toleranz}
          speichert={speichert}
          onBewerte={bewerte}
          onWeiter={() => {
            setTraining((alt) => alt && { ...alt, index: alt.index + 1 });
            window.scrollTo(0, 0);
          }}
        />
        {fehler && <p className="meldung">Speichern fehlgeschlagen: {fehler}</p>}
      </main>
    );
  }

  // ---------- Übersicht (und Ergebnis nach dem Training) ----------
  const zaehle = (e: Ergebnis) => training?.ergebnisse.filter((x) => x === e).length ?? 0;
  return (
    <main className="seite">
      <header className="kopf">
        <h1>Fehler-Bunker</h1>
        <button className="link" onClick={onZurueck}>
          Zurück
        </button>
      </header>

      {training && (
        <section className="karte">
          <h2>Training beendet</h2>
          <p className="gross">
            {zaehle('richtig')} richtig · {zaehle('teils')} teils · {zaehle('falsch')} falsch
          </p>
          <p>
            {training.befreit > 0
              ? `${training.befreit} ${training.befreit === 1 ? 'Aufgabe' : 'Aufgaben'} befreit.`
              : 'Heute niemand befreit. Richtige Antworten zählen trotzdem als erster Tag.'}
          </p>
        </section>
      )}

      <section className="karte">
        <p className="klein">
          Hier landet jede Aufgabe, die du falsch beantwortest. Raus kommt sie nach {RAUS_NACH_TAGEN} richtigen
          Antworten an verschiedenen Tagen. Eine falsche Antwort setzt den Fortschritt auf 0. Bunker-Aufgaben kommen
          auch in der Täglichen Runde (bis zu 3 pro Runde).
        </p>
        <p className="gross">
          {eintraege.length} {eintraege.length === 1 ? 'Aufgabe' : 'Aufgaben'}
        </p>
        {eintraege.length > 0 && (
          <>
            <button
              disabled={trainierbar.length === 0}
              onClick={() =>
                setTraining({ ids: mische(trainierbar.map((e) => e.aufgabe_id)), index: 0, ergebnisse: [], befreit: 0 })
              }
            >
              {trainierbar.length > 0 ? `Training starten (${trainierbar.length})` : 'Für heute alles bearbeitet'}
            </button>
            {trainierbar.length < eintraege.length && (
              <p className="klein">
                {eintraege.length - trainierbar.length} heute schon bearbeitet. Die zählen erst morgen wieder, weil die
                richtigen Antworten an verschiedenen Tagen kommen müssen.
              </p>
            )}
          </>
        )}
      </section>

      {eintraege.length > 0 && (
        <section className="karte">
          <h2>Im Bunker</h2>
          <ul className="liste">
            {eintraege.map((e) => {
              const a = nachId.get(e.aufgabe_id)!;
              return (
                <li key={e.aufgabe_id} className="bunker-eintrag">
                  <div>
                    <p className="klein">
                      Kapitel {a.kapitel} · seit {datumKurz(e.seit)}
                      {heuteBearbeitet.has(a.id) && ' · heute bearbeitet'}
                    </p>
                    <p className="kurztext">
                      <Mathe text={a.aufgabentext} />
                    </p>
                  </div>
                  <span className="zahl punkte" title="Richtige Tage">
                    {'●'.repeat(Math.min(e.richtig_tage.length, RAUS_NACH_TAGEN))}
                    {'○'.repeat(Math.max(0, RAUS_NACH_TAGEN - e.richtig_tage.length))}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
