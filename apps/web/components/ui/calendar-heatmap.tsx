"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import type { ClassNames, CustomComponents } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type UnionKeys<T> = T extends T ? keyof T : never;
type Expand<T> = T extends T ? { [K in keyof T]: T[K] } : never;
type OneOf<T extends object[]> = {
  [K in keyof T]: Expand<
    T[K] & Partial<Record<Exclude<UnionKeys<T[number]>, keyof T[K]>, never>>
  >;
}[number];

export type Classname = string;
export type WeightedDateEntry = {
  date: Date;
  weight: number;
};

interface IDatesPerVariant {
  datesPerVariant: Date[][];
}
interface IWeightedDatesEntry {
  weightedDates: WeightedDateEntry[];
}

type VariantDatesInput = OneOf<[IDatesPerVariant, IWeightedDatesEntry]>;

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  variantClassnames: Classname[];
} & VariantDatesInput;

function useModifiers(
  variantClassnames: Classname[],
  datesPerVariant: Date[][],
): [Record<string, Date[]>, Record<string, string>] {
  const variantLabels = variantClassnames.map((_, idx) => `__variant${idx}`);

  const modifiers: Record<string, Date[]> = {};
  const modifiersClassNames: Record<string, string> = {};

  variantLabels.forEach((key, index) => {
    modifiers[key] = datesPerVariant[index] ?? [];
    modifiersClassNames[key] = variantClassnames[index] ?? "";
  });

  return [modifiers, modifiersClassNames];
}

function categorizeDatesPerVariant(
  weightedDates: WeightedDateEntry[],
  noOfVariants: number,
) {
  if (weightedDates.length === 0) {
    return Array.from({ length: noOfVariants }, () => [] as Date[]);
  }

  const sorted = [...weightedDates].sort((a, b) => a.weight - b.weight);
  const categorized = Array.from({ length: noOfVariants }, () => [] as Date[]);
  const minVal = sorted[0]!.weight;
  const maxVal = sorted[sorted.length - 1]!.weight;
  const range = minVal === maxVal ? 1 : (maxVal - minVal) / noOfVariants;

  sorted.forEach((entry) => {
    const category = Math.min(
      Math.floor((entry.weight - minVal) / range),
      noOfVariants - 1,
    );
    categorized[category]!.push(entry.date);
  });

  return categorized;
}

function CalendarHeatmap({
  variantClassnames,
  datesPerVariant,
  weightedDates,
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const noOfVariants = variantClassnames.length;

  const resolvedDatesPerVariant =
    datesPerVariant ??
    categorizeDatesPerVariant(weightedDates ?? [], noOfVariants);

  const [modifiers, modifiersClassNames] = useModifiers(
    variantClassnames,
    resolvedDatesPerVariant,
  );

  const defaultClassNames: Partial<ClassNames> = {
    months: "flex flex-col sm:flex-row gap-y-4 sm:gap-x-4",
    month: "space-y-4",
    month_caption: "flex justify-center pt-1 relative items-center",
    caption_label: "text-sm font-medium",
    nav: "space-x-1 flex items-center",
    button_previous: cn(
      buttonVariants({ variant: "outline" }),
      "absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
    ),
    button_next: cn(
      buttonVariants({ variant: "outline" }),
      "absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
    ),
    month_grid: "w-full border-collapse space-y-1",
    weekdays: "flex",
    weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
    week: "flex w-full mt-2",
    day: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
    day_button: cn(
      buttonVariants({ variant: "ghost" }),
      "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
    ),
    today: "bg-accent text-accent-foreground",
    outside: "text-muted-foreground opacity-50",
    disabled: "text-muted-foreground opacity-50",
    hidden: "invisible",
    ...classNames,
  };

  const defaultComponents: Partial<CustomComponents> = {
    Chevron: ({ orientation, ...rest }) =>
      orientation === "left" ? (
        <ChevronLeft className="h-4 w-4" {...rest} />
      ) : (
        <ChevronRight className="h-4 w-4" {...rest} />
      ),
  };

  return (
    <DayPicker
      modifiers={modifiers}
      modifiersClassNames={modifiersClassNames}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={defaultClassNames}
      components={defaultComponents}
      {...props}
    />
  );
}
CalendarHeatmap.displayName = "CalendarHeatmap";

export { CalendarHeatmap };
