"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Project, ProjectImage, ProjectLink, ProjectNote } from "@/lib/types";
import { POSTIT_YELLOW, postItStyle, darken, lighten, isDarkColor } from "@/lib/colors";
import { uid } from "@/lib/storage";
import { PostIt } from "./PostIt";
import { PositActionBar } from "./PositActionBar";
import { VerticalZoom } from "./VerticalZoom";

type Props = {
  project: Project;
  onUpdate: (id: string, patch: Partial<Project>) => void;
  onComplete: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (project: Project) => void;
  onBack: () => void;
};

const POSIT_W = 384;
const NOTE_W = 260;
const NOTE_H = 90;
const GAP_X = 220;
const GAP_Y = 30;
const IMG_W = 200;
const IMG_H = 200;
const TEXT_NOTE_W = 240;
const TEXT_NOTE_H = 130;

function normalizeLinks(project: Project): ProjectLink[] {
  const raw = project.links ?? (project.link ? [{ url: project.link }] : []);
  return raw
    .map((l) => (typeof l === "string" ? { url: l, label: undefined } : l))
    .filter((l) => l && l.url) as ProjectLink[];
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PositDetailView({
  project,
  onUpdate,
  onComplete,
  onRemove,
  onEdit,
  onBack,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [size, setSize] = useState({ w: 1200, h: 700 });
  const [zoom, setZoom] = useState<number>(project.detailZoom ?? 1);

  useEffect(() => {
    if (project.detailZoom !== undefined && project.detailZoom !== zoom) {
      // sync local zoom when project changes (mounting different posit)
      // but only when it differs from current to avoid loops
      setZoom(project.detailZoom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  // Persist zoom on change (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      if (project.detailZoom !== zoom) {
        onUpdate(project.id, { detailZoom: zoom });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [zoom, project.id, project.detailZoom, onUpdate]);

  useEffect(() => {
    const measure = () => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    measure();
    const obs = new ResizeObserver(measure);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  const links = useMemo(() => normalizeLinks(project), [project]);
  const images = useMemo(() => project.images ?? [], [project.images]);
  const notes = useMemo(() => project.notes ?? [], [project.notes]);

  const positHeight = project.height ?? 460;
  const defaultFocusedX = Math.max(40, (size.w - POSIT_W) / 2);
  const defaultFocusedY = Math.max(40, (size.h - positHeight) / 2 - 40);

  const focusedX = project.detailPosition?.x ?? defaultFocusedX;
  const focusedY = project.detailPosition?.y ?? defaultFocusedY;

  const noteAnchors = links.map((link, i) => {
    if (link.x !== undefined && link.y !== undefined) {
      return { link, idx: i, x: link.x, y: link.y };
    }
    const onLeft = i % 2 === 0;
    const stackIdx = Math.floor(i / 2);
    const dx = onLeft ? focusedX - GAP_X - NOTE_W : focusedX + POSIT_W + GAP_X;
    const dy = focusedY + 20 + stackIdx * (NOTE_H + GAP_Y);
    return { link, idx: i, x: Math.max(20, dx), y: Math.max(20, dy) };
  });

  const imageAnchors = images.map((img, i) => {
    if (img.x !== undefined && img.y !== undefined) {
      return { img, idx: i, x: img.x, y: img.y };
    }
    const stackIdx = Math.floor(i / 2);
    const onLeft = i % 2 === 1;
    const dx = onLeft ? focusedX - GAP_X - IMG_W : focusedX + POSIT_W + GAP_X;
    const dy = focusedY + 240 + stackIdx * (IMG_H + GAP_Y);
    return { img, idx: i, x: Math.max(20, dx), y: Math.max(20, dy) };
  });

  const noteAnchorsText = notes.map((n, i) => {
    if (n.x !== undefined && n.y !== undefined) {
      return { note: n, idx: i, x: n.x, y: n.y };
    }
    const onLeft = i % 2 === 0;
    const stackIdx = Math.floor(i / 2);
    const dx = onLeft ? focusedX - GAP_X - TEXT_NOTE_W : focusedX + POSIT_W + GAP_X;
    const dy = focusedY + positHeight - 60 + stackIdx * (TEXT_NOTE_H + GAP_Y);
    return { note: n, idx: i, x: Math.max(20, dx), y: Math.max(20, dy) };
  });

  const updateLinkPosition = useCallback(
    (idx: number, x: number, y: number) => {
      const next = links.map((l, i) => (i === idx ? { ...l, x, y } : l));
      onUpdate(project.id, { links: next, link: undefined });
    },
    [links, onUpdate, project.id]
  );

  const updateImagePosition = useCallback(
    (idx: number, x: number, y: number) => {
      const next = images.map((img, i) => (i === idx ? { ...img, x, y } : img));
      onUpdate(project.id, { images: next });
    },
    [images, onUpdate, project.id]
  );

  const updateImageSize = useCallback(
    (idx: number, width: number, height: number) => {
      const next = images.map((img, i) => (i === idx ? { ...img, width, height } : img));
      onUpdate(project.id, { images: next });
    },
    [images, onUpdate, project.id]
  );

  const updateNotePosition = useCallback(
    (idx: number, x: number, y: number) => {
      const next = notes.map((n, i) => (i === idx ? { ...n, x, y } : n));
      onUpdate(project.id, { notes: next });
    },
    [notes, onUpdate, project.id]
  );

  const updateNoteText = useCallback(
    (idx: number, text: string) => {
      const next = notes.map((n, i) => (i === idx ? { ...n, text } : n));
      onUpdate(project.id, { notes: next });
    },
    [notes, onUpdate, project.id]
  );

  const addNote = useCallback(() => {
    const newNote: ProjectNote = {
      id: uid(),
      text: "",
      x: focusedX + POSIT_W + 60,
      y: focusedY + 320 + notes.length * 30,
    };
    onUpdate(project.id, { notes: [...notes, newNote] });
  }, [notes, onUpdate, project.id, focusedX, focusedY]);

  const removeNote = useCallback(
    (idx: number) => {
      const next = notes.filter((_, i) => i !== idx);
      onUpdate(project.id, { notes: next });
    },
    [notes, onUpdate, project.id]
  );

  const addImages = useCallback(
    async (files: File[]) => {
      const imgs: ProjectImage[] = [];
      for (const f of files) {
        if (!f.type.startsWith("image/")) continue;
        const src = await readFileAsDataURL(f);
        imgs.push({ id: uid(), src });
      }
      if (imgs.length === 0) return;
      onUpdate(project.id, { images: [...images, ...imgs] });
    },
    [images, onUpdate, project.id]
  );

  // Paste handler — listen for clipboard images
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.kind === "file" && it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) {
        e.preventDefault();
        addImages(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addImages]);

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) await addImages(files);
    e.target.value = "";
  };

  // Wrap onUpdate so PostIt drag writes to detailPosition.
  const detailOnUpdate = (id: string, patch: Partial<Project>) => {
    if (patch.position !== undefined) {
      const { position, ...rest } = patch;
      onUpdate(id, { ...rest, detailPosition: position });
    } else {
      onUpdate(id, patch);
    }
  };

  const focusedProject: Project = {
    ...project,
    position: { x: focusedX, y: focusedY },
    height: positHeight,
  };

  const projectStyle = postItStyle(project);
  const cardBg = projectStyle.bg;
  const textPref = project.textColor ?? "auto";
  const onDark =
    textPref === "light" ? true : textPref === "dark" ? false : isDarkColor(cardBg);
  const progressFill = onDark ? lighten(cardBg, 0.55) : darken(cardBg, 0.35);
  const connectorStroke = cardBg;
  const connectorDot = cardBg;

  return (
    <div
      ref={containerRef}
      className="whiteboard relative"
      style={{ minHeight: "75vh" }}
    >
      <VerticalZoom
        value={zoom}
        onChange={setZoom}
        onFit={() => setZoom(1)}
        onBack={onBack}
        backColor={cardBg}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onFilePicked}
      />

      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "top left",
          width: `${100 / zoom}%`,
          minHeight: `${75 / zoom}vh`,
          position: "relative",
        }}
      >
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 1, pointerEvents: "none" }}
        >
          {noteAnchors.map(({ x, y, idx }) => {
            const noteCenterX = x + NOTE_W / 2;
            const noteOnLeft = noteCenterX < focusedX + POSIT_W / 2;
            const startX = focusedX + (noteOnLeft ? 0 : POSIT_W);
            const startY = focusedY + 80;
            const endX = noteOnLeft ? x + NOTE_W : x;
            const endY = y + NOTE_H / 2;
            const midX = (startX + endX) / 2;
            const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
            return (
              <g key={`link-${idx}`}>
                <GenericConnectorPath
                  d={path}
                  idx={idx}
                  itemX={x}
                  itemY={y}
                  zoom={zoom}
                  stroke={connectorStroke}
                  onMove={updateLinkPosition}
                />
                <circle cx={startX} cy={startY} r="5" fill={connectorDot} pointerEvents="none" />
                <circle cx={endX} cy={endY} r="5" fill={connectorDot} pointerEvents="none" />
              </g>
            );
          })}
          {imageAnchors.map(({ x, y, idx }) => {
            const imgCenterX = x + IMG_W / 2;
            const imgOnLeft = imgCenterX < focusedX + POSIT_W / 2;
            const startX = focusedX + (imgOnLeft ? 0 : POSIT_W);
            const startY = focusedY + 180;
            const endX = imgOnLeft ? x + IMG_W : x;
            const endY = y + IMG_H / 2;
            const midX = (startX + endX) / 2;
            const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
            return (
              <g key={`img-${idx}`}>
                <GenericConnectorPath
                  d={path}
                  idx={idx}
                  itemX={x}
                  itemY={y}
                  zoom={zoom}
                  stroke={connectorStroke}
                  onMove={updateImagePosition}
                />
                <circle cx={startX} cy={startY} r="5" fill={connectorDot} pointerEvents="none" />
                <circle cx={endX} cy={endY} r="5" fill={connectorDot} pointerEvents="none" />
              </g>
            );
          })}
          {noteAnchorsText.map(({ x, y, idx }) => {
            const nCenterX = x + TEXT_NOTE_W / 2;
            const nOnLeft = nCenterX < focusedX + POSIT_W / 2;
            const startX = focusedX + (nOnLeft ? 0 : POSIT_W);
            const startY = focusedY + 140;
            const endX = nOnLeft ? x + TEXT_NOTE_W : x;
            const endY = y + TEXT_NOTE_H / 2;
            const midX = (startX + endX) / 2;
            const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
            return (
              <g key={`note-line-${idx}`}>
                <GenericConnectorPath
                  d={path}
                  idx={idx}
                  itemX={x}
                  itemY={y}
                  zoom={zoom}
                  stroke={connectorStroke}
                  onMove={updateNotePosition}
                />
                <circle cx={startX} cy={startY} r="5" fill={connectorDot} pointerEvents="none" />
                <circle cx={endX} cy={endY} r="5" fill={connectorDot} pointerEvents="none" />
              </g>
            );
          })}
        </svg>

        <div style={{ position: "relative", zIndex: 2 }}>
          <PostIt
            project={focusedProject}
            zoom={zoom}
            interactive={true}
            showImageStack={false}
            zIndex={5}
            onUpdate={detailOnUpdate}
          />

          {noteAnchors.map(({ link, idx, x, y }) => (
            <DraggableYellowNote
              key={`note-${idx}`}
              link={link}
              x={x}
              y={y}
              zoom={zoom}
              background={cardBg}
              foreground={projectStyle.text}
              onMove={(nx, ny) => updateLinkPosition(idx, nx, ny)}
            />
          ))}

          {imageAnchors.map(({ img, idx, x, y }) => (
            <DraggableImage
              key={`mb-${img.id}`}
              image={img}
              x={x}
              y={y}
              zoom={zoom}
              onMove={(nx, ny) => updateImagePosition(idx, nx, ny)}
              onResize={(nw, nh) => updateImageSize(idx, nw, nh)}
              onRemove={() => {
                const next = images.filter((_, i) => i !== idx);
                onUpdate(project.id, { images: next });
              }}
            />
          ))}

          {noteAnchorsText.map(({ note, idx, x, y }) => (
            <DraggableTextNote
              key={`tnote-${note.id}`}
              note={note}
              x={x}
              y={y}
              zoom={zoom}
              background={cardBg}
              foreground={projectStyle.text}
              onMove={(nx, ny) => updateNotePosition(idx, nx, ny)}
              onTextChange={(text) => updateNoteText(idx, text)}
              onRemove={() => removeNote(idx)}
            />
          ))}

          <div
            className="absolute z-20"
            style={{
              left: focusedX,
              top: focusedY + positHeight + 16,
              width: POSIT_W,
            }}
          >
            <div className="flex justify-center">
              <PositActionBar
                project={project}
                onUpdate={onUpdate}
                onComplete={onComplete}
                onRemove={onRemove}
                onEdit={onEdit}
                onAddNote={addNote}
                onAddImage={() => fileInputRef.current?.click()}
                onAfterRemove={onBack}
                onAfterComplete={onBack}
                background={cardBg}
                iconColor={progressFill}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Shared drag hook for items inside the scaled board
function useBoardDrag(
  ref: React.RefObject<HTMLElement | null>,
  zoom: number,
  onMove: (x: number, y: number) => void
) {
  const [dragging, setDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const dragMoved = useRef(false);

  useEffect(() => {
    if (!dragging) return;
    const onMouseMove = (e: MouseEvent) => {
      const parent = ref.current?.parentElement;
      if (!parent) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved.current = true;
      const parentRect = parent.getBoundingClientRect();
      const nx = Math.max(0, (e.clientX - parentRect.left - offset.current.x) / zoom);
      const ny = Math.max(0, (e.clientY - parentRect.top - offset.current.y) / zoom);
      onMove(nx, ny);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      e.preventDefault();
      const parent = ref.current?.parentElement;
      if (!parent) return;
      const dx = t.clientX - dragStart.current.x;
      const dy = t.clientY - dragStart.current.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved.current = true;
      const parentRect = parent.getBoundingClientRect();
      const nx = Math.max(0, (t.clientX - parentRect.left - offset.current.x) / zoom);
      const ny = Math.max(0, (t.clientY - parentRect.top - offset.current.y) / zoom);
      onMove(nx, ny);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, zoom, onMove, ref]);

  const startDrag = (clientX: number, clientY: number) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    offset.current = { x: clientX - rect.left, y: clientY - rect.top };
    dragStart.current = { x: clientX, y: clientY };
    dragMoved.current = false;
    setDragging(true);
  };

  return { dragging, dragMoved, startDrag };
}

function DraggableYellowNote({
  link,
  x,
  y,
  zoom,
  onMove,
  background,
  foreground,
}: {
  link: ProjectLink;
  x: number;
  y: number;
  zoom: number;
  onMove: (x: number, y: number) => void;
  background?: string;
  foreground?: string;
}) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const { dragging, dragMoved, startDrag } = useBoardDrag(ref, zoom, onMove);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    startDrag(t.clientX, t.clientY);
  };

  const onClick = (e: React.MouseEvent) => {
    if (dragMoved.current) {
      e.preventDefault();
      e.stopPropagation();
      dragMoved.current = false;
    }
  };

  const title = link.label || hostFromUrl(link.url);

  return (
    <a
      ref={ref}
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      draggable={false}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onClick={onClick}
      className="absolute block p-3 rounded-xl shadow-md hover:shadow-lg transition-shadow select-none"
      style={{
        left: x,
        top: y,
        width: NOTE_W,
        background: background ?? POSTIT_YELLOW,
        color: foreground ?? "#1c1c1c",
        cursor: dragging ? "grabbing" : "grab",
      }}
    >
      <div className="font-bold text-[16px] leading-tight pointer-events-none">{title}</div>
      <div className="text-[12px] mt-1 opacity-70 truncate pointer-events-none">
        Link to: {link.url.replace(/^https?:\/\//, "")}
      </div>
    </a>
  );
}

function DraggableImage({
  image,
  x,
  y,
  zoom,
  onMove,
  onResize,
  onRemove,
}: {
  image: ProjectImage;
  x: number;
  y: number;
  zoom: number;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { dragging, startDrag } = useBoardDrag(ref, zoom, onMove);
  const w = image.width ?? IMG_W;
  const h = image.height ?? IMG_H;
  const [resizing, setResizing] = useState(false);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    if (!resizing) return;
    const onMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizeStart.current.x) / zoom;
      const dy = (e.clientY - resizeStart.current.y) / zoom;
      const nw = Math.max(80, Math.min(900, resizeStart.current.w + dx));
      const nh = Math.max(80, Math.min(900, resizeStart.current.h + dy));
      onResize(nw, nh);
    };
    const onUp = () => setResizing(false);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing, zoom, onResize]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeStart.current = { x: e.clientX, y: e.clientY, w, h };
    setResizing(true);
  };

  return (
    <div
      ref={ref}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
        e.preventDefault();
        startDrag(e.clientX, e.clientY);
      }}
      onTouchStart={(e) => {
        if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
        const t = e.touches[0];
        if (!t) return;
        startDrag(t.clientX, t.clientY);
      }}
      className="group absolute rounded-xl overflow-hidden shadow-md select-none"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        backgroundImage: `url(${image.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#222",
        cursor: dragging ? "grabbing" : "grab",
      }}
    >
      <button
        data-no-drag
        onClick={onRemove}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remove image"
        title="Remove"
      >
        ✕
      </button>
      <div
        data-no-drag
        onMouseDown={startResize}
        className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize opacity-0 group-hover:opacity-80 transition-opacity"
        title="Resize"
        style={{
          background: "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.9) 50%)",
          borderBottomRightRadius: 4,
        }}
      />
    </div>
  );
}

// Generic connector path — handles drag on any linked item
function GenericConnectorPath({
  d,
  idx,
  itemX,
  itemY,
  zoom,
  onMove,
  stroke = "#ffbcdf",
}: {
  d: string;
  idx: number;
  itemX: number;
  itemY: number;
  zoom: number;
  onMove: (idx: number, x: number, y: number) => void;
  stroke?: string;
}) {
  const dragStart = useRef({ mx: 0, my: 0, nx: 0, ny: 0 });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) return;
    const onMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStart.current.mx) / zoom;
      const dy = (e.clientY - dragStart.current.my) / zoom;
      onMove(idx, dragStart.current.nx + dx, dragStart.current.ny + dy);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, idx, zoom, onMove]);

  return (
    <>
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeDasharray="4 6"
        opacity="0.8"
        pointerEvents="none"
      />
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth="14"
        style={{ cursor: dragging ? "grabbing" : "grab", pointerEvents: "stroke" }}
        onMouseDown={(e) => {
          e.preventDefault();
          dragStart.current = { mx: e.clientX, my: e.clientY, nx: itemX, ny: itemY };
          setDragging(true);
        }}
      />
    </>
  );
}

function DraggableTextNote({
  note,
  x,
  y,
  zoom,
  onMove,
  onTextChange,
  onRemove,
  background,
  foreground,
}: {
  note: ProjectNote;
  x: number;
  y: number;
  zoom: number;
  onMove: (x: number, y: number) => void;
  onTextChange: (text: string) => void;
  onRemove: () => void;
  background?: string;
  foreground?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { dragging, startDrag } = useBoardDrag(ref, zoom, onMove);
  const bg = note.color ?? background ?? "#ffbcdf";
  const fg = foreground ?? "#1c1c1c";
  const w = note.width ?? TEXT_NOTE_W;
  const h = note.height ?? TEXT_NOTE_H;

  return (
    <div
      ref={ref}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
        e.preventDefault();
        startDrag(e.clientX, e.clientY);
      }}
      onTouchStart={(e) => {
        if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
        const t = e.touches[0];
        if (!t) return;
        startDrag(t.clientX, t.clientY);
      }}
      className="group absolute rounded-xl shadow-md select-none"
      style={{
        left: x,
        top: y,
        width: w,
        minHeight: h,
        background: bg,
        color: fg,
        cursor: dragging ? "grabbing" : "grab",
      }}
    >
      <NoteClip parentWidth={w} stroke={fg} />
      <textarea
        data-no-drag
        value={note.text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Write a note..."
        className="w-full h-full bg-transparent resize-none outline-none p-3 text-[14px] font-medium placeholder:opacity-50"
        style={{ minHeight: h, color: fg }}
      />
      <button
        data-no-drag
        onClick={onRemove}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/40 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remove note"
        title="Remove"
      >
        ✕
      </button>
    </div>
  );
}

function NoteClip({
  parentWidth,
  stroke,
}: {
  parentWidth: number;
  stroke: string;
}) {
  const clipW = 24;
  const clipH = 46;
  const offsetX = Math.max(8, parentWidth - clipW - 18);
  return (
    <svg
      aria-hidden="true"
      width={clipW}
      height={clipH}
      viewBox="0 0 36 70"
      style={{
        position: "absolute",
        top: -clipH * 0.32,
        left: offsetX,
        display: "block",
        pointerEvents: "none",
        overflow: "visible",
        filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.25))",
      }}
    >
      <path
        d="M 10 8 Q 10 2 18 2 Q 26 2 26 8 L 26 50 Q 26 58 18 58 Q 10 58 10 50 L 10 16 Q 10 10 16 10 Q 22 10 22 16 L 22 46"
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
