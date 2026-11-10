import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { KAPITEL, AUFGABEN } from '../lib/aufgaben';
import {
  initialisiereHandicaps,
  ladeFortschritt,
  ladeHandicaps,
  ladeWiederholungen,
  type Fortschritt,
} from '../lib/speicher';
import { heute } from '../lib/datum';
import { aktuellerStreak } from '../lib/runde';
import { ladeLaufendeRunde, ladeToleranz, speichereToleranz } from '../lib/einstellungen';

export function Start({ email, onRunde }: { email: string; onRunde: () => void }) {
  const [handicaps, setHandicaps] = useState<Record<number, number> | null>(null);
  const [fortschritt, setFortschritt] = useState<Fortschritt | null>(null);
  const [faellig, setFaellig] = useState<number | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [toleranz, setToleranz] = useState(ladeToleranz);
  const tag = heute();
  const laufend = ladeLaufendeRunde();
  const fortsetzen = laufend && laufend.datum === tag ? laufend : null;
  const heuteGeschafft = fortschritt?.letzter_tag === tag;

  useEffect(() => {
    (async () => {
      try {
        await initialisiereHandicaps();
        const [h, f, w] = await Promise.all([ladeHandicaps(), ladeFortschritt(), ladeWiederholungen()]);
        setHandicaps(h);
        setFortschritt(f);
        setFaellig(w.filter((x) => x.faellig_am <= heute()).length);
      } catch (e) {
        setFehler(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  return (
    <main className="seite">
      <header className="kopf">
        <h1>Mikro 1 Training</h1>
        <button className="link" onClick={() => supabase.auth.signOut()}>
          Abmelden
        </button>
      </header>
      <p className="klein">Angemeldet als {email}</p>

      {fehler && (
        <p className="meldung">
          Daten konnten nicht geladen werden: {fehler}
          <br />
          Wurde <code>supabase/schema.sql</code> im SQL-Editor ausgeführt?
        </p>
      )}

      <section className="karte">
        <h2>Tägliche Runde</h2>
        <p>
          {heuteGeschafft
            ? 'Heute geschafft ✓ Eine Extra-Runde zählt für Wiederholung und Handicap, nicht noch einmal für den Streak.'
            : '9 Aufgaben: fällige Wiederholungen, Schwachstellen und neue Aufgaben.'}
        </p>
        {faellig !== null && (
          <p className="klein">
            Heute fällig: {faellig} {faellig === 1 ? 'Wiederholung' : 'Wiederholungen'}
          </p>
        )}
        <button onClick={onRunde} disabled={!!fehler || !fortschritt}>
          {fortsetzen
            ? `Runde fortsetzen (${fortsetzen.ergebnisse.length}/${fortsetzen.aufgaben.length})`
            : heuteGeschafft
              ? 'Extra-Runde starten'
              : 'Runde starten'}
        </button>
      </section>

      <section className="karte">
        <h2>Streak</h2>
        <p className="gross">{fortschritt ? `${aktuellerStreak(fortschritt, tag)} Tage` : '…'}</p>
        {fortschritt && <p className="klein">Längster Streak: {fortschritt.laengster_streak} Tage</p>}
      </section>

      <section className="karte">
        <h2>Handicap je Kapitel</h2>
        <ul className="liste">
          {KAPITEL.map((k) => (
            <li key={k.nr}>
              <span>
                {k.nr}. {k.titel}
                <span className="klein"> · {AUFGABEN.filter((a) => a.kapitel === k.nr).length} Aufgaben</span>
              </span>
              <strong>{handicaps ? (handicaps[k.nr] ?? '–') : '…'}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section className="karte">
        <h2>Einstellungen</h2>
        <label>
          Toleranz bei Rechenaufgaben (in %)
          <input
            type="number"
            inputMode="decimal"
            min={0.1}
            max={20}
            step={0.1}
            value={toleranz}
            onChange={(e) => {
              const n = Number(e.target.value);
              setToleranz(n);
              if (n > 0) speichereToleranz(n);
            }}
          />
        </label>
        <p className="klein">
          Beispiel: Bei 1 % gilt für die Lösung 200 alles zwischen 198 und 202 als richtig. Gilt nur auf diesem Gerät.
        </p>
      </section>
    </main>
  );
}
