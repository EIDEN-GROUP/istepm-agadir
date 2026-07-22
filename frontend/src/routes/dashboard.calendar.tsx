import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api";
import { softCard } from "@/lib/dash-ui";
import { cn } from "@/lib/utils";

function DashboardCalendar() {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: holidays = [] } = useQuery({
    queryKey: ["holidays"],
    queryFn: () =>
      api.get<Array<{ id: string; date: string; label: string }>>("/holidays"),
  });

  const { data: vacations = [] } = useQuery({
    queryKey: ["vacations"],
    queryFn: () =>
      api.get<
        Array<{ id: string; startDate: string; endDate: string; label: string }>
      >("/holidays/vacations"),
  });

  const { data: planifications = [] } = useQuery({
    queryKey: ["planifications"],
    queryFn: () =>
      api.get<
        Array<{
          id: string;
          date: string;
          time: string;
          title: string;
          detail: string;
          tone: string;
        }>
      >("/planifications"),
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const months = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];

  const isHoliday = (d: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return holidays.find((h) => h.date === dateStr);
  };

  const isVacation = (d: number) => {
    const date = new Date(year, month, d);
    return vacations.find(
      (v) => date >= new Date(v.startDate) && date <= new Date(v.endDate),
    );
  };

  const dayPlanifs = (d: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return planifications.filter((p) => p.date === dateStr);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Calendrier
          </p>
          <h1 className="mt-1 font-display text-3xl tracking-tight text-foreground">
            {months[month]} {year}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (month === 0) {
                setMonth(11);
                setYear(year - 1);
              } else setMonth(month - 1);
            }}
            className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            Précédent
          </button>
          <button
            onClick={() => {
              setMonth(new Date().getMonth());
              setYear(new Date().getFullYear());
            }}
            className="rounded-full bg-[#28396C] px-4 py-2 text-sm text-white"
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => {
              if (month === 11) {
                setMonth(0);
                setYear(year + 1);
              } else setMonth(month + 1);
            }}
            className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            Suivant
          </button>
        </div>
      </header>

      <div className={cn(softCard, "p-4")}>
        <div className="grid grid-cols-7 gap-px bg-border">
          {["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"].map((d) => (
            <div
              key={d}
              className="bg-muted/30 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {d}
            </div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-card p-3" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const holiday = isHoliday(d);
            const vacation = isVacation(d);
            const plans = dayPlanifs(d);
            const isToday =
              d === new Date().getDate() &&
              month === new Date().getMonth() &&
              year === new Date().getFullYear();
            return (
              <div
                key={d}
                className={cn(
                  "min-h-[100px] bg-card p-2",
                  isToday && "ring-2 ring-[#B5E18B] ring-inset",
                )}
              >
                <span
                  className={cn(
                    "text-sm font-semibold",
                    holiday
                      ? "text-[#E25C5C]"
                      : vacation
                        ? "text-[#7BA5D9]"
                        : "text-foreground",
                  )}
                >
                  {d}
                </span>
                {holiday && (
                  <p className="mt-1 text-[10px] font-medium text-[#E25C5C]">
                    {holiday.label}
                  </p>
                )}
                {plans.map((p) => (
                  <p
                    key={p.id}
                    className={cn(
                      "mt-0.5 truncate rounded px-1 text-[10px] font-medium text-white",
                      {
                        "bg-violet-500": p.tone === "violet",
                        "bg-emerald-500": p.tone === "emerald",
                        "bg-amber-500": p.tone === "amber",
                        "bg-zinc-500": p.tone === "zinc",
                      },
                    )}
                  >
                    {p.time.slice(0, 5)} {p.title}
                  </p>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/calendar")({
  component: DashboardCalendar,
});
