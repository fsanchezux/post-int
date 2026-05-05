import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

type Tag = "easy" | "medium" | "hard";

const SYSTEM_PROMPT = `Eres un clasificador de dificultad de tareas. Recibes una tarea en español o inglés y respondes ÚNICAMENTE con una palabra: easy, medium o hard.
- easy: tareas administrativas, breves, sin pensamiento profundo (responder email, subir un archivo, llamar a alguien).
- medium: tareas de trabajo normal, requieren foco pero son rutinarias (escribir un mockup, revisar un PR, redactar una nota).
- hard: tareas que requieren mucho esfuerzo cognitivo, investigación o están bloqueadas por incertidumbre (diseñar arquitectura, depurar bug crítico, escribir paper).
Responde SOLO con easy, medium o hard. Sin puntuación, sin comillas, sin explicación.`;

function normalizeTag(raw: string): Tag {
  const t = raw.toLowerCase().replace(/[^a-z]/g, "").trim();
  if (t.startsWith("easy") || t === "facil") return "easy";
  if (t.startsWith("hard") || t === "dificil" || t === "difícil") return "hard";
  return "medium";
}

async function callGroq(text: string): Promise<Tag | null> {
  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) return null;
  const model = env.GROQ_MODEL;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 5,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const out = data.choices?.[0]?.message?.content;
  if (!out) return null;
  return normalizeTag(out);
}

async function callHuggingFace(text: string): Promise<Tag | null> {
  const apiKey = env.HF_API_KEY;
  if (!apiKey) return null;
  const model = env.HF_MODEL || "meta-llama/Meta-Llama-3-8B-Instruct";

  const prompt = `${SYSTEM_PROMPT}\n\nTarea: ${text}\nRespuesta:`;
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: 5, temperature: 0.0, return_full_text: false },
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ generated_text?: string }> | {
    generated_text?: string;
  };
  const out = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
  if (!out) return null;
  return normalizeTag(out);
}

function heuristicTag(text: string): Tag {
  const t = text.toLowerCase();
  const hard = [
    "investigar",
    "research",
    "arquitectura",
    "architecture",
    "debug",
    "depurar",
    "refactor",
    "refactorizar",
    "migrar",
    "migrate",
    "diseñar",
    "design system",
    "paper",
    "tesis",
    "algoritmo",
  ];
  const easy = [
    "email",
    "correo",
    "responder",
    "llamar",
    "call",
    "subir",
    "upload",
    "enviar",
    "send",
    "comprar",
    "buy",
    "pagar",
    "pay",
    "imprimir",
    "print",
    "agendar",
    "schedule",
    "revisar email",
  ];
  if (hard.some((k) => t.includes(k))) return "hard";
  if (easy.some((k) => t.includes(k))) return "easy";
  return "medium";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { text?: string };
    const text = (body.text ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "missing text" }, { status: 400 });
    }

    let tag: Tag | null = null;
    let source: "groq" | "hf" | "heuristic" = "heuristic";

    tag = await callGroq(text).catch(() => null);
    if (tag) source = "groq";

    if (!tag) {
      tag = await callHuggingFace(text).catch(() => null);
      if (tag) source = "hf";
    }

    if (!tag) tag = heuristicTag(text);

    return NextResponse.json({ tag, source });
  } catch (err) {
    return NextResponse.json(
      { error: "internal", message: String(err) },
      { status: 500 }
    );
  }
}
