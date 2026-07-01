import Link from "next/link";

export function EmptyRecordSlot({ href = "/log/new" }: { href?: string }) {
  return (
    <div
      className="flex flex-col justify-start rounded-[14px] p-[14px] min-h-[110px]"
      style={{ background: "transparent", border: "1px dashed var(--border)" }}
    >
      <div className="font-data text-[12px] font-bold text-[var(--muted)]">
        No record
      </div>
      <Link
        href={href}
        className="font-data text-[12px] mt-[3px]"
        style={{ color: "var(--accent)" }}
      >
        log it →
      </Link>
    </div>
  );
}
