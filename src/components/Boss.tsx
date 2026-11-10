import { useEffect, useRef, useState } from 'react';
import { AUFGABEN, KAPITEL, type Aufgabe } from '../lib/aufgaben';
import { heute } from '../lib/datum';
import { verbucheFolgen } from '../lib/antwort';
import {
  BESTEHEN_AB,
  erreichtePunkte,
  minutenFuer,
  punkteFuer,
  waehleBoss,
} from '../lib/boss';
import {
  ladeLaufendenBoss,
  ladeToleranz,
  speichereLaufendenBoss,
  type LaufenderBoss,
} from '../lib/einstellungen';
import { bewerteRechnung, istNah, leseZahl } from '../lib/runde';
import {
  ladeBunker,
  ladeWiederholungen,
  speichereAntworten,
  speichereBossErgebnis,
  type Ergebnis,
} from '../lib/speicher';
import { Mathe } from './Mathe';

const nachId = new Map(AUFGABEN.map((a) => [a.id, a]));
const kapitelTitel = (nr: number) => KAPITEL.find((k) => k.nr === nr)?.titel ?? `Kapitel ${nr}`;
const ERGEBNIS_TEXT: Record<Ergebnis, string> = { richtig: 'Richtig', teils: 'Teilweise richtig', falsch: 'Falsch' };

