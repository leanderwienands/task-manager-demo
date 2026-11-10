import { useMemo, useState, type ReactNode } from 'react';
import type { Aufgabe } from '../lib/aufgaben';
import type { Ergebnis } from '../lib/speicher';
import { bewerteRechnung, istNah, leseZahl } from '../lib/runde';
import { Mathe } from './Mathe';

const ERGEBNIS_TEXT: Record<Ergebnis, string> = { richtig: 'Richtig', teils: 'Teilweise richtig', falsch: 'Falsch' };

/** "x_1 max" → "x₁ max" */
function schoenesLabel(label: string): string {
  const tief = '₀₁₂₃₄₅₆₇₈₉';
  return label.replace(/_(\d)/g, (_m, z: string) => tief[Number(z)]);
}

function zahlText(n: number): string {
  return n.toLocaleString('de-DE', { maximumFractionDigits: 4 });
}

interface Props {
  aufgabe: Aufgabe;
  toleranz: number;
  /** Speichert das Ergebnis. true = gespeichert. */
  onBewerte: (ergebnis: Ergebnis, eingabe: unknown) => Promise<boolean>;
  onWeiter: () => void;
  speichert: boolean;
}

export function AufgabeKarte({ aufgabe, toleranz, onBewerte, onWeiter, speichert }: Props) {
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);
  const [eingabe, setEingabe] = useState<unknown>(null);
  const [gespeichert, setGespeichert] = useState(false);

  async function bewerte(e: Ergebnis, ein: unknown, direktWeiter: boolean) {
    setErgebnis(e);
    setEingabe(ein);
    const ok = await onBewerte(e, ein);
    setGespeichert(ok);
    if (ok && direktWeiter) onWeiter();
  }

  const loesung = (
    <div className="loesung">
      <h3>Lösung</h3>
      <p>
        <Mathe text={aufgabe.loesung} />
      </p>
      <h3>Lösungsweg</h3>
      <p>
        <Mathe text={aufgabe.loesungsweg} />
      </p>
      <p className="klein">
        Quelle: {aufgabe.quelle.datei}, S. {aufgabe.quelle.seite}
      </p>
    </div>
  );

  const weiter =
    ergebnis && (
      <>
        <p className={`ergebnis ${ergebnis}`}>{ERGEBNIS_TEXT[ergebnis]}</p>
        {loesung}
        {gespeichert ? (
          <button onClick={onWeiter}>Weiter</button>
        ) : (
          <button disabled={speichert} onClick={() => bewerte(ergebnis, eingabe, false)}>
            {speichert ? 'Speichert …' : 'Erneut speichern'}
          </button>
        )}
      </>
    );

  return (
    <section className="karte">
      <p className="aufgabentext">
        <Mathe text={aufgabe.aufgabentext} />
      </p>
      {aufgabe.check && (
        <p className="hinweis">
          Hinweis: Diese Aufgabe wurde automatisch aus den Unterlagen übernommen und ist nicht geprüft. Im Zweifel
          mit der Quelle abgleichen.
        </p>
      )}

      {aufgabe.typ === 'rechnen' && aufgabe.werte?.length ? (
        <Rechnen aufgabe={aufgabe} toleranz={toleranz} gesperrt={!!ergebnis} onPruefe={(e, ein) => bewerte(e, ein, false)} />
      ) : aufgabe.typ === 'multiple_choice' && aufgabe.optionen?.length ? (
        <Auswahl aufgabe={aufgabe} gesperrt={!!ergebnis} onPruefe={(e, ein) => bewerte(e, ein, false)} />
      ) : (
        <Selbst
          aufgedecktInhalt={loesung}
          gesperrt={speichert}
          fehlgeschlagen={!!ergebnis && !gespeichert && !speichert}
          onBewerte={(e, ein) => bewerte(e, ein, true)}
        />
      )}

      {aufgabe.typ === 'rechnen' || aufgabe.typ === 'multiple_choice' ? weiter : null}
    </section>
  );
}

// ---------- Rechnen: Zahleneingabe mit Toleranz ----------

