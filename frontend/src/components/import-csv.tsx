import { useState } from "react";
import { Upload, FileUp, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ghostPill, primaryPill, dialogSurface } from "@/lib/dash-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export type ImportColumn = {
  key: string;
  label: string;
  required?: boolean;
  aliases?: string[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  columns: ImportColumn[];
  onImport: (rows: Record<string, string>[]) => void;
  validate: (values: Record<string, string>) => string[];
};

type ResultRow =
  | { ok: true; data: Record<string, string> }
  | { ok: false; erreurs: string[] };

function parseCsv(text: string): string[][] {
  const lignes: string[][] = [];
  let current: string[] = [];
  let champ = "";
  let dansGuillemets = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (dansGuillemets) {
      if (c === '"' && next === '"') {
        champ += '"';
        i++;
      } else if (c === '"') {
        dansGuillemets = false;
      } else {
        champ += c;
      }
    } else {
      if (c === '"') {
        dansGuillemets = true;
      } else if (c === ",") {
        current.push(champ.trim());
        champ = "";
      } else if (c === "\n" || (c === "\r" && next === "\n")) {
        if (c === "\r") i++;
        current.push(champ.trim());
        champ = "";
        if (current.length > 0 && current.some((s) => s !== "")) {
          lignes.push(current);
        }
        current = [];
      } else if (c === "\r") {
        current.push(champ.trim());
        champ = "";
        if (current.some((s) => s !== "")) {
          lignes.push(current);
        }
        current = [];
      } else {
        champ += c;
      }
    }
  }
  if (champ.trim() || current.length > 0) {
    current.push(champ.trim());
    if (current.some((s) => s !== "")) {
      lignes.push(current);
    }
  }
  return lignes;
}

function buildAliasMap(columns: ImportColumn[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const col of columns) {
    const norm = (s: string) => s.toLowerCase().replace(/[_\s-]+/g, " ");
    map[norm(col.key)] = col.key;
    map[norm(col.label)] = col.key;
    if (col.aliases) {
      for (const a of col.aliases) map[norm(a)] = col.key;
    }
  }
  return map;
}

function autoMapHeaders(
  entetes: string[],
  aliasMap: Record<string, string>,
): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const h of entetes) {
    const key = h.toLowerCase().trim().replace(/[_\s-]+/g, " ");
    const target = aliasMap[key];
    if (target) mapping[target] = h;
  }
  return mapping;
}

function resolveRow(
  row: Record<string, string>,
  mapping: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, header] of Object.entries(mapping)) {
    result[key] = (row[header] ?? "").trim();
  }
  return result;
}

