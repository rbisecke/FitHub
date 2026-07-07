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
        <path d="M6.5 7v10M3.5 9v6M17.5 7v10M20.5 9v6M6.5 12h11" />
      </svg>
    );
  },
);

BarbellIcon.displayName = "BarbellIcon";

export { BarbellIcon };
