import type { ReactNode } from "react";

export function PageHeader({ title, intro, actions, eyebrow }: { title: ReactNode; intro?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1.5 text-[12.5px] text-muted">{eyebrow}</div> : null}
        <h1 className="font-display text-[1.9rem] leading-[1.1] font-medium text-ink sm:text-[2.15rem]">{title}</h1>
        {intro ? <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted">{intro}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
