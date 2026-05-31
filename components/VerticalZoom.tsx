"use client";

type Props = {
  value: number;
  onChange: (v: number) => void;
  onFit?: () => void;
};

export function VerticalZoom({ value, onChange, onFit }: Props) {
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
    </div>
  );
}
