"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Language } from "./types";

type TranslationKey = string;

const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    "nav.board": "Board",
    "nav.tasks": "Tasks",
    "nav.dashboard": "Dashboard",
    "nav.history": "History",
    "nav.settings": "Settings",

    "home.noPosits": "No posits yet. Tap + to get started.",
    "home.createPosit": "Create posit",

    "settings.title": "Settings",
    "settings.language": "Language",
    "settings.autoTagging": "Automatic tagging",
    "settings.autoTaggingDesc": "Tasks you add are automatically classified as easy / medium / hard. Repeated phrases are remembered to avoid re-analysis.",
    "settings.rememberedPhrases": "Remembered phrases",
    "settings.clearMemory": "Clear memory",
    "settings.workSchedule": "Weekly work schedule",
    "settings.addSlot": "Add slot",
    "settings.connections": "Connections",
    "settings.googleCalendar": "Google Calendar",
    "settings.googleCalendarDesc": "Read from primary calendar to detect conflicts with your schedule.",
    "settings.connected": "Connected",
    "settings.pending": "Pending",
    "settings.connect": "Connect",
    "settings.disconnect": "Disconnect",
    "settings.googleConnected": "Google Calendar connected",
    "settings.googleError": "Error",
    "settings.googleDisconnected": "Google disconnected",
    "settings.manualEvents": "Manual events this week",
    "settings.eventTitle": "Title",
    "settings.eventStart": "Start",
    "settings.eventEnd": "End",
    "settings.addEvent": "Add",
    "settings.deleteEvent": "Delete",
    "settings.freeSlots": "Free slots + recommendations",
    "settings.noFreeSlots": "No available slots or no active projects.",
    "settings.duration": "min",

    "days.sunday": "Sun",
    "days.monday": "Mon",
    "days.tuesday": "Tue",
    "days.wednesday": "Wed",
    "days.thursday": "Thu",
    "days.friday": "Fri",
    "days.saturday": "Sat",

    "project.name": "Project name",
    "project.importance": "Importance",
    "project.paid": "Paid",
    "project.amount": "Amount",
    "project.link": "Link",
    "project.tasks": "Tasks",
    "project.description": "Description",
    "project.startDate": "Start date",
    "project.endDate": "End date",
    "project.estimatedHours": "Estimated hours",
    "project.color": "Color",
    "project.progress": "Show progress",
    "project.create": "Create Project",
    "project.update": "Update Project",
    "project.cancel": "Cancel",
    "project.delete": "Delete",
    "project.complete": "Mark complete",
    "project.restore": "Restore",
    "project.importanceLow": "Low",
    "project.importanceMedium": "Medium",
    "project.importanceHigh": "High",
    "project.importanceVeryHigh": "Very high",
    "project.importanceUrgent": "Urgent",

    "task.addTask": "Add task",
    "task.placeholder": "Add a task...",
    "task.easy": "Easy",
    "task.medium": "Medium",
    "task.hard": "Hard",
    "task.done": "Done",
    "task.autoTagged": "Auto-tagged",
    "task.manuallyTagged": "Tagged",

    "dashboard.title": "Dashboard",
    "dashboard.today": "Today",
    "dashboard.thisWeek": "This week",
    "dashboard.totalProjects": "Total projects",
    "dashboard.activeProjects": "Active projects",
    "dashboard.completedProjects": "Completed",
    "dashboard.totalTasks": "Total tasks",
    "dashboard.completedTasks": "Completed",
    "dashboard.pendingTasks": "Pending",
    "dashboard.noTasksToday": "No tasks planned for today",
    "dashboard.noTasksThisWeek": "No tasks planned for this week",
    "dashboard.plannedTasks": "Planned tasks",
    "dashboard.allCaughtUp": "All caught up!",
    "dashboard.goals": "Goals",

    "history.title": "History",
    "history.noHistory": "No completed projects yet.",
    "history.restore": "Restore",

    "share.title": "Shared Project",
    "share.notFound": "Project not found",
    "share.copyLink": "Copy link",
    "share.linkCopied": "Link copied",

    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.confirm": "Confirm",
    "common.loading": "Loading...",
  },
  es: {
    "nav.board": "Tablero",
    "nav.tasks": "Tareas",
    "nav.dashboard": "Panel",
    "nav.history": "Historial",
    "nav.settings": "Ajustes",

    "home.noPosits": "Sin posits. Pulsa + para empezar.",
    "home.createPosit": "Crear posit",

    "settings.title": "Ajustes",
    "settings.language": "Idioma",
    "settings.autoTagging": "Etiquetado automático",
    "settings.autoTaggingDesc": "Las tareas que añades se clasifican automáticamente como fácil / media / difícil. Las frases repetidas se recuerdan para no tener que volver a analizarlas.",
    "settings.rememberedPhrases": "Frases recordadas",
    "settings.clearMemory": "Vaciar memoria",
    "settings.workSchedule": "Horario laboral semanal",
    "settings.addSlot": "+ tramo",
    "settings.connections": "Conexiones",
    "settings.googleCalendar": "Google Calendar",
    "settings.googleCalendarDesc": "Lectura del calendario primario para detectar conflictos con tu horario.",
    "settings.connected": "Conectado",
    "settings.pending": "Pendiente",
    "settings.connect": "Conectar",
    "settings.disconnect": "Desconectar",
    "settings.googleConnected": "✓ Google Calendar conectado",
    "settings.googleError": "⚠ Error",
    "settings.googleDisconnected": "Google desconectado",
    "settings.manualEvents": "Eventos esta semana (manuales)",
    "settings.eventTitle": "Título",
    "settings.eventStart": "Inicio",
    "settings.eventEnd": "Fin",
    "settings.addEvent": "+",
    "settings.deleteEvent": "✕",
    "settings.freeSlots": "Huecos libres + recomendaciones",
    "settings.noFreeSlots": "No hay huecos disponibles o no tienes proyectos activos.",
    "settings.duration": "min",

    "days.sunday": "Dom",
    "days.monday": "Lun",
    "days.tuesday": "Mar",
    "days.wednesday": "Mié",
    "days.thursday": "Jue",
    "days.friday": "Vie",
    "days.saturday": "Sáb",

    "project.name": "Nombre del proyecto",
    "project.importance": "Importancia",
    "project.paid": "Pagado",
    "project.amount": "Cantidad",
    "project.link": "Enlace",
    "project.tasks": "Tareas",
    "project.description": "Descripción",
    "project.startDate": "Fecha inicio",
    "project.endDate": "Fecha fin",
    "project.estimatedHours": "Horas estimadas",
    "project.color": "Color",
    "project.progress": "Mostrar progreso",
    "project.create": "Crear Proyecto",
    "project.update": "Actualizar Proyecto",
    "project.cancel": "Cancelar",
    "project.delete": "Eliminar",
    "project.complete": "Marcar completo",
    "project.restore": "Restaurar",
    "project.importanceLow": "Baja",
    "project.importanceMedium": "Media",
    "project.importanceHigh": "Alta",
    "project.importanceVeryHigh": "Muy alta",
    "project.importanceUrgent": "Urgente",

    "task.addTask": "Añadir tarea",
    "task.placeholder": "Añadir una tarea...",
    "task.easy": "Fácil",
    "task.medium": "Media",
    "task.hard": "Difícil",
    "task.done": "Hecha",
    "task.autoTagged": "Auto-etiquetada",
    "task.manuallyTagged": "Etiquetada",

    "dashboard.title": "Panel",
    "dashboard.today": "Hoy",
    "dashboard.thisWeek": "Esta semana",
    "dashboard.totalProjects": "Total proyectos",
    "dashboard.activeProjects": "Proyectos activos",
    "dashboard.completedProjects": "Completados",
    "dashboard.totalTasks": "Total tareas",
    "dashboard.completedTasks": "Completadas",
    "dashboard.pendingTasks": "Pendientes",
    "dashboard.noTasksToday": "No hay tareas planeadas para hoy",
    "dashboard.noTasksThisWeek": "No hay tareas planeadas para esta semana",
    "dashboard.plannedTasks": "Tareas planeadas",
    "dashboard.allCaughtUp": "¡Todo al día!",
    "dashboard.goals": "Objetivos",

    "history.title": "Historial",
    "history.noHistory": "Aún no hay proyectos completados.",
    "history.restore": "Restaurar",

    "share.title": "Proyecto Compartido",
    "share.notFound": "Proyecto no encontrado",
    "share.copyLink": "Copiar enlace",
    "share.linkCopied": "Enlace copiado",

    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.delete": "Eliminar",
    "common.confirm": "Confirmar",
    "common.loading": "Cargando...",
  },
  ca: {
    "nav.board": "Tauler",
    "nav.tasks": "Tasques",
    "nav.dashboard": "Panell",
    "nav.history": "Historial",
    "nav.settings": "Configuració",

    "home.noPosits": "Sense posits. Toca + per començar.",
    "home.createPosit": "Crear posit",

    "settings.title": "Configuració",
    "settings.language": "Idioma",
    "settings.autoTagging": "Etiquetatge automàtic",
    "settings.autoTaggingDesc": "Les tasques que afegeixes es classifiquen automàticament com a fàcil / mitjana / difícil. Les frases repetides es recorden per no haver d'analitzar-les de nou.",
    "settings.rememberedPhrases": "Frases recordades",
    "settings.clearMemory": "Buidar memòria",
    "settings.workSchedule": "Horari laboral setmanal",
    "settings.addSlot": "+ tram",
    "settings.connections": "Connexions",
    "settings.googleCalendar": "Google Calendar",
    "settings.googleCalendarDesc": "Lectura del calendari primari per detectar conflictes amb el teu horari.",
    "settings.connected": "Connectat",
    "settings.pending": "Pendent",
    "settings.connect": "Connectar",
    "settings.disconnect": "Desconnectar",
    "settings.googleConnected": "✓ Google Calendar connectat",
    "settings.googleError": "⚠ Error",
    "settings.googleDisconnected": "Google desconnectat",
    "settings.manualEvents": "Esdeveniments aquesta setmana (manuals)",
    "settings.eventTitle": "Títol",
    "settings.eventStart": "Inici",
    "settings.eventEnd": "Fi",
    "settings.addEvent": "+",
    "settings.deleteEvent": "✕",
    "settings.freeSlots": "Buits + recomanacions",
    "settings.noFreeSlots": "No hi ha buits disponibles o no tens projectes actius.",
    "settings.duration": "min",

    "days.sunday": "Dium",
    "days.monday": "Dill",
    "days.tuesday": "Dim",
    "days.wednesday": "Dmc",
    "days.thursday": "Dij",
    "days.friday": "Div",
    "days.saturday": "Dis",

    "project.name": "Nom del projecte",
    "project.importance": "Importància",
    "project.paid": "Pagat",
    "project.amount": "Quantitat",
    "project.link": "Enllaç",
    "project.tasks": "Tasques",
    "project.description": "Descripció",
    "project.startDate": "Data inici",
    "project.endDate": "Data fi",
    "project.estimatedHours": "Hores estimades",
    "project.color": "Color",
    "project.progress": "Mostrar progrés",
    "project.create": "Crear Projecte",
    "project.update": "Actualitzar Projecte",
    "project.cancel": "Cancel·lar",
    "project.delete": "Eliminar",
    "project.complete": "Marcar complet",
    "project.restore": "Restaurar",
    "project.importanceLow": "Baixa",
    "project.importanceMedium": "Mitjana",
    "project.importanceHigh": "Alta",
    "project.importanceVeryHigh": "Molt alta",
    "project.importanceUrgent": "Urgent",

    "task.addTask": "Afegir tasca",
    "task.placeholder": "Afegir una tasca...",
    "task.easy": "Fàcil",
    "task.medium": "Mitjana",
    "task.hard": "Difícil",
    "task.done": "Feta",
    "task.autoTagged": "Auto-etiquetada",
    "task.manuallyTagged": "Etiquetada",

    "dashboard.title": "Panell",
    "dashboard.today": "Avui",
    "dashboard.thisWeek": "Aquesta setmana",
    "dashboard.totalProjects": "Total projectes",
    "dashboard.activeProjects": "Projectes actius",
    "dashboard.completedProjects": "Completats",
    "dashboard.totalTasks": "Total tasques",
    "dashboard.completedTasks": "Completades",
    "dashboard.pendingTasks": "Pendents",
    "dashboard.noTasksToday": "No hi ha tasques planejades per avui",
    "dashboard.noTasksThisWeek": "No hi ha tasques planejades per aquesta setmana",
    "dashboard.plannedTasks": "Tasques planejades",
    "dashboard.allCaughtUp": "¡Tot al dia!",
    "dashboard.goals": "Objectius",

    "history.title": "Historial",
    "history.noHistory": "Encara no hi ha projectes completats.",
    "history.restore": "Restaurar",

    "share.title": "Projecte Compartit",
    "share.notFound": "Projecte no trobat",
    "share.copyLink": "Copiar enllaç",
    "share.linkCopied": "Enllaç copiat",

    "common.save": "Guardar",
    "common.cancel": "Cancel·lar",
    "common.delete": "Eliminar",
    "common.confirm": "Confirmar",
    "common.loading": "Carregant...",
  },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children, initialLanguage = "en" }: { children: ReactNode; initialLanguage?: Language }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    setLanguageState(initialLanguage);
  }, [initialLanguage]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  return <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      language: "en" as Language,
      setLanguage: () => {},
      t: (key: TranslationKey) => key,
    };
  }
  return context;
}

export const languageNames: Record<Language, string> = {
  en: "English",
  es: "Español",
  ca: "Català",
};

export const dayNames: Record<Language, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
  ca: ["Dium", "Dill", "Dim", "Dmc", "Dij", "Div", "Dis"],
};