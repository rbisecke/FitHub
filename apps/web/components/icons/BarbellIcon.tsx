import { forwardRef } from "react";
import type { LucideProps } from "lucide-react";

const BarbellIcon = forwardRef<SVGSVGElement, LucideProps>(
  (
    {
      size = 24,
      color = "currentColor",
      strokeWidth = 2,
      absoluteStrokeWidth,
      className,
      ...props
    },
    ref,
  ) => {
    const sw = absoluteStrokeWidth
      ? (Number(strokeWidth) * 24) / Number(size)
      : strokeWidth;

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
      >
        <path d="M6.5 6.5l11 11M4 9l-1.5 1.5a1.5 1.5 0 000 2.1l1.9 1.9a1.5 1.5 0 002.1 0L9 15M15 9l1.5-1.5a1.5 1.5 0 012.1 0l1.9 1.9a1.5 1.5 0 010 2.1L20 13M2.5 14.5L4 16M20 8l1.5 1.5" />
      </svg>
    );
  },
);

BarbellIcon.displayName = "BarbellIcon";

export { BarbellIcon };
