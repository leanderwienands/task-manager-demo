import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { konfigFehler, supabase } from './lib/supabase';
import { Login } from './components/Login';
import { Start } from './components/Start';

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [bereit, setBereit] = useState(false);

  useEffect(() => {
    if (konfigFehler) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setBereit(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_ereignis, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (konfigFehler)
    return (
      <main className="seite">
        <p className="meldung">{konfigFehler}</p>
      </main>
    );
  if (!bereit) return <main className="seite">Lädt …</main>;
  return session ? <Start email={session.user.email ?? ''} /> : <Login />;
}
