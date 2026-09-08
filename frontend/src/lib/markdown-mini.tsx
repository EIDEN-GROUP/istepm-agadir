/**
 * Mini-rendu Markdown pour les messages de l'assistant IA.
 *
 * Zéro dépendance, sûr contre le XSS par construction : le texte est
 * intégralement échappé AVANT toute transformation, et les seuls liens
 * générés sont en http(s) avec `rel="noopener noreferrer"`.
 * Gère : blocs de code ``` , `code`, **gras**, *italique*,
 * #/##/### titres, listes -/* et 1., citations >, liens [t](url).
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(s: string): string {
  // `s` est déjà échappé : on n'y injecte que nos propres balises sûres.
  let out = s.replace(/`([^`\n]+)`/g, '<code class="rounded-md bg-black/[0.07] px-1 py-0.5 font-mono text-[0.85em]">$1</code>');
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="font-medium text-brand-dk underline hover:text-brand">$1</a>',
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  return out;
}

export function renderMiniMarkdown(text: string): string {
  const codeBlocks: string[] = [];
  // 1. Extraire les blocs de code pour les protéger des transformations.
  const withoutCode = escapeHtml(text).replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, lang, code) => {
    codeBlocks.push(
      `<pre class="overflow-x-auto rounded-xl bg-ink/95 p-3 font-mono text-[12px] leading-relaxed text-white">${
        lang ? `<span class="mb-1 block text-[10px] uppercase tracking-wider text-white/50">${escapeHtml(lang)}</span>` : ""
      }<code>${code.replace(/^\n+|\n+$/g, "")}</code></pre>`,
    );
    return `\u0000CODE${codeBlocks.length - 1}\u0000`;
  });

  // 2. Structure par lignes.
  const lines = withoutCode.split("\n");
  const html: string[] = [];
  let list: "ul" | "ol" | null = null;
  const closeList = () => {
    if (list) {
      html.push(list === "ul" ? "</ul>" : "</ol>");
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      closeList();
      continue;
    }
    // Les modèles indentent souvent les listes : détecte sur la version désindentée.
    const stripped = line.replace(/^\s+/, "");
    const codeRef = stripped.match(/^\u0000CODE(\d+)\u0000$/);
    if (codeRef) {
      closeList();
      html.push(codeBlocks[Number(codeRef[1])] ?? "");
      continue;
    }
    const h3 = stripped.match(/^###\s+(.*)/);
    const h2 = stripped.match(/^##\s+(.*)/);
    const h1 = stripped.match(/^#\s+(.*)/);
    if (h3 || h2 || h1) {
      closeList();
      const m = (h3 ?? h2 ?? h1)!;
      const cls = h3
        ? "text-sm font-bold text-foreground"
        : h2
          ? "text-[15px] font-bold text-foreground"
          : "text-base font-bold text-foreground";
      html.push(`<p class="${cls}">${renderInline(m[1])}</p>`);
      continue;
    }
    const quote = stripped.match(/^&gt;\s?(.*)/);
    if (quote) {
      closeList();
      html.push(`<p class="border-s-2 border-brand/40 ps-2 italic text-muted-foreground">${renderInline(quote[1])}</p>`);
      continue;
    }
    const ul = stripped.match(/^[-*•]\s+(.*)/);
    const ol = stripped.match(/^\d+[.)]\s+(.*)/);
    if (ul || ol) {
      const kind = ul ? "ul" : "ol";
      if (list !== kind) {
        closeList();
        html.push(kind === "ul" ? '<ul class="list-disc space-y-0.5 ps-5">' : '<ol class="list-decimal space-y-0.5 ps-5">');
        list = kind;
      }
      html.push(`<li>${renderInline((ul ?? ol)![1])}</li>`);
      continue;
    }
    closeList();
    html.push(`<p>${renderInline(line)}</p>`);
  }
  closeList();
  return html.join("");
}

export function MiniMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <div
      className={["mini-md space-y-1.5 whitespace-normal", className ?? ""].join(" ").trim()}
      dangerouslySetInnerHTML={{ __html: renderMiniMarkdown(text || "") }}
    />
  );
}
