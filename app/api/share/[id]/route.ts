import { NextResponse } from "next/server";
import {
  deleteShare,
  isValidShareId,
  readShare,
  writeShare,
  type SharePayload,
} from "@/lib/shareStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!isValidShareId(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const data = await readShare(id);
  if (!data) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!isValidShareId(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const body = (await req.json().catch(() => null)) as Partial<SharePayload> | null;
  if (!body || typeof body !== "object" || !body.name || !Array.isArray(body.tasks)) {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }
  const payload: SharePayload = {
    name: String(body.name).slice(0, 200),
    description: body.description ? String(body.description).slice(0, 2000) : undefined,
    showDescription: body.showDescription ?? true,
    color: body.color,
    links: Array.isArray(body.links)
      ? body.links.slice(0, 3).map((l) => ({
          url: String(l.url).slice(0, 500),
          label: l.label ? String(l.label).slice(0, 80) : undefined,
        }))
      : undefined,
    showProgress: body.showProgress ?? true,
    startDate: body.startDate,
    endDate: body.endDate,
    paid: body.paid,
    amount: body.amount,
    tasks: body.tasks.slice(0, 200).map((t) => ({
      id: String(t.id),
      text: String(t.text).slice(0, 500),
      done: !!t.done,
      autoTag: t.autoTag,
    })),
    updatedAt: new Date().toISOString(),
  };
  await writeShare(id, payload);
  return NextResponse.json({ ok: true, updatedAt: payload.updatedAt });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!isValidShareId(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  await deleteShare(id);
  return NextResponse.json({ ok: true });
}
