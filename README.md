# Mikro 1 Training

Lern-App für die Klausur Mikroökonomie 1 (React + Vite + TypeScript, Supabase, Vercel).

- Aufgabenpool: `src/data/aufgaben.json`
- Datenbankschema: `supabase/schema.sql`
- Speicher-Schicht: `src/lib/speicher.ts`

## Einrichtung (einmalig)

### 1. Datenbank in Supabase anlegen
1. Auf supabase.com einloggen und das Projekt öffnen.
2. Links **SQL Editor** → **New query**.
3. Inhalt von `supabase/schema.sql` komplett hineinkopieren → **Run**.
4. Kontrolle: Links **Table Editor** zeigt 6 Tabellen: `antworten`, `handicap`, `bunker`, `wiederholung`, `fortschritt`, `boss_ergebnisse`.

### 2. Keys holen
Supabase → **Project Settings** (Zahnrad) → **API** bzw. **API Keys**.

Du brauchst zwei Werte:
- **Project URL**: sieht aus wie `https://abcdefgh.supabase.co` (manchmal unter **Data API**).
- **Öffentlicher Key**: heißt je nach Ansicht `anon` `public` (beginnt mit `eyJ…`) oder **Publishable key** (beginnt mit `sb_publishable_…`). Beide funktionieren.

⚠️ Niemals den `service_role`- oder **Secret**-Key verwenden. Der darf nie in die App.

### 3. App auf Vercel veröffentlichen
1. Auf vercel.com mit GitHub anmelden → **Add New… → Project** → dieses Repository importieren.
2. Framework „Vite“ wird erkannt; nichts ändern.
3. Unter **Environment Variables** eintragen:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = öffentlicher Key
4. **Deploy**.

### 4. Login-Einstellungen in Supabase
Supabase → **Authentication**:
- **URL Configuration** → **Site URL** = deine Vercel-Adresse (z. B. `https://….vercel.app`).
- Optional: **Sign In / Providers → Email → Confirm email** ausschalten. Dann ist keine Bestätigungsmail nötig.
- Nach deiner eigenen Registrierung: **Allow new users to sign up** ausschalten. Dann kann sich niemand sonst anmelden.

## Lokal starten (optional, braucht Node.js)
```bash
npm install
cp .env.example .env.local   # Werte eintragen
npm run dev
```
