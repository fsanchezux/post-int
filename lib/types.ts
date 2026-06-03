export type Difficulty = 1 | 2 | 3;

export type ProjectLink = {
  url: string;
  label?: string;
  x?: number;
  y?: number;
};

export type ProjectImage = {
  id: string;
  src: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

export type ProjectNote = {
  id: string;
  text: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
};

export type DifficultyTag = "easy" | "medium" | "hard";

export type Task = {
  id: string;
  text: string;
  done: boolean;
  difficulty: Difficulty;
  doneAt?: string;
  autoTag?: DifficultyTag;
  autoTagSource?: "llm" | "cache" | "manual";
};

export type Project = {
  id: string;
  name: string;
  importance: 1 | 2 | 3 | 4 | 5;
  paid: boolean;
  amount?: number;
  startDate?: string;
  endDate?: string;
  link?: string;
  links?: ProjectLink[];
  images?: ProjectImage[];
  notes?: ProjectNote[];
  showProgress?: boolean;
  showDescription?: boolean;
  titleWeight?: "semibold" | "bold" | "extrabold";
  textColor?: "auto" | "dark" | "light";
  shape?: "auto" | "normal" | "spiral" | "clip" | "folder";
  shareId?: string;
  tasks: Task[];
  position: { x: number; y: number };
  detailPosition?: { x: number; y: number };
  detailZoom?: number;
  width?: number;
  height?: number;
  zIndex?: number;
  createdAt: string;
  completedAt?: string;
  estimatedHours?: number;
  description?: string;
  color?: string;
};

export type Mood = "high" | "normal" | "low";

export type PlanItem = {
  taskId: string;
  taskText: string;
  difficulty: Difficulty;
  projectId: string;
  projectName: string;
  paid: boolean;
  amount?: number;
  importance: number;
  score: number;
};

export type WorkSlot = {
  day: number;
  start: string;
  end: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  source: "google" | "notion" | "manual";
};

export type Language = "en" | "es" | "ca";

export type Settings = {
  workSchedule: WorkSlot[];
  googleConnected: boolean;
  notionConnected: boolean;
  events: CalendarEvent[];
  language: Language;
};

export type FreeSlot = {
  day: number;
  date: string;
  start: string;
  end: string;
  durationMinutes: number;
};

export type Recommendation = {
  slot: FreeSlot;
  projectId: string;
  projectName: string;
  reason: string;
};
