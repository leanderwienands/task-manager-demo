import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

export function Login() {
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [modus, setModus] = useState<'anmelden' | 'registrieren'>('anmelden');
  const [meldung, setMeldung] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);

  async function absenden(e: FormEvent) {
    e.preventDefault();
    setMeldung(null);
    setLaedt(true);
    try {
      if (modus === 'anmelden') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: passwort });
        if (error) setMeldung(uebersetze(error.message));
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: passwort,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) setMeldung(uebersetze(error.message));
        else if (!data.session)
          setMeldung('Fast geschafft: Bitte bestätige deine E-Mail über den Link im Postfach, dann hier anmelden.');
      }
    } catch {
      setMeldung('Keine Verbindung zu Supabase. Stimmen URL und Key?');
    } finally {
      setLaedt(false);
    }
  }

  return (
    <main className="seite login">
      <div className="marke">
        <img src="/icon.svg" alt="" />
        <div>
          <h1>Mikro 1 Training</h1>
          <p>Klausurvorbereitung Mikroökonomie 1</p>
        </div>
      </div>
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
        {meldung && <p className="meldung">{meldung}</p>}
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
    </main>
  );
}

function uebersetze(text: string): string {
  if (/invalid login credentials/i.test(text)) return 'E-Mail oder Passwort falsch.';
  if (/email not confirmed/i.test(text)) return 'E-Mail noch nicht bestätigt. Bitte den Link im Postfach öffnen.';
  if (/already registered/i.test(text)) return 'Diese E-Mail ist schon registriert. Bitte anmelden.';
  if (/signups not allowed|signup.*disabled/i.test(text)) return 'Neue Registrierungen sind gesperrt.';
  if (/rate limit/i.test(text)) return 'Zu viele Versuche. Bitte später erneut probieren.';
  return text;
}
