import type { Language } from "./types";
import type { LastMonthTaskStats } from "./stats";

type Lang = Language;

function pick<T>(arr: T[], seed: number): T {
  if (arr.length === 0) throw new Error("empty");
  const idx = Math.abs(Math.floor(seed)) % arr.length;
  return arr[idx];
}

/** Daily-stable seed so phrasing stays the same within a day. */
export function daySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// ----- Tasks completed last month -----

const TASKS_PHRASES: Record<Lang, (s: LastMonthTaskStats) => string[]> = {
  en: (s) => {
    const hardPart = s.hard > 0 ? ` (${s.hard} hard)` : "";
    return [
      `You crossed off ${s.total} tasks${hardPart} last month.`,
      `${s.total} tasks done in the last 30 days${hardPart}.`,
      `Last month you knocked out ${s.total} tasks${hardPart}.`,
      `${s.total} done${hardPart} — keep the momentum.`,
    ];
  },
  es: (s) => {
    const hardPart = s.hard > 0 ? ` (${s.hard} difíciles)` : "";
    return [
      `Has tachado ${s.total} tareas${hardPart} el último mes.`,
      `${s.total} tareas completadas en los últimos 30 días${hardPart}.`,
      `El último mes liquidaste ${s.total} tareas${hardPart}.`,
      `${s.total} hechas${hardPart} — sigue así.`,
    ];
  },
  ca: (s) => {
    const hardPart = s.hard > 0 ? ` (${s.hard} difícils)` : "";
    return [
      `Has ratllat ${s.total} tasques${hardPart} el darrer mes.`,
      `${s.total} tasques fetes en els últims 30 dies${hardPart}.`,
      `El darrer mes vas enllestir ${s.total} tasques${hardPart}.`,
      `${s.total} fetes${hardPart} — continua així.`,
    ];
  },
};

const TASKS_EMPTY: Record<Lang, string[]> = {
  en: ["No tasks crossed off in the last month.", "Nothing done in the last 30 days yet."],
  es: ["No has tachado ninguna tarea en el último mes.", "Aún sin tareas en los últimos 30 días."],
  ca: ["No has ratllat cap tasca el darrer mes.", "Encara sense tasques en els últims 30 dies."],
};

export function tasksLastMonthPhrase(stats: LastMonthTaskStats, lang: Lang): string {
  if (stats.total === 0) return pick(TASKS_EMPTY[lang], daySeed());
  return pick(TASKS_PHRASES[lang](stats), daySeed());
}

// ----- Money earned last month -----

function fmtMoney(amount: number, lang: Lang): string {
  const locale = lang === "en" ? "en-US" : lang === "ca" ? "ca-ES" : "es-ES";
  return amount.toLocaleString(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

const MONEY_PHRASES: Record<Lang, (m: string) => string[]> = {
  en: (m) => [
    `You billed ${m} last month.`,
    `${m} earned in the last 30 days.`,
    `Last month brought in ${m}.`,
    `Cha-ching: ${m} this month.`,
  ],
  es: (m) => [
    `Has facturado ${m} el último mes.`,
    `${m} ingresados en los últimos 30 días.`,
    `El último mes te entraron ${m}.`,
    `${m} este mes — bien jugado.`,
  ],
  ca: (m) => [
    `Has facturat ${m} el darrer mes.`,
    `${m} ingressats els últims 30 dies.`,
    `El darrer mes vas ingressar ${m}.`,
    `${m} aquest mes — ben jugat.`,
  ],
};

const MONEY_EMPTY: Record<Lang, string[]> = {
  en: ["Nothing billed in the last month."],
  es: ["Nada facturado en el último mes."],
  ca: ["Res facturat el darrer mes."],
};

export function moneyLastMonthPhrase(amount: number, lang: Lang): string {
  if (amount <= 0) return pick(MONEY_EMPTY[lang], daySeed());
  return pick(MONEY_PHRASES[lang](fmtMoney(amount, lang)), daySeed());
}

// ----- Daily streak (rest reminder) -----

const STREAK_REST: Record<Lang, (n: number) => string[]> = {
  en: (n) => [
    `You've been crossing off tasks ${n} days in a row — let yourself rest.`,
    `${n} consecutive days of progress. Take a breather.`,
    `${n}-day streak. Don't forget to recharge.`,
  ],
  es: (n) => [
    `Has tachado tareas durante ${n} días seguidos, permítete descansar.`,
    `${n} días seguidos productivo. Tómate un respiro.`,
    `Llevas ${n} días seguidos. No olvides desconectar.`,
  ],
  ca: (n) => [
    `Portes ${n} dies seguits ratllant tasques, permet-te descansar.`,
    `${n} dies seguits productiu. Pren-te un respir.`,
    `Portes ${n} dies seguits. No oblidis desconnectar.`,
  ],
};

const STREAK_KEEP: Record<Lang, (n: number) => string[]> = {
  en: (n) => [
    `${n} ${n === 1 ? "day" : "days"} in a row — keep it up.`,
    `Streak: ${n}.`,
  ],
  es: (n) => [
    `${n} ${n === 1 ? "día" : "días"} seguidos — sigue así.`,
    `Racha: ${n}.`,
  ],
  ca: (n) => [
    `${n} ${n === 1 ? "dia" : "dies"} seguits — continua.`,
    `Ratxa: ${n}.`,
  ],
};

export function dailyStreakPhrase(streak: number, lang: Lang): string {
  if (streak === 0) {
    return lang === "en"
      ? "No streak yet. Cross off a task today."
      : lang === "ca"
      ? "Encara sense ratxa. Ratlla una tasca avui."
      : "Aún sin racha. Tacha una tarea hoy.";
  }
  const arr = streak >= 7 ? STREAK_REST[lang](streak) : STREAK_KEEP[lang](streak);
  return pick(arr, daySeed());
}

// ----- Outside-work-hours nudge -----

const OUTSIDE_HOURS: Record<Lang, string[]> = {
  en: [
    "Working more isn't always better.",
    "Off-hours work — be kind to yourself.",
    "You're outside your work schedule. Rest counts too.",
  ],
  es: [
    "Trabajar más no siempre es mejor.",
    "Estás trabajando fuera de tu horario. Descansar también cuenta.",
    "Cuídate: estás tachando tareas fuera de tu sesión laboral.",
  ],
  ca: [
    "Treballar més no sempre és millor.",
    "Estàs treballant fora del teu horari. Descansar també compta.",
    "Cuida't: estàs ratllant tasques fora de la teva sessió laboral.",
  ],
};

export function outsideHoursPhrase(lang: Lang): string {
  return pick(OUTSIDE_HOURS[lang], daySeed());
}
