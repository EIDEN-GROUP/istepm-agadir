import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Nombre de lignes affichées par page dans les tableaux du dashboard. */
export const TABLE_PAGE_SIZE = 5;

/**
 * Découpe une liste déjà filtrée en pages.
 *
 * `resetKey` : passer les filtres/recherche concaténés   un changement renvoie
 * en page 1, sinon on peut atterrir sur une page vide après avoir filtré.
 * Le clamp couvre le cas d'une liste qui rétrécit (suppression d'une ligne).
 */
export function usePagination<T>(
  items: T[],
  resetKey?: unknown,
  pageSize: number = TABLE_PAGE_SIZE,
) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  return { page, setPage, pageCount, pageItems, total: items.length, pageSize };
}

const pagerButton =
  "grid h-8 w-8 place-items-center rounded-full border border-[#28396C]/15 bg-card text-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40";

/** Pied de tableau : « 1–5 sur 23 familles » + précédent / suivant. */
export function TablePagination({
  page,
  pageCount,
  total,
  pageSize,
  onPage,
  label,
  className,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  label: string;
  className?: string;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-[#28396C]/10 px-5 py-3",
        className,
      )}
    >
      <p className="text-xs tabular-nums text-muted-foreground">
        {from}–{to} sur {total} {label}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className={pagerButton}
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-semibold tabular-nums text-foreground">
          Page {page} / {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount}
          className={pagerButton}
          aria-label="Page suivante"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
