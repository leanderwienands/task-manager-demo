import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/** Zeigt Text mit Formeln: $…$ im Satz, $$…$$ als eigene Zeile. */
export function Mathe({ text }: { text: string }) {
  const teile = useMemo(
    () =>
      text.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g).map((t) => {
        const block = t.startsWith('$$') && t.endsWith('$$') && t.length > 4;
        const inline = !block && t.startsWith('$') && t.endsWith('$') && t.length > 2;
        if (!block && !inline) return { html: null, text: t };
        const tex = block ? t.slice(2, -2) : t.slice(1, -1);
        return { html: katex.renderToString(tex, { throwOnError: false, displayMode: block }), text: t };
      }),
    [text],
  );
  return (
    <span className="mathe">
      {teile.map((t, i) =>
        t.html ? <span key={i} dangerouslySetInnerHTML={{ __html: t.html }} /> : <span key={i}>{t.text}</span>,
      )}
    </span>
  );
}