function uhr(sek: number) {
  const s = Math.max(0, Math.ceil(sek));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function zahl(n: number) {
  return n.toLocaleString('de-DE', { maximumFractionDigits: 4 });
}
function schoenesLabel(label: string) {
  const tief = '₀₁₂₃₄₅₆₇₈₉';
  return label.replace(/_(\d)/g, (_m, z: string) => tief[Number(z)]);
}
function mische<T>(liste: T[]): T[] {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Bewertung einer Klausuraufgabe. null = Selbstbewertung steht noch aus. */
function bewerte(b: LaufenderBoss, a: Aufgabe, toleranz: number): Ergebnis | null {
  const antwort = b.antworten[a.id] ?? {};
  if (a.typ === 'rechnen' && a.werte?.length) {
    const treffer = a.werte.map((w, i) => {
      const z = leseZahl(antwort.zahlen?.[i] ?? '');
      return z !== null && istNah(z, w.wert, toleranz);
    });
    return bewerteRechnung(treffer);
  }
  if (a.typ === 'multiple_choice' && a.optionen?.length) return antwort.wahl === a.loesung ? 'richtig' : 'falsch';
  if (!antwort.text?.trim()) return 'falsch'; // leer abgegeben = 0 Punkte
  return b.selbst[a.id] ?? null;
}

function istBeantwortet(b: LaufenderBoss, a: Aufgabe): boolean {
  const x = b.antworten[a.id];
  if (!x) return false;
  return !!(x.text?.trim() || x.wahl || x.zahlen?.some((z) => z.trim()));
}

export function Boss({ kapitel, test, onZurueck }: { kapitel: number; test: boolean; onZurueck: () => void }) {
  const [b, setB] = useState<LaufenderBoss | null>(() => {
    const gemerkt = ladeLaufendenBoss();
    return gemerkt && gemerkt.kapitel === kapitel && gemerkt.ids.every((id) => nachId.has(id)) ? gemerkt : null;
  });
  const [jetzt, setJetzt] = useState(Date.now());
  const [vorschau] = useState(() => waehleBoss(AUFGABEN, kapitel));
  const [toleranz] = useState(ladeToleranz);
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const speichertRef = useRef(false);

  function aendere(fn: (alt: LaufenderBoss) => LaufenderBoss) {
    setB((alt) => {
      if (!alt) return alt;
      const neu = fn(alt);
      speichereLaufendenBoss(neu);
      return neu;
    });
  }

  // Uhr
  useEffect(() => {
    const t = setInterval(() => setJetzt(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const restSek = b ? b.limitSek - (jetzt - b.start) / 1000 : 0;
  // Zeit abgelaufen → automatisch abgeben
  useEffect(() => {
    if (b && !b.abgegeben && restSek <= 0) aendere((alt) => ({ ...alt, abgegeben: alt.start + alt.limitSek * 1000 }));
  }, [b, restSek]);

  const aufgaben = b ? b.ids.map((id) => nachId.get(id)!) : [];
  const korrekturFertig = !!b?.abgegeben && b.korrekturIndex >= aufgaben.length;

  async function speichern() {
    if (!b || b.test || speichertRef.current) return;
    speichertRef.current = true;
    setSpeichert(true);
    setFehler(null);
    try {
      const ergebnisse = aufgaben.map((a) => ({ a, e: bewerte(b, a, toleranz) ?? 'falsch' }));
      let stand = b;
      if (!stand.gespeichert.antworten) {
        await speichereAntworten(
          ergebnisse.map(({ a, e }) => ({
            aufgabe_id: a.id,
            kapitel: a.kapitel,
            modus: 'boss' as const,
            ergebnis: e,
            eingabe: stand.antworten[a.id] ?? null,
          })),
        );
        stand = { ...stand, gespeichert: { ...stand.gespeichert, antworten: true } };
        speichereLaufendenBoss(stand);
        setB(stand);
      }
      const offen = ergebnisse.filter(({ a }) => !stand.gespeichert.folgen.includes(a.id));
      if (offen.length > 0) {
        const [wiederholungen, bunker] = await Promise.all([ladeWiederholungen(), ladeBunker()]);
        const tag = heute();
        for (const { a, e } of offen) {
          await verbucheFolgen({
            aufgabe: a,
            ergebnis: e,
            heute: tag,
            wiederholung: wiederholungen.find((w) => w.aufgabe_id === a.id),
            bunker: bunker.find((x) => x.aufgabe_id === a.id),
          });
          stand = { ...stand, gespeichert: { ...stand.gespeichert, folgen: [...stand.gespeichert.folgen, a.id] } };
          speichereLaufendenBoss(stand);
          setB(stand);
        }
      }
      if (!stand.gespeichert.boss) {
        const punkte = ergebnisse.reduce((s, { a, e }) => s + erreichtePunkte(a, e), 0);
        const max = aufgaben.reduce((s, a) => s + punkteFuer(a), 0);
        await speichereBossErgebnis({
          kapitel: stand.kapitel,
          punkte,
          max_punkte: max,
          dauer_sek: Math.round(Math.min(stand.limitSek, ((stand.abgegeben ?? Date.now()) - stand.start) / 1000)),
          bestanden: punkte >= max * BESTEHEN_AB,
        });
        stand = { ...stand, gespeichert: { ...stand.gespeichert, boss: true } };
        setB(stand);
      }
      speichereLaufendenBoss(null); // fertig, nichts mehr fortzusetzen
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    } finally {
      speichertRef.current = false;
      setSpeichert(false);
    }
  }

  // Nach der Korrektur automatisch speichern
  useEffect(() => {
    if (korrekturFertig && b && !b.test && !b.gespeichert.boss) speichern();
    if (korrekturFertig && b?.test) speichereLaufendenBoss(null);
  }, [korrekturFertig]);

  // ---------- Einleitung ----------
  if (!b) {
    const punkte = vorschau.reduce((s, a) => s + punkteFuer(a), 0);
    const minuten = vorschau.reduce((s, a) => s + minutenFuer(a), 0);
    return (
      <main className="seite">
        <header className="kopf">
          <h1>Boss-Kampf</h1>
          <button className="link" onClick={onZurueck}>
            Zurück
          </button>
        </header>
        <section className="karte">
          <h2>
            Kapitel {kapitel}: {kapitelTitel(kapitel)}
          </h2>
          {test && <p className="hinweis">Testmodus: Es wird nichts gespeichert.</p>}
          <ul className="regeln">
            <li>{vorschau.length} Aufgaben im Klausurstil (aus den Übungsblättern, Altklausuren gibt es noch keine)</li>
            <li>
              {punkte} Punkte, bestanden ab {Math.ceil(punkte * BESTEHEN_AB)} Punkten ({BESTEHEN_AB * 100} %)
            </li>
            <li>Zeitlimit: {minuten} Minuten. Die Uhr läuft weiter, auch wenn du die App schließt.</li>
            <li>Lösungen siehst du erst nach der Abgabe. Leere Antworten zählen 0 Punkte.</li>
            <li>Falsche Aufgaben landen im Fehler-Bunker. Das Handicap ändert sich nicht.</li>
          </ul>
          <button
            onClick={() => {
              const ids = vorschau.map((a) => a.id);
              const neu: LaufenderBoss = {
                kapitel,
                ids,
                optionen: Object.fromEntries(
                  vorschau.filter((a) => a.optionen?.length).map((a) => [a.id, mische(a.optionen!)]),
                ),
                start: Date.now(),
                limitSek: minuten * 60,
                index: 0,
                antworten: {},
                abgegeben: null,
                korrekturIndex: 0,
                selbst: {},
                gespeichert: { antworten: false, folgen: [], boss: false },
                test,
              };
              speichereLaufendenBoss(neu);
              setJetzt(Date.now());
              setB(neu);
            }}
          >
            Kampf beginnen
          </button>
        </section>
      </main>
    );
  }

  // ---------- Klausur ----------
  if (!b.abgegeben) {
    const a = aufgaben[b.index];
    const antwort = b.antworten[a.id] ?? {};
    const setzeAntwort = (x: typeof antwort) =>
      aendere((alt) => ({ ...alt, antworten: { ...alt.antworten, [a.id]: { ...alt.antworten[a.id], ...x } } }));
    const offen = aufgaben.filter((x) => !istBeantwortet(b, x)).length;
    const abgeben = () => {
      const frage =
        offen > 0
          ? `${offen} ${offen === 1 ? 'Aufgabe ist' : 'Aufgaben sind'} noch leer. Trotzdem abgeben?`
          : 'Klausur abgeben?';
      if (window.confirm(frage)) aendere((alt) => ({ ...alt, abgegeben: Date.now() }));
    };

    return (
      <main className="seite">
        <header className="kopf">
          <span>
            Aufgabe {b.index + 1} / {aufgaben.length} · {punkteFuer(a)} P.
          </span>
          <span className={restSek < 300 ? 'uhr knapp' : 'uhr'}>⏱ {uhr(restSek)}</span>
        </header>
        <nav className="reiter">
          {aufgaben.map((x, i) => (
            <button
              key={x.id}
              className={`${i === b.index ? 'aktiv' : ''} ${istBeantwortet(b, x) ? 'erledigt' : ''}`}
              onClick={() => aendere((alt) => ({ ...alt, index: i }))}
            >
              {i + 1}
            </button>
          ))}
        </nav>
        <section className="karte" key={a.id}>
          <p className="aufgabentext">
            <Mathe text={a.aufgabentext} />
          </p>
          {a.typ === 'rechnen' && a.werte?.length ? (
            a.werte.map((w, i) => (
              <label key={i}>
                {schoenesLabel(w.label)}
                <input
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={antwort.zahlen?.[i] ?? ''}
                  onChange={(e) => {
                    const zahlen = a.werte!.map((_, j) => (j === i ? e.target.value : (antwort.zahlen?.[j] ?? '')));
                    setzeAntwort({ zahlen });
                  }}
                />
                {(antwort.zahlen?.[i] ?? '').trim() !== '' && leseZahl(antwort.zahlen![i]) === null && (
                  <span className="klein">Keine gültige Zahl, z. B. 2,5 oder -3/4</span>
                )}
              </label>
            ))
          ) : a.typ === 'multiple_choice' && a.optionen?.length ? (
            (b.optionen[a.id] ?? a.optionen).map((o) => (
              <button
                key={o}
                className={antwort.wahl === o ? 'option gewaehlt' : 'option'}
                onClick={() => setzeAntwort({ wahl: o })}
              >
                <Mathe text={o} />
              </button>
            ))
          ) : (
            <label>
              Deine Antwort
              <textarea rows={7} value={antwort.text ?? ''} onChange={(e) => setzeAntwort({ text: e.target.value })} />
            </label>
          )}
        </section>
        <div className="zweier">
          <button
            className="zweitrangig"
            disabled={b.index === 0}
            onClick={() => aendere((alt) => ({ ...alt, index: alt.index - 1 }))}
          >
            Zurück
          </button>
          {b.index < aufgaben.length - 1 ? (
            <button onClick={() => aendere((alt) => ({ ...alt, index: alt.index + 1 }))}>Weiter</button>
          ) : (
            <button onClick={abgeben}>Abgeben</button>
          )}
        </div>
        {b.index < aufgaben.length - 1 && (
          <button className="link" onClick={abgeben}>
            Vorzeitig abgeben
          </button>
        )}
      </main>
    );
  }

  // ---------- Korrektur ----------
  if (!korrekturFertig) {
    const a = aufgaben[b.korrekturIndex];
    const antwort = b.antworten[a.id] ?? {};
    const ergebnis = bewerte(b, a, toleranz);
    const selbstbewertung =
      !(a.typ === 'rechnen' && a.werte?.length) && !(a.typ === 'multiple_choice' && a.optionen?.length) && !!antwort.text?.trim();
    return (
      <main className="seite">
        <header className="kopf">
          <span>
            Korrektur {b.korrekturIndex + 1} / {aufgaben.length} · {punkteFuer(a)} P.
          </span>
        </header>
        <section className="karte" key={a.id}>
          <p className="aufgabentext">
            <Mathe text={a.aufgabentext} />
          </p>
          <div className="loesung">
            <h3>Deine Antwort</h3>
            {a.typ === 'rechnen' && a.werte?.length ? (
              a.werte.map((w, i) => {
                const z = leseZahl(antwort.zahlen?.[i] ?? '');
                const ok = z !== null && istNah(z, w.wert, toleranz);
                return (
                  <p key={i} className={ok ? 'treffer' : 'daneben'}>
                    {ok ? '✓' : '✗'} {schoenesLabel(w.label)}: {antwort.zahlen?.[i]?.trim() || '–'} (richtig: {zahl(w.wert)})
                  </p>
                );
              })
            ) : a.typ === 'multiple_choice' && a.optionen?.length ? (
              <p>{antwort.wahl ? <Mathe text={antwort.wahl} /> : '–'}</p>
            ) : (
              <p className="eigene">{antwort.text?.trim() || '– (leer)'}</p>
            )}
            <h3>Lösung</h3>
            <p>
              <Mathe text={a.loesung} />
            </p>
            <h3>Lösungsweg</h3>
            <p>
              <Mathe text={a.loesungsweg} />
            </p>
            <p className="klein">
              Quelle: {a.quelle.datei}, S. {a.quelle.seite}
            </p>
          </div>
          {selbstbewertung && (
            <>
              <p>Wie gut war deine Antwort?</p>
              <div className="dreier">
                {(['richtig', 'teils', 'falsch'] as const).map((e) => (
                  <button
                    key={e}
                    className={`bewertung ${e} ${b.selbst[a.id] && b.selbst[a.id] !== e ? 'blass' : ''}`}
                    onClick={() => aendere((alt) => ({ ...alt, selbst: { ...alt.selbst, [a.id]: e } }))}
                  >
                    {e === 'richtig' ? 'Richtig' : e === 'teils' ? 'Teils' : 'Falsch'}
                  </button>
                ))}
              </div>
            </>
          )}
          {ergebnis && (
            <p className={`ergebnis ${ergebnis}`}>
              {ERGEBNIS_TEXT[ergebnis]}: {zahl(erreichtePunkte(a, ergebnis))} von {punkteFuer(a)} Punkten
            </p>
          )}
          <button
            disabled={!ergebnis}
            onClick={() => {
              aendere((alt) => ({ ...alt, korrekturIndex: alt.korrekturIndex + 1 }));
              window.scrollTo(0, 0);
            }}
          >
            {b.korrekturIndex < aufgaben.length - 1 ? 'Weiter' : 'Auswertung'}
          </button>
        </section>
      </main>
    );
  }

  // ---------- Ergebnis ----------
  const ergebnisse = aufgaben.map((a) => ({ a, e: bewerte(b, a, toleranz) ?? 'falsch' }));
  const punkte = ergebnisse.reduce((s, { a, e }) => s + erreichtePunkte(a, e), 0);
  const max = aufgaben.reduce((s, a) => s + punkteFuer(a), 0);
  const bestanden = punkte >= max * BESTEHEN_AB;
  const dauer = Math.min(b.limitSek, ((b.abgegeben ?? Date.now()) - b.start) / 1000);
  return (
    <main className="seite">
      <h1>{bestanden ? 'Boss besiegt!' : 'Boss nicht besiegt'}</h1>
      <section className="karte">
        <p className="gross">
          {zahl(punkte)} / {max} Punkte ({Math.round((punkte / max) * 100)} %)
        </p>
        <p className={bestanden ? 'treffer' : 'daneben'}>
          {bestanden ? 'Bestanden' : `Nicht bestanden, nötig waren ${zahl(Math.ceil(max * BESTEHEN_AB))} Punkte`}
        </p>
        <p className="klein">Benötigte Zeit: {uhr(dauer)} von {uhr(b.limitSek)} Minuten</p>
        {b.test ? (
          <p className="hinweis">Testmodus: nichts gespeichert.</p>
        ) : b.gespeichert.boss ? (
          <p className="klein">Gespeichert ✓</p>
        ) : fehler ? (
          <>
            <p className="meldung">Speichern fehlgeschlagen: {fehler}</p>
            <button disabled={speichert} onClick={speichern}>
              Erneut speichern
            </button>
          </>
        ) : (
          <p className="klein">Speichert …</p>
        )}
      </section>
      <section className="karte">
        <h2>Aufgaben</h2>
        <ul className="liste">
          {ergebnisse.map(({ a, e }, i) => (
            <li key={a.id}>
              <span>
                {i + 1}. <span className={`ergebnis ${e}`}>{ERGEBNIS_TEXT[e]}</span>
              </span>
              <span className="zahl">
                {zahl(erreichtePunkte(a, e))} / {punkteFuer(a)}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <button onClick={onZurueck}>
        Zur Startseite
      </button>
    </main>
  );
}
