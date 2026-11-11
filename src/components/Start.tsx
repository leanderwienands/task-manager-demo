import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { KAPITEL, AUFGABEN } from '../lib/aufgaben';
import {
  initialisiereHandicaps,
  ladeFortschritt,
  ladeAntworten,
  ladeBossErgebnisse,
  ladeHandicaps,
  ladeWiederholungen,
  START_HANDICAP,
  zaehleAntworten,
  type Ergebnis,
  type Fortschritt,
} from '../lib/speicher';
import { heute } from '../lib/datum';
import { HANDICAP_MAX, aktuellerStreak } from '../lib/runde';
import { ladeBunkerAbgeglichen } from '../lib/antwort';
import {
  bossTestModus,
  ladeLaufendenBoss,
  ladeLaufendeRunde,
  ladeToleranz,
  speichereToleranz,
} from '../lib/einstellungen';
import { BOSS_FREI_UNTER, bossFrei } from '../lib/boss';

export function Start({
  email,
  onRunde,
  onBunker,
  onBoss,
}: {
  email: string;
  onRunde: () => void;
  onBunker: () => void;
  onBoss: (kapitel: number) => void;
}) {
  const [handicaps, setHandicaps] = useState<Record<number, number> | null>(null);
  const [fortschritt, setFortschritt] = useState<Fortschritt | null>(null);
  const [faellig, setFaellig] = useState<number | null>(null);
  const [statistik, setStatistik] = useState<Record<Ergebnis, number> | null>(null);
  const [gesehen, setGesehen] = useState<number | null>(null);
  const [imBunker, setImBunker] = useState<number | null>(null);
  const [bossBilanz, setBossBilanz] = useState<Record<number, { versuche: number; bestanden: boolean; bestProzent: number }>>(
    {},
  );
  const test = bossTestModus();
  const laufenderBoss = ladeLaufendenBoss();
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
        const [h, f, w, a] = await Promise.all([
          ladeHandicaps(),
          ladeFortschritt(),
          ladeWiederholungen(),
          ladeAntworten(),
        ]);
        setImBunker((await ladeBunkerAbgeglichen(a)).size);
        const bilanz: typeof bossBilanz = {};
        for (const e of await ladeBossErgebnisse()) {
          const alt = bilanz[e.kapitel] ?? { versuche: 0, bestanden: false, bestProzent: 0 };
          bilanz[e.kapitel] = {
            versuche: alt.versuche + 1,
            bestanden: alt.bestanden || e.bestanden,
            bestProzent: Math.max(alt.bestProzent, Math.round((Number(e.punkte) / Number(e.max_punkte)) * 100)),
          };
        }
        setBossBilanz(bilanz);
        setHandicaps(h);
        setFortschritt(f);
        setFaellig(w.filter((x) => x.faellig_am <= heute()).length);
        const bekannt = new Set(AUFGABEN.map((x) => x.id));
        setGesehen(new Set([...w.map((x) => x.aufgabe_id), ...a.map((x) => x.aufgabe_id)].filter((id) => bekannt.has(id))).size);
        setStatistik(await zaehleAntworten());
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

      {fehler && (
        <p className="meldung">
          Daten konnten nicht geladen werden: {fehler}
          <br />
          Wurde <code>supabase/schema.sql</code> im SQL-Editor ausgeführt?
        </p>
      )}
      {test && <p className="hinweis">Testmodus: alle Bosse frei, nichts wird gespeichert.</p>}

      <section className="karte">
        <div className="kacheln">
          <div className="kachel">
            <strong>{fortschritt ? aktuellerStreak(fortschritt, tag) : '…'}</strong>
            <span>Tage Streak</span>
          </div>
          <div className="kachel">
            <strong>{faellig ?? '…'}</strong>
            <span>heute fällig</span>
          </div>
          <div className="kachel">
            <strong>{imBunker ?? '…'}</strong>
            <span>im Bunker</span>
          </div>
        </div>
        <div>
          <h2>Tägliche Runde</h2>
          <p className="klein">
            {heuteGeschafft
              ? 'Heute geschafft ✓ Eine Extra-Runde zählt für Wiederholung und Handicap, nicht für den Streak.'
              : '9 Aufgaben: Bunker, fällige Wiederholungen, Schwachstellen und Neues.'}
          </p>
        </div>
        <button onClick={onRunde} disabled={!!fehler || !fortschritt}>
          {fortsetzen
            ? `Runde fortsetzen (${fortsetzen.ergebnisse.length}/${fortsetzen.aufgaben.length})`
            : heuteGeschafft
              ? 'Extra-Runde starten'
              : 'Runde starten'}
        </button>
        <button className="zweitrangig" onClick={onBunker} disabled={!!fehler || imBunker === null}>
          {imBunker ? `Fehler-Bunker (${imBunker})` : 'Fehler-Bunker'}
        </button>
      </section>

      <section className="karte">
        <div>
          <h2>Kapitel</h2>
          <p className="klein">
            Handicap: Start {START_HANDICAP}, niedriger ist besser. Je voller der Balken, desto besser. Striche: Start (
            {START_HANDICAP}) und Boss-Grenze ({BOSS_FREI_UNTER}).
          </p>
        </div>
        <div>
          {KAPITEL.map((k) => {
            const h = handicaps?.[k.nr];
            const frei = test || bossFrei(h);
            const bilanz = bossBilanz[k.nr];
            const laeuft = laufenderBoss?.kapitel === k.nr;
            const anteil = h === undefined ? 0 : Math.min(1, Math.max(0, (HANDICAP_MAX - h) / HANDICAP_MAX));
            return (
              <div key={k.nr} className="kapitel">
                <div className="kapitel-kopf">
                  <span className="kapitel-titel">
                    {k.nr}. {k.titel}
                  </span>
                  <span className="kapitel-wert">
                    {h === undefined ? '…' : h.toLocaleString('de-DE')}
                    <small>Handicap</small>
                  </span>
                </div>
                <div className="skala" aria-hidden>
                  <i className={frei ? 'frei' : ''} style={{ width: `${anteil * 100}%` }} />
                  <b className="start" style={{ left: `${((HANDICAP_MAX - START_HANDICAP) / HANDICAP_MAX) * 100}%` }} />
                  <b style={{ left: `${((HANDICAP_MAX - BOSS_FREI_UNTER) / HANDICAP_MAX) * 100}%` }} />
                </div>
                <div className="kapitel-fuss">
                  <span className="klein">
                    {AUFGABEN.filter((a) => a.kapitel === k.nr).length} Aufgaben
                    {bilanz &&
                      ` · Boss ${bilanz.bestanden ? 'besiegt ✓' : 'offen'}, bestes Ergebnis ${bilanz.bestProzent} %`}
                  </span>
                  <button
                    className={`klein-knopf ${frei || laeuft ? '' : 'zweitrangig'}`}
                    disabled={!frei && !laeuft}
                    onClick={() => onBoss(k.nr)}
                  >
                    {laeuft ? 'Boss fortsetzen' : frei ? 'Boss-Kampf' : 'Boss gesperrt'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="karte">
        <h2>Statistik</h2>
        {statistik === null ? (
          <p className="klein">…</p>
        ) : (
          (() => {
            const gesamt = statistik.richtig + statistik.teils + statistik.falsch;
            const pz = (n: number) => (gesamt ? Math.round((n / gesamt) * 100) : 0);
            return (
              <>
                <div className="kacheln">
                  <div className="kachel">
                    <strong>{gesamt}</strong>
                    <span>Antworten</span>
                  </div>
                  <div className="kachel">
                    <strong>{gesehen ?? '…'}</strong>
                    <span>von {AUFGABEN.length} Aufgaben gesehen</span>
                  </div>
                  <div className="kachel">
                    <strong>{pz(statistik.richtig)} %</strong>
                    <span>richtig</span>
                  </div>
                </div>
                {gesamt > 0 && (
                  <div className="verteilung" aria-hidden>
                    <i className="richtig" style={{ width: `${pz(statistik.richtig)}%` }} />
                    <i className="teils" style={{ width: `${pz(statistik.teils)}%` }} />
                    <i className="falsch" style={{ width: `${pz(statistik.falsch)}%` }} />
                  </div>
                )}
                <ul className="liste">
                  <li>
                    <span className="treffer">Richtig</span>
                    <span className="zahl">
                      {statistik.richtig} · {pz(statistik.richtig)} %
                    </span>
                  </li>
                  <li>
                    <span className="mittel">Teils</span>
                    <span className="zahl">
                      {statistik.teils} · {pz(statistik.teils)} %
                    </span>
                  </li>
                  <li>
                    <span className="daneben">Falsch</span>
                    <span className="zahl">
                      {statistik.falsch} · {pz(statistik.falsch)} %
                    </span>
                  </li>
                </ul>
                <p className="klein">Zählt alle Antworten aus Runde, Bunker-Training und Boss-Kämpfen.</p>
              </>
            );
          })()
        )}
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
        <p className="klein">
          Angemeldet als {email}
          {fortschritt && ` · Längster Streak: ${fortschritt.laengster_streak} Tage`}
        </p>
      </section>
    </main>
  );
}
