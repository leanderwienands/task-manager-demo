import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { KAPITEL, AUFGABEN } from '../lib/aufgaben';
import { initialisiereHandicaps, ladeFortschritt, ladeHandicaps, type Fortschritt } from '../lib/speicher';

export function Start({ email }: { email: string }) {
  const [handicaps, setHandicaps] = useState<Record<number, number> | null>(null);
  const [fortschritt, setFortschritt] = useState<Fortschritt | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await initialisiereHandicaps();
        const [h, f] = await Promise.all([ladeHandicaps(), ladeFortschritt()]);
        setHandicaps(h);
        setFortschritt(f);
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
        <h2>Streak</h2>
        <p className="gross">{fortschritt ? `${fortschritt.streak} Tage` : '…'}</p>
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
    </main>
  );
}
