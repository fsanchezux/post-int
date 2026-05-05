"use client";

import { useEffect, useRef } from "react";
import "gridstack/dist/gridstack.min.css";

export type WidgetDef = {
  id: string;
  defaultPos: { x: number; y: number; w: number; h: number };
  minW?: number;
  minH?: number;
  content: React.ReactNode;
};

const DEFAULT_LAYOUT_KEY = "pmw:widget-layout-v1";

export function WidgetGrid({
  widgets,
  layoutKey = DEFAULT_LAYOUT_KEY,
}: {
  widgets: WidgetDef[];
  layoutKey?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      const mod = await import("gridstack");
      const GridStack = mod.GridStack;
      if (cancelled || !containerRef.current) return;

      const grid = GridStack.init(
        {
          column: 12,
          cellHeight: 70,
          margin: 10,
          marginUnit: "px",
          float: false,
          handle: ".widget-drag-handle",
          resizable: { handles: "se,sw,e,w,s" },
          minRow: 1,
        },
        containerRef.current
      );

      try {
        const raw = window.localStorage.getItem(layoutKey);
        if (raw) {
          const layout: Array<{ id: string; x: number; y: number; w: number; h: number }> =
            JSON.parse(raw);
          for (const item of layout) {
            const el = containerRef.current!.querySelector(`[gs-id="${item.id}"]`);
            if (el) {
              grid.update(el as HTMLElement, {
                x: item.x,
                y: item.y,
                w: item.w,
                h: item.h,
              });
            }
          }
        }
      } catch {}

      const save = () => {
        const items = grid.save(false) as Array<{
          id?: string;
          x?: number;
          y?: number;
          w?: number;
          h?: number;
        }>;
        const layout = items
          .filter((i) => i.id)
          .map((i) => ({ id: i.id!, x: i.x ?? 0, y: i.y ?? 0, w: i.w ?? 1, h: i.h ?? 1 }));
        window.localStorage.setItem(layoutKey, JSON.stringify(layout));
      };

      grid.on("change", save);
      grid.on("resizestop", save);
      grid.on("dragstop", save);

      gridRef.current = grid;
      cleanup = () => grid.destroy(false);
    })();

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <div ref={containerRef} className="grid-stack">
      {widgets.map((w) => (
        <div
          key={w.id}
          className="grid-stack-item"
          gs-id={w.id}
          gs-x={String(w.defaultPos.x)}
          gs-y={String(w.defaultPos.y)}
          gs-w={String(w.defaultPos.w)}
          gs-h={String(w.defaultPos.h)}
          gs-min-w={String(w.minW ?? 2)}
          gs-min-h={String(w.minH ?? 1)}
        >
          <div className="grid-stack-item-content">{w.content}</div>
        </div>
      ))}
    </div>
  );
}
