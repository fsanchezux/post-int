"use client";

type Props = {
  label: string;
  text: string;
  background: string;
  emoji?: string;
};

export function TextStatWidget({ label, text, background, emoji }: Props) {
  return (
    <div
      className="widget-card h-full w-full rounded-2xl flex flex-col overflow-hidden"
      style={{ background }}
    >
      <div className="widget-drag-handle cursor-move flex items-center justify-between gap-2 px-4 pt-4 select-none">
        <div className="text-[11px] font-semibold uppercase tracking-widest opacity-70 truncate">
          {label}
        </div>
        {emoji && <span className="text-base opacity-80">{emoji}</span>}
      </div>
      <div className="flex-1 px-4 pb-4 flex flex-col justify-end">
        <p className="text-base font-medium leading-snug">{text}</p>
      </div>
    </div>
  );
}
