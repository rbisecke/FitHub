"use client";

interface HeroNumberInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

/**
 * Large 72px Archivo Black number input — the signature weight entry interaction.
 * On mobile, inputMode="decimal" triggers the numeric keyboard.
 */
export function HeroNumberInput({
  value,
  onChange,
  placeholder = "0",
}: HeroNumberInputProps) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent border-none outline-none font-heading text-[72px] leading-none text-center text-[var(--foreground)] placeholder:text-[var(--border)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
}
