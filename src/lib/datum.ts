// Datumsangaben immer als lokales Datum "JJJJ-MM-TT" (so speichert Supabase den Typ date).

function format(d: Date): string {
  const j = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const t = String(d.getDate()).padStart(2, '0');
  return `${j}-${m}-${t}`;
}

export function heute(): string {
  return format(new Date());
}

/** Datum + n Tage (n darf negativ sein). */
export function plusTage(datum: string, n: number): string {
  const [j, m, t] = datum.split('-').map(Number);
  return format(new Date(j, m - 1, t + n));
}

/** Lokales Datum eines ISO-Zeitstempels. */
export function tagVon(zeitstempel: string): string {
  return format(new Date(zeitstempel));
}
