PROJEKT
Lern-Web-App für die Klausurvorbereitung Mikroökonomie 1. Läuft im Browser auf Mac und iPhone (mobile-first). Sprache: Deutsch. Design: schlicht und neutral, wird später angepasst.

SCOPE
Alle PDFs im Ordner /unterlagen gehören zu den gewünschten Themen. Berücksichtige alle.

SCHRITT 0 (vor jedem Code, Plan-Modus)
Lies alle PDFs in /unterlagen. Leite die Kapitel aus Dateinamen und Überschriften ab und zeige mir die Kapitelliste, bevor du weitermachst. Erstelle dann einmalig aufgaben.json mit: id, Kapitel, Typ (rechnen | freitext | herleitung | multiple_choice), Aufgabentext, Lösung, Lösungsweg, Schwierigkeit 1-5, Quelle (Datei + Seite), check (true bei unsicherer Extraktion). Formeln als LaTeX (KaTeX). Typen-Mix: überwiegend Rechnen, Freitext und Herleitung, höchstens 10 % Multiple Choice. Danach nie wieder PDFs lesen, nur aufgaben.json. Stoppe nach Schritt 0 und zeige mir 10 Stichproben zur Kontrolle.

BEWERTUNG
Rechnen: Zahleneingabe mit einstellbarer Toleranz, danach Lösungsweg anzeigen. Freitext/Herleitung: Musterlösung aufdecken, ich bewerte mich selbst (richtig / teils / falsch). Keine KI-Bewertung zur Laufzeit.

SPIELMECHANIK
1. Tägliche Runde: 9 Aufgaben, gemischt aus fälligen (Spaced Repetition) und Schwachstellen. Ergebnis ändert das Handicap je Kapitel (Start 36, niedriger = besser).
2. Fehler-Bunker: Falsche Aufgaben kommen häufiger zurück. Raus nach 2 richtigen Antworten an verschiedenen Tagen.
3. Boss-Kampf: Klausurstil am Kapitelende, bevorzugt aus Altklausuren, mit Zeitlimit. Frei ab Handicap unter 18 im Kapitel.

SPEICHERUNG
Supabase (Free Tier), E-Mail-Login. Speichern: Antworthistorie, Handicap je Kapitel, Bunker, Streak, Boss-Ergebnisse. Row Level Security. Keys nur in .env. Gib mir eine Schritt-für-Schritt-Anleitung für Konto und Keys.

TECH
React + Vite + TypeScript, Deployment über Vercel.

ARBEITSWEISE
Erst Plan, dann bauen. Ein Feature pro Session, danach Testplan für mich, Commit, Push und Pull Request nach main (den PR legt Claude selbst an, ich merge nur). Reihenfolge: Extraktion, Speicherung, Tägliche Runde, Bunker, Boss, Design. Antworten knapp, keine unnötigen Dateien lesen. Ich bin Laie: erkläre jeden Schritt einfach und sage mir genau, was ich tun muss.
