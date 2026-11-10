import { useState, type FormEvent } from 'react';
import { konfig, supabase, technisch, testeVerbindung } from '../lib/supabase';

interface Meldung {
  text: string;
  technisch?: string;
  ok?: boolean;
}

export function Login() {
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [modus, setModus] = useState<'anmelden' | 'registrieren'>('anmelden');
  const [meldung, setMeldung] = useState<Meldung | null>(null);
  const [laedt, setLaedt] = useState(false);

  function zeigeFehler(e: unknown) {
    console.error('[Login] Fehler von Supabase:', e);
    const t = technisch(e);
    setMeldung({ text: hinweis(t), technisch: t });
  }

  async function absenden(e: FormEvent) {
    e.preventDefault();
    setMeldung(null);
    setLaedt(true);
    try {
      if (modus === 'anmelden') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: passwort });
        if (error) zeigeFehler(error);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: passwort,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) zeigeFehler(error);
        else if (!data.session)
          setMeldung({ text: 'Konto angelegt. Bitte bestätige deine E-Mail über den Link im Postfach, dann hier anmelden.', ok: true });
      }
    } catch (err) {
      zeigeFehler(err);
    } finally {
      setLaedt(false);
    }
  }

  async function verbindungPruefen() {
    setMeldung({ text: 'Prüfe Verbindung …', ok: true });
    const ergebnis = await testeVerbindung();
    setMeldung({ text: ergebnis, ok: ergebnis.startsWith('✓') });
  }

  return (
    <main className="seite">
      <h1>Mikro 1 Training</h1>
      <form onSubmit={absenden} className="karte">
        <h2>{modus === 'anmelden' ? 'Anmelden' : 'Konto anlegen'}</h2>
        <label>
          E-Mail
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Passwort
          <input
            type="password"
            autoComplete={modus === 'anmelden' ? 'current-password' : 'new-password'}
            minLength={6}
            required
            value={passwort}
            onChange={(e) => setPasswort(e.target.value)}
          />
        </label>
        <button type="submit" disabled={laedt}>
          {laedt ? 'Bitte warten …' : modus === 'anmelden' ? 'Anmelden' : 'Registrieren'}
        </button>
        {meldung && (
          <div className={meldung.ok ? 'info' : 'meldung'} role="alert">
            <p>{meldung.text}</p>
            {meldung.technisch && <p className="technisch">Fehlermeldung: {meldung.technisch}</p>}
          </div>
        )}
        <button
          type="button"
          className="link"
          onClick={() => {
            setModus(modus === 'anmelden' ? 'registrieren' : 'anmelden');
            setMeldung(null);
          }}
        >
          {modus === 'anmelden' ? 'Noch kein Konto? Registrieren' : 'Schon ein Konto? Anmelden'}
        </button>
      </form>

      <section className="karte">
        <p className="klein">
          Verbindung: {konfig.host} · Key: {konfig.keyArt}
        </p>
        {konfig.hinweise.map((h) => (
          <p key={h} className="klein">
            ⚠️ {h}
          </p>
        ))}
        <button type="button" className="link" onClick={verbindungPruefen}>
          Verbindung testen
        </button>
      </section>
    </main>
  );
}

/** Verständlicher Hinweis zur echten Fehlermeldung. */
function hinweis(t: string): string {
  if (/invalid login credentials/i.test(t)) return 'E-Mail oder Passwort falsch.';
  if (/email not confirmed/i.test(t)) return 'E-Mail noch nicht bestätigt. Bitte den Link im Postfach öffnen.';
  if (/already registered|already been registered/i.test(t)) return 'Diese E-Mail ist schon registriert. Bitte anmelden.';
  if (/signups not allowed|signup.*disabled/i.test(t)) return 'Neue Registrierungen sind in Supabase gesperrt.';
  if (/rate limit/i.test(t)) return 'Zu viele Versuche. Bitte später erneut probieren.';
  if (/password/i.test(t) && /(short|weak|at least)/i.test(t)) return 'Passwort zu schwach oder zu kurz.';
  if (/invalid api key|no api key/i.test(t)) return 'Supabase lehnt den Key ab. Bitte den öffentlichen Key in Vercel neu eintragen.';
  if (/fetch|load failed|network|type ?error|iso-8859-1/i.test(t))
    return 'Supabase nicht erreichbar. Häufige Ursachen: falsche Project URL, Sonderzeichen im Key oder Projekt pausiert. Tipp: „Verbindung testen“ unten.';
  return 'Das hat nicht geklappt.';
}
