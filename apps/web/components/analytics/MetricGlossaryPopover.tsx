"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type MetricKey = "acwr" | "ctl" | "atl" | "tsb";

const METRICS: Record<
  MetricKey,
  { title: string; acronym: string; body: string; formula: string }
> = {
  acwr: {
    title: "Acute:Chronic Workload Ratio",
    acronym: "ACWR",
    body: "Compares how hard you trained this week versus your average over the past 4 weeks. A ratio between 0.8 and 1.3 is the optimal training zone. Below 0.8 means you're undertraining relative to your base — room to push. Above 1.3 means you're spiking load too fast — injury risk increases.",
    formula: "ACWR = ATL ÷ CTL",
  },
  ctl: {
    title: "Chronic Training Load",
    acronym: "CTL — Fitness",
    body: "Your 42-day exponentially weighted training average. Think of it as your current fitness base. It builds slowly over months of consistent training and drops quickly if you take extended time off. A higher CTL means you can handle more training volume.",
    formula: "CTL_t = CTL_(t−1) × e^(−1/42) + Load_t × (1 − e^(−1/42))",
  },
  atl: {
    title: "Acute Training Load",
    acronym: "ATL — Fatigue",
    body: "Your 7-day exponentially weighted training average. This is your current fatigue level. It spikes quickly after hard weeks and drops after rest. High ATL after a training block is expected and normal — it means you've been working hard.",
    formula: "ATL_t = ATL_(t−1) × e^(−1/7) + Load_t × (1 − e^(−1/7))",
  },
  tsb: {
    title: "Training Stress Balance",
    acronym: "TSB — Form",
    body: "Fitness minus Fatigue (CTL minus ATL). A positive TSB means you're rested and peaked — ideal before a competition or test. A negative TSB means you're carrying fatigue — normal during a training block. The sweet spot for competition peaking is typically +5 to +25.",
    formula: "TSB_t = CTL_(t−1) − ATL_(t−1)",
  },
};

const METRIC_ORDER: MetricKey[] = ["acwr", "ctl", "atl", "tsb"];

interface Props {
  defaultMetric?: MetricKey;
  /** Content rendered inside the trigger button */
  triggerContent: React.ReactNode;
  /** Extra classes applied to the trigger button */
  triggerClassName?: string;
  /** aria-label for the trigger button */
  triggerAriaLabel?: string;
}

export function MetricGlossaryPopover({
  triggerContent,
  triggerClassName,
  triggerAriaLabel,
}: Props) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={triggerAriaLabel ?? "Learn more about training metrics"}
        className={cn(
          "focus-visible:ring-1 focus-visible:ring-[--accent] outline-none",
          triggerClassName,
        )}
      >
        {triggerContent}
      </PopoverTrigger>
      <PopoverContent
        role="dialog"
        aria-label="Training metrics glossary"
        className="w-80 max-h-[70vh] overflow-y-auto p-0 bg-[--surface] border-[--border] text-[--text]"
        align="center"
      >
        <div className="p-4 space-y-4">
          <p className="text-sm font-semibold text-[--text]">
            Training Metrics
          </p>
          {METRIC_ORDER.map((key) => {
            const m = METRICS[key];
            return (
              <div key={key} id={`metric-${key}`} className="space-y-1">
                <p className="text-xs font-semibold text-[--accent] font-mono">
                  {m.acronym}
                </p>
                <p className="text-xs font-medium text-[--text]">{m.title}</p>
                <p className="text-xs text-[--muted] leading-relaxed">
                  {m.body}
                </p>
                <details className="group">
                  <summary className="text-[10px] text-[--muted] cursor-pointer hover:text-[--text] list-none flex items-center gap-1 mt-1">
                    <span className="transition-transform group-open:rotate-90">
                      ▶
                    </span>
                    Show formula
                  </summary>
                  <p className="font-mono text-[10px] text-[--muted] mt-1 pl-3 break-all">
                    {m.formula}
                  </p>
                </details>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