function Rechnen({
  aufgabe,
  toleranz,
  gesperrt,
  onPruefe,
}: {
  aufgabe: Aufgabe;
  toleranz: number;
  gesperrt: boolean;
  onPruefe: (e: Ergebnis, eingabe: unknown) => void;
}) {
  const werte = aufgabe.werte!;
  const [eingaben, setEingaben] = useState<string[]>(werte.map(() => ''));
  const zahlen = eingaben.map(leseZahl);
  const alleOk = zahlen.every((z) => z !== null);
  const treffer = zahlen.map((z, i) => z !== null && istNah(z, werte[i].wert, toleranz));

  return (
    <form
      className="eingaben"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (!alleOk || gesperrt) return;
        onPruefe(bewerteRechnung(treffer), { werte: zahlen, toleranz });
      }}
    >
      {werte.map((w, i) => (
        <label key={i}>
          {schoenesLabel(w.label)}
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint={i === werte.length - 1 ? 'done' : 'next'}
            disabled={gesperrt}
            value={eingaben[i]}
            onChange={(ev) => setEingaben(eingaben.map((x, j) => (j === i ? ev.target.value : x)))}
          />
          {eingaben[i].trim() !== '' && zahlen[i] === null && (
            <span className="klein">Bitte eine Zahl eingeben, z. B. 2,5 oder -3/4</span>
          )}
          {gesperrt && (
            <span className={treffer[i] ? 'treffer' : 'daneben'}>
              {treffer[i] ? '✓' : '✗'} richtig: {zahlText(w.wert)}
            </span>
          )}
        </label>
      ))}
      {!gesperrt && (
        <>
          <button type="submit" disabled={!alleOk}>
            Prüfen
          </button>
          <p className="klein">Toleranz: ±{toleranz.toLocaleString('de-DE')} %</p>
        </>
      )}
    </form>
  );
}

// ---------- Multiple Choice ----------

function Auswahl({
  aufgabe,
  gesperrt,
  onPruefe,
}: {
  aufgabe: Aufgabe;
  gesperrt: boolean;
  onPruefe: (e: Ergebnis, eingabe: unknown) => void;
}) {
  const optionen = useMemo(() => [...aufgabe.optionen!].sort(() => Math.random() - 0.5), [aufgabe]);
  const [wahl, setWahl] = useState<string | null>(null);

  return (
    <div className="eingaben">
      {optionen.map((o) => {
        const klasse = gesperrt
          ? o === aufgabe.loesung
            ? 'option treffer'
            : o === wahl
              ? 'option daneben'
              : 'option'
          : o === wahl
            ? 'option gewaehlt'
            : 'option';
        return (
          <button key={o} type="button" className={klasse} disabled={gesperrt} onClick={() => setWahl(o)}>
            <Mathe text={o} />
          </button>
        );
      })}
      {!gesperrt && (
        <button
          disabled={!wahl}
          onClick={() => wahl && onPruefe(wahl === aufgabe.loesung ? 'richtig' : 'falsch', { wahl })}
        >
          Prüfen
        </button>
      )}
    </div>
  );
}

// ---------- Freitext / Herleitung: Musterlösung aufdecken, selbst bewerten ----------

function Selbst({
  aufgedecktInhalt,
  gesperrt,
  fehlgeschlagen,
  onBewerte,
}: {
  aufgedecktInhalt: ReactNode;
  gesperrt: boolean;
  fehlgeschlagen: boolean;
  onBewerte: (e: Ergebnis, eingabe: unknown) => void;
}) {
  const [notiz, setNotiz] = useState('');
  const [aufgedeckt, setAufgedeckt] = useState(false);

  return (
    <div className="eingaben">
      <label>
        Deine Antwort (optional, nur für dich)
        <textarea rows={4} value={notiz} onChange={(e) => setNotiz(e.target.value)} disabled={aufgedeckt} />
      </label>
      {!aufgedeckt ? (
        <button onClick={() => setAufgedeckt(true)}>Lösung aufdecken</button>
      ) : (
        <>
          {aufgedecktInhalt}
          <p>Wie gut war deine Antwort?</p>
          <div className="dreier">
            {(['richtig', 'teils', 'falsch'] as const).map((e) => (
              <button
                key={e}
                className={`bewertung ${e}`}
                disabled={gesperrt}
                onClick={() => onBewerte(e, notiz.trim() ? { notiz: notiz.trim() } : null)}
              >
                {e === 'richtig' ? 'Richtig' : e === 'teils' ? 'Teils' : 'Falsch'}
              </button>
            ))}
          </div>
          {fehlgeschlagen && <p className="meldung">Speichern fehlgeschlagen. Bitte noch einmal tippen.</p>}
        </>
      )}
    </div>
  );
}
