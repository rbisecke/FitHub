interface PageHeaderProps {
  gitCommand: string;
  title: string;
  sub?: string;
  action?: React.ReactNode;
}

export function PageHeader({
  gitCommand,
  title,
  sub,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex items-end justify-between flex-wrap gap-4 mb-6 animate-fadeUp">
      <div>
        <p className="font-data text-[13px] text-[var(--accent)] mb-1.5">
          {gitCommand}
        </p>
        <h1 className="font-heading text-[30px] text-[var(--foreground)] m-0">
          {title}
        </h1>
        {sub && (
          <p className="text-[14px] text-[var(--muted-foreground)] mt-2 mb-0">
            {sub}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
