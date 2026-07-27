import { useState, useRef, useCallback } from "react";
import { Upload, FileUp, CheckCircle2, AlertCircle, AlertTriangle, Loader2, Download, ArrowLeft, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ghostPill, primaryPill, dialogSurfaceWide } from "@/lib/dash-ui";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { previewImportEtudiants, executeImportEtudiants, type ImportPreviewResponse, type ImportPreviewRow } from "@/lib/istpm-api";

type Step = "upload" | "preview" | "confirming" | "result";

export function ImportEtudiantsDialog({
  open,
  onOpenChange,
  onImportComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [result, setResult] = useState<{
    imported: number;
    failed: number;
    skipped: number;
    processingTimeMs: number;
    errors: Array<{ index: number; message: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setFileName("");
    setPreview(null);
    setResult(null);
    setLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onOpenChange(false);
  }, [reset, onOpenChange]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Seuls les fichiers .csv sont acceptés");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Le fichier ne doit pas dépasser 10 Mo");
      return;
    }
    setFileName(file.name);
    setLoading(true);
    try {
      const text = await file.text();
      const res = await previewImportEtudiants(text);
      setPreview(res);
      setStep("preview");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur de validation";
      toast.error(msg);
      setStep("upload");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = useCallback(async () => {
    if (!preview) return;
    const validRows = preview.rows.filter((r) => r.valid).map((r) => r.data);
    if (validRows.length === 0) {
      toast.error("Aucune ligne valide à importer");
      return;
    }
    setStep("confirming");
    try {
      const res = await executeImportEtudiants(validRows);
      setResult(res);
      setStep("result");
      if (res.imported > 0) {
        onImportComplete();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur d'importation";
      toast.error(msg);
      setStep("preview");
    }
  }, [preview, onImportComplete]);

  const validCount = preview?.summary.valid ?? 0;
  const invalidCount = preview?.summary.invalid ?? 0;
  const warningCount = preview?.summary.warnings ?? 0;

  const allHeaders = preview ? [...new Set(preview.rows.flatMap((r) => Object.keys(r.data)))] : [];

  const stepIndicator = (s: Step, label: string, icon: React.ReactNode, idx: number) => {
    const steps: Step[] = ["upload", "preview", "confirming", "result"];
    const currentIdx = steps.indexOf(step);
    const thisIdx = steps.indexOf(s);
    const done = currentIdx > thisIdx;
    const active = currentIdx === thisIdx;
    return (
      <div key={s} className={cn("flex items-center gap-2 text-xs", active ? "text-brand font-semibold" : done ? "text-teal-600" : "text-muted-foreground")}>
        <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border", active ? "border-brand bg-brand/10" : done ? "border-teal-400 bg-teal-50 text-teal-600" : "border-muted-300 bg-muted/30")}>
          {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : icon}
        </span>
        <span className="hidden sm:inline">{label}</span>
        {idx < 3 && <span className="hidden sm:inline text-muted-300 mx-1">›</span>}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className={cn(dialogSurfaceWide, "max-w-5xl")}>
        <DialogTitle className="sr-only">Importer des étudiants</DialogTitle>

        <div className="space-y-5 py-10 px-7">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand/12 text-brand-dk">
              <FileUp className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
                Importer des étudiants
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ajouter des étudiants en lot depuis un fichier CSV
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              {stepIndicator("upload", "Fichier", <Upload className="h-3 w-3" />, 0)}
              {stepIndicator("preview", "Validation", <FileText className="h-3 w-3" />, 1)}
              {stepIndicator("confirming", "Import", <Download className="h-3 w-3" />, 2)}
              {stepIndicator("result", "Résultat", <CheckCircle2 className="h-3 w-3" />, 3)}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {loading ? (
                  <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-brand/20 bg-brand/3 px-6 py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-brand" />
                    <p className="text-sm font-medium text-foreground">Analyse du fichier en cours...</p>
                  </div>
                ) : (
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => inputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-brand/20 bg-brand/3 px-6 py-14 transition hover:border-brand/40 hover:bg-brand/6"
                  >
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <div className="text-center">
                      <p className="font-semibold text-foreground">
                        Cliquez ou glissez-déposez un fichier CSV
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Le fichier doit comporter une ligne d'en-tête · Taille max : 10 Mo
                      </p>
                    </div>
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const csv = `cne,matricule,prenom,nom,filiere,niveau,annee,groupe,statut,paiement,telephone,email,dateNaissance,ville,fraisMensuels
G134567890,ISTPM-23-0142,Salma,El Amrani,Infirmier polyvalent,S5,3e annee,G1,inscrit,paye,+212 6 61 24 55 018,salma.elamrani@istpm.ma,2003-04-12,Agadir,3400
J138245017,ISTPM-23-0155,Youssef,Ait Taleb,Infirmier en anesthesie-reanimation,S5,3e annee,G1,inscrit,retard,+212 6 70 11 42 88,y.aittaleb@istpm.ma,2002-11-30,Inezgane,3800
F145908712,ISTPM-24-0203,Imane,Benkirane,Sage-femme,S3,2e annee,G2,inscrit,paye,+212 6 55 78 90 12,i.benkirane@istpm.ma,2004-02-18,Agadir,3200`;
                        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "etudiants-import-exemple.csv";
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      }}
                      className="mt-4 text-xs font-medium text-brand underline-offset-2 hover:underline"
                    >
                      Télécharger un exemple CSV
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {step === "preview" && preview && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {preview.summary.total} ligne{preview.summary.total > 1 ? "s" : ""}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {validCount} valide{validCount > 1 ? "s" : ""}
                  </span>
                  {invalidCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {invalidCount} invalide{invalidCount > 1 ? "s" : ""}
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {warningCount} avertissement{warningCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {(preview.missingColumns.length > 0 || preview.unknownColumns.length > 0) && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-xs space-y-1">
                    {preview.missingColumns.length > 0 && (
                      <p className="font-medium text-amber-800">
                        Colonnes obligatoires manquantes : {preview.missingColumns.join(", ")}
                      </p>
                    )}
                    {preview.unknownColumns.length > 0 && (
                      <p className="text-amber-700">
                        Colonnes ignorées : {preview.unknownColumns.join(", ")}
                      </p>
                    )}
                  </div>
                )}

                <div className="max-h-80 overflow-auto rounded-xl border border-brand/12">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-brand/5">
                        <th className="w-12 px-2 py-2 text-left font-semibold text-muted-foreground">#</th>
                        {allHeaders.map((h) => (
                          <th key={h} className="px-2 py-2 text-left font-semibold text-foreground whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                        <th className="w-32 px-2 py-2 text-left font-semibold text-muted-foreground">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row) => {
                        const hasErrors = row.errors.length > 0;
                        const hasWarnings = row.warnings.length > 0;
                        return (
                          <tr
                            key={row.index}
                            className={cn(
                              "border-t border-brand/8 transition-colors",
                              hasErrors ? "bg-red-50/60" : hasWarnings ? "bg-amber-50/40" : "hover:bg-brand/3",
                            )}
                          >
                            <td className="px-2 py-1.5 text-muted-foreground font-mono">{row.index}</td>
                            {allHeaders.map((h) => (
                              <td key={h} className="max-w-48 truncate px-2 py-1.5 text-muted-foreground">
                                {row.data[h] || ""}
                              </td>
                            ))}
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-1">
                                {hasErrors ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                    <AlertCircle className="h-3 w-3" /> Erreur
                                  </span>
                                ) : hasWarnings ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                    <AlertTriangle className="h-3 w-3" /> Attention
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                                    <CheckCircle2 className="h-3 w-3" /> Valide
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {preview.rows.some((r) => r.errors.length > 0 || r.warnings.length > 0) && (
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-brand/12 bg-brand/3 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Détail des problèmes
                    </p>
                    {preview.rows.map((row) => {
                      const issues = [...row.errors.map((e) => ({ type: "error" as const, msg: e })), ...row.warnings.map((w) => ({ type: "warning" as const, msg: w }))];
                      if (issues.length === 0) return null;
                      return (
                        <div key={row.index} className="flex gap-2 text-[11px] leading-relaxed">
                          <span className="shrink-0 font-mono font-semibold text-muted-foreground">Ligne {row.index} :</span>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                            {issues.map((iss, j) => (
                              <span key={j} className={cn(iss.type === "error" ? "text-red-600" : "text-amber-600")}>
                                {iss.msg}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between rounded-xl bg-brand/5 px-4 py-3">
                  <div className="text-xs text-muted-foreground">
                    Fichier : <span className="font-medium text-foreground">{fileName}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStep("upload")}
                      className={cn(ghostPill, "h-8 gap-1.5 px-3 text-xs")}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Changer de fichier
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={validCount === 0}
                      className={cn(primaryPill, "h-8 gap-1.5 px-4 text-xs")}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Importer {validCount} étudiant{validCount > 1 ? "s" : ""}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === "confirming" && (
              <motion.div
                key="confirming"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-3 rounded-2xl border border-brand/12 px-6 py-16"
              >
                <Loader2 className="h-10 w-10 animate-spin text-brand" />
                <p className="font-semibold text-foreground">Importation en cours...</p>
                <p className="text-xs text-muted-foreground">
                  {validCount} étudiant{validCount > 1 ? "s" : ""} en cours d'importation
                </p>
              </motion.div>
            )}

            {step === "result" && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {result.imported} importé{result.imported > 1 ? "s" : ""}
                  </span>
                  {result.skipped > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {result.skipped} ignoré{result.skipped > 1 ? "s" : ""}
                    </span>
                  )}
                  {result.failed > result.skipped && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {result.failed - result.skipped} échec{(result.failed - result.skipped) > 1 ? "s" : ""}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    Traité en {result.processingTimeMs} ms
                  </span>
                </div>

                {result.errors.length > 0 && (
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-red-200 bg-red-50/50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-red-700 mb-1">
                      Journal des erreurs
                    </p>
                    {result.errors.map((err, i) => (
                      <div key={i} className="flex gap-2 text-[11px]">
                        <span className="shrink-0 font-mono font-semibold text-red-600">Ligne {err.index} :</span>
                        <span className="text-red-700">{err.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 rounded-xl bg-brand/5 px-4 py-3">
                  <button onClick={handleClose} className={cn(primaryPill, "h-8 px-4 text-xs")}>
                    Terminé
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
