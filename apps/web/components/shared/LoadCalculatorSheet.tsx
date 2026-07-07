"use client";

import { useState, useEffect } from "react";
import { useReducedMotion } from "motion/react";
import { LoadCalculator } from "./LoadCalculator";

interface Props {
  movementName: string;
  bestKg: number;
  currentKg?: number | null;
  isStale?: boolean;
  initialPct?: number;
  weightUnit?: string;
  onClose: () => void;
}

export function LoadCalculatorSheet({
  movementName,
  bestKg,
  currentKg,
  isStale,
  initialPct = 80,
  weightUnit = "kg",
  onClose,
}: Props) {
  const [visible, setVisible] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 240);
  };

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={`Load calculator — ${movementName}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.6)" }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-[20px]"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderBottom: "none",
          maxHeight: "60dvh",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: prefersReducedMotion
            ? "none"
            : "transform 220ms cubic-bezier(.2,.9,.3,1)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        data-testid="calculator-sheet"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-[12px] pb-[8px]">
          <div
            className="w-[36px] h-[4px] rounded-full"
            style={{ background: "var(--border)" }}
          />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-[20px] pb-[12px]"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <span
            className="font-sans font-semibold text-[14px]"
            style={{ color: "var(--text)" }}
          >
            {movementName}
          </span>
          <button
            onClick={handleClose}
            aria-label="Close calculator"
            className="font-data text-[18px] leading-none"
            style={{ color: "var(--muted)" }}
          >
            ×
          </button>
        </div>

        {/* Calculator body */}
        <div className="px-[20px] pt-[16px] pb-[20px] overflow-y-auto">
          <LoadCalculator
            mode="sheet"
            bestKg={bestKg}
            currentKg={currentKg}
            isStale={isStale}
            initialPct={initialPct}
            weightUnit={weightUnit}
          />
        </div>
      </div>
    </div>
  );
}