export function ImportCsvDialog({
  open,
  onOpenChange,
  title,
  description,
  columns,
  onImport,
  validate,
}: Props) {
  const [entetes, setEntetes] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fichier, setFichier] = useState("");
  const [etape, setEtape] = useState<"upload" | "mapper" | "resultat">("upload");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [resultats, setResultats] = useState<ResultRow[]>([]);

  const aliasMap = buildAliasMap(columns);

  const reset = () => {
    setEntetes([]);
    setRows([]);
    setFichier("");
    setEtape("upload");
    setMapping({});
    setResultats([]);
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Seuls les fichiers .csv sont acceptés");
      return;
    }
    setFichier(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const clean = text.replace(/^\uFEFF/, "");
      const toutes = parseCsv(clean);
      if (toutes.length < 2) {
        toast.error("Le fichier doit contenir au moins une ligne d'en-tête et une ligne de données");
        return;
      }
      const ent = toutes[0].map((h) => h.trim());
      const cols = toutes.slice(1).map((row) => {
        const obj: Record<string, string> = {};
        ent.forEach((h, i) => {
          obj[h] = row[i] ?? "";
        });
        return obj;
      });
      setEntetes(ent);
      setRows(cols);

      const auto = autoMapHeaders(ent, aliasMap);
      setMapping(auto);

      const res = cols.map((l) => {
        const resolved = resolveRow(l, auto);
        const errs = validate(resolved);
        return errs.length
          ? { ok: false as const, erreurs: errs as string[] }
          : { ok: true as const, data: l };
      });
      setResultats(res);
      setEtape("mapper");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const setColMap = (colCible: string, source: string) => {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(mapping)) {
      if (v !== source) next[k] = v;
    }
    if (source) next[colCible] = source;
    setMapping(next);
    const res = rows.map((l) => {
      const resolved = resolveRow(l, next);
      const errs = validate(resolved);
      return errs.length
        ? { ok: false as const, erreurs: errs as string[] }
        : { ok: true as const, data: l };
    });
    setResultats(res);
  };

  const doImport = () => {
    const okRows = resultats
      .filter((r): r is { ok: true; data: Record<string, string> } => r.ok)
      .map((r) => {
        const resolved = resolveRow(r.data, mapping);
        return resolved;
      });
    onImport(okRows);
    setEtape("resultat");
  };

  const nbOk = resultats.filter((r) => r.ok).length;
  const nbErreur = resultats.filter((r) => !r.ok).length;
  const lignesApercu = rows.slice(0, 5);
  const colonneDispo = entetes;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className={cn(dialogSurface, "max-w-4xl")}>
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>

        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand/12 text-brand-dk">
              <FileUp className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
                {title}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            </div>
          </div>

          {etape === "upload" && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById("csv-input")?.click()}
              className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-brand/20 bg-brand/3 px-6 py-10 transition hover:border-brand/40 hover:bg-brand/6"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="font-semibold text-foreground">
                  Cliquez ou glissez-déposez un fichier CSV
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Le fichier doit comporter une ligne d'en-tête
                </p>
              </div>
              <input
                id="csv-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          )}

          {etape === "mapper" && (
            <>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Aperçu ({rows.length} ligne{rows.length > 1 ? "s" : ""})
                </p>
                <div className="overflow-x-auto rounded-xl border border-brand/12">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-brand/5">
                        {entetes.map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-foreground">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lignesApercu.map((l, i) => (
                        <tr key={i} className="border-t border-brand/8">
                          {entetes.map((h) => (
                            <td key={h} className="max-w-40 truncate px-3 py-1.5 text-muted-foreground">
                              {l[h] || ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Correspondance des colonnes
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {columns.map((col) => (
                    <div key={col.key} className="flex items-center gap-2">
                      <span className="w-36 shrink-0 text-xs font-medium text-foreground">
                        {col.required ? (
                          <span>{col.label} <span className="text-alert">*</span></span>
                        ) : (
                          col.label
                        )}
                      </span>
                      <select
                        value={mapping[col.key] ?? ""}
                        onChange={(e) => setColMap(col.key, e.target.value)}
                        className={cn(
                          "h-7 flex-1 rounded-lg border border-brand/12 bg-card px-2 text-xs font-medium text-foreground outline-none",
                          "focus:border-brand/30 focus:ring-1 focus:ring-brand/20",
                          mapping[col.key] ? "" : "border-alert/40 text-alert",
                        )}
                      >
                        <option value="">  Non mappé  </option>
                        {colonneDispo.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-brand/5 px-4 py-3">
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 font-semibold text-teal-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {nbOk} valide{nbOk > 1 ? "s" : ""}
                  </span>
                  {nbErreur > 0 && (
                    <span className="inline-flex items-center gap-1 font-semibold text-alert">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {nbErreur} erreur{nbErreur > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { reset(); onOpenChange(false); }}
                    className={cn(ghostPill, "h-8 px-3 text-xs")}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={doImport}
                    disabled={nbOk === 0}
                    className={cn(primaryPill, "h-8 gap-1.5 px-4 text-xs")}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Importer {nbOk} entrée{nbOk > 1 ? "s" : ""}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Fichier : {fichier}
              </p>
            </>
          )}

          {etape === "resultat" && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  Résultat de l'importation
                </p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="inline-flex items-center gap-1 font-semibold text-teal-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {nbOk} importée{nbOk > 1 ? "s" : ""}
                  </span>
                  {nbErreur > 0 && (
                    <span className="inline-flex items-center gap-1 font-semibold text-alert">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {nbErreur} ignorée{nbErreur > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              {nbErreur > 0 && (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-alert/20 bg-alert/5 p-3">
                  {resultats.map((r, i) =>
                    r.ok ? null : (
                      <div key={i} className="flex gap-2 text-xs">
                        <span className="shrink-0 font-semibold text-alert">
                          Ligne {i + 2}:
                        </span>
                        <span className="text-muted-foreground">
                          {r.erreurs.join(" · ")}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { reset(); onOpenChange(false); }}
                  className={cn(ghostPill, "h-8 px-3 text-xs")}
                >
                  Fermer
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
