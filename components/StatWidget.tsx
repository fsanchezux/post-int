"use client";

type Props = {
  title: string;
  value: string;
  caption?: string;
  background: string;
};

export function StatWidget({ title, value, caption, background }: Props) {
  return (
    <div
      className="widget-card h-full w-full rounded-2xl flex flex-col overflow-hidden"
      style={{ background }}
    >
      <div className="widget-drag-handle cursor-move flex items-center justify-between gap-2 px-4 pt-4 select-none">
        <div className="text-[11px] font-semibold uppercase tracking-widest opacity-70 truncate">
          {title}
        </div>
      </div>
      <div className="flex-1 px-4 pb-4 flex flex-col justify-end">
        <div className="text-4xl font-bold leading-none">{value}</div>
        {caption && <div className="mt-2 text-xs opacity-70">{caption}</div>}
      </div>
    </div>
  );
}
