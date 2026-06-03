"use client";

import { useEffect, useRef, useState } from "react";
import { useBoardUI } from "./BoardUIContext";

type Props = {
  value: number;
  onChange: (v: number) => void;
  onFit?: () => void;
};

export function VerticalZoom({ value, onChange, onFit }: Props) {
  const { search, setSearch } = useBoardUI();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [mobileSearchOpen]);

  return (
    <div className="absolute top-6 right-4 z-20 flex flex-col items-center gap-2 select-none">
      <button
        onClick={() => onChange(Math.min(2, value + 0.1))}
        className="w-7 h-7 rounded-full bg-blue-100/60 hover:bg-blue-200/80 text-blue-700 flex items-center justify-center text-lg leading-none transition-colors"
        aria-label="Zoom in"
      >
        +
      </button>
      <input
        type="range"
        min="0.2"
        max="2"
        step="0.05"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label="Zoom level"
        className="vertical-zoom"
      />
      <button
        onClick={() => onChange(Math.max(0.2, value - 0.1))}
        className="w-7 h-7 rounded-full bg-blue-100/60 hover:bg-blue-200/80 text-blue-700 flex items-center justify-center text-lg leading-none transition-colors"
        aria-label="Zoom out"
      >
        −
      </button>
      <button
        onClick={onFit}
        className="text-[10px] px-2 py-0.5 rounded bg-blue-100/60 hover:bg-blue-200/80 text-blue-700 transition-colors"
        title={onFit ? "Fit to screen" : "Zoom level"}
      >
        {Math.round(value * 100)}%
      </button>

      {/* Mobile-only actions: create posit + search toggle */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("shortcut:new-task"))}
        className="sm:hidden mt-2 flex items-center justify-center rounded-full transition-transform hover:scale-105"
        style={{ width: 34, height: 34, background: "#f6c343", color: "#111" }}
        aria-label="Create posit"
        title="Create posit"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <line x1="9" y1="3" x2="9" y2="15" />
          <line x1="3" y1="9" x2="15" y2="9" />
        </svg>
      </button>
      <button
        onClick={() => setMobileSearchOpen((o) => !o)}
        className="sm:hidden flex items-center justify-center rounded-full transition-transform hover:scale-105"
        style={{ width: 34, height: 34, background: "#9bccd0", color: "#111" }}
        aria-label="Search posits"
        title="Search posits"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      {/* Floating mobile search input, anchored to the left of the buttons */}
      {mobileSearchOpen && (
        <div className="sm:hidden absolute right-12 top-0 w-56 max-w-[60vw] z-30">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => {
              if (!search) setMobileSearchOpen(false);
            }}
            placeholder="Search posits..."
            className="w-full pl-4 pr-3 py-2 rounded-full bg-blue-100/90 text-sm placeholder:text-blue-400/70 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow"
          />
        </div>
      )}
    </div>
  );
}
