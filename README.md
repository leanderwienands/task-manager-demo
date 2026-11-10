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

## Tägliche Runde: Regeln
- **9 Aufgaben**: bis zu 3 aus dem Fehler-Bunker, fällige Wiederholungen (zusammen höchstens 6), 1 Schwachstelle (zuletzt teils), Rest neue Aufgaben, bevorzugt aus Kapiteln mit hohem Handicap. Schwierigkeit passt sich dem Handicap an (36 → leicht, 0 → schwer).
- **Wiederholung**: richtig → wieder in 2, 5, 13, 33, 60 Tagen; teils → Abstand wächst kaum; falsch → morgen wieder.
- **Handicap je Kapitel** (Start 36, 0–54): richtig −0,75 bis −1,75 (je schwerer, desto mehr), teils −0,25, falsch +1,5 bis +0,5 (je leichter, desto mehr).
- **Streak**: +1 pro Tag mit abgeschlossener Runde. Extra-Runden zählen nicht doppelt.
- **Toleranz** für Rechenaufgaben (Standard 1 %) auf der Startseite einstellbar, gilt pro Gerät.
- Eine angefangene Runde wird am selben Tag fortgesetzt (auch nach Neuladen).

## Fehler-Bunker
- **Rein**: jede falsche Antwort (Runde, Bunker-Training, später Boss).
- **Raus**: nach 2 richtigen Antworten an verschiedenen Tagen. Eine falsche Antwort setzt den Fortschritt auf 0.
- **Häufiger zurück**: bis zu 3 Bunker-Aufgaben pro Täglicher Runde, dazu eigenes Training auf der Bunker-Seite (jede Aufgabe einmal pro Tag).
- Bunker-Training ändert Wiederholungstermine, aber nicht das Handicap und nicht den Streak.
- Fehler aus der Zeit vor dem Bunker werden beim ersten Öffnen automatisch übernommen.

## Boss-Kampf
- **Frei** ab Handicap unter 18 im Kapitel.
- **5 Aufgaben** im Klausurstil: bevorzugt Altklausuren (Dateiname mit „Klausur“, gibt es noch keine), dann Übungsblätter, eher schwer, gemischte Typen.
- **Punkte** je Aufgabe: 2 × Schwierigkeit. Richtig = volle, teils = halbe Punkte. Bestanden ab 50 %.
- **Zeitlimit**: je Aufgabe 2 × Schwierigkeit + 2 Minuten. Die Uhr läuft weiter, auch wenn die App geschlossen ist; bei Ablauf wird automatisch abgegeben.
- Lösungen erst nach der Abgabe, dann Korrektur (Rechnen automatisch, Freitext/Herleitung selbst bewerten).
- Gespeichert: Ergebnis in `boss_ergebnisse`, jede Antwort (Modus „boss“), Wiederholungstermine, Bunker. Handicap und Streak ändern sich nicht.
- **Testmodus**: App-Adresse mit `?bosstest` am Ende öffnen → alle Bosse frei, nichts wird gespeichert.

## Lokal starten (optional, braucht Node.js)
```bash
npm install
cp .env.example .env.local   # Werte eintragen
npm run dev
```
