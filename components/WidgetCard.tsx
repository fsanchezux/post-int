"use client";

type Props = {
  title: React.ReactNode;
  toolbar?: React.ReactNode;
  summary?: React.ReactNode;
  detail?: React.ReactNode;
};

export function WidgetCard({ title, toolbar, summary, detail }: Props) {
  return (
    <div className="widget-card bg-white/85 backdrop-blur rounded-2xl border border-black/10 shadow-sm h-full w-full flex flex-col overflow-hidden">
      <div className="widget-drag-handle cursor-move flex items-center justify-between gap-2 px-3 py-2 border-b border-black/10 select-none">
        <div className="text-sm font-semibold uppercase tracking-wide opacity-70 truncate">
          {title}
        </div>
        {toolbar && (
          <div className="widget-toolbar flex items-center gap-1 shrink-0">
            {toolbar}
          </div>
        )}
      </div>
      {(summary || detail) && (
        <div className="widget-body flex-1 overflow-auto px-3 py-2 text-sm">
          {summary && <div className="widget-summary">{summary}</div>}
          {detail && <div className="widget-detail mt-2">{detail}</div>}
        </div>
      )}
    </div>
  );
}
