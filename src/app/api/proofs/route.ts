import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { validateProof } from "@/lib/proofchecker/engine";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (id) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      
      const item = await prisma.proof.findUnique({ 
        where: { id }, 
        include: { lines: true, createdBy: { select: { id: true, isAdmin: true } } } 
      });
      
      if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
      
      // Check if user owns the proof or is an admin
      if (item.createdById !== session.user.id && !session.user.isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      
      return NextResponse.json({ item });
    }
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const items = await prisma.proof.findMany({
      where: { createdById: session.user.id, isDeleted: false },
      select: { id: true, name: true, conclusion: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ items });
  } catch (error: unknown) {
    console.error("GET /api/proofs failed:", error);
    return NextResponse.json({ error: "Failed to fetch proofs" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const existing = await prisma.proof.findUnique({ where: { id }, select: { createdById: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.createdById !== session.user.id && !session.user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await prisma.proof.update({ where: { id }, data: { isDeleted: true } });
    return NextResponse.json({ ok: true, softDeleted: true });
  } catch (error) {
    console.error("DELETE /api/proofs failed:", error);
    return NextResponse.json({ error: "Failed to delete proof" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const {
      name = null,
      rules = "tfl_basic",
      premises = [],
      conclusion = "",
      lines = [],
      skipValidation = false,
    } = body ?? {};

    if (!skipValidation) {
      const validation = validateProof(premises, conclusion, lines, rules);
      if (!validation.ok) {
        return NextResponse.json({ error: "Validation failed", validation }, { status: 400 });
      }
    }

    const created = await prisma.proof.create({
      data: {
        name,
        rules,
        premises: premises.join(", "),
        conclusion,
        createdById: session.user.id,
        lines: {
          create: lines.map((l: any, index: number) => ({
            lineNo: String(l.lineNo),
            formula: l.formula ?? null,
            rule: l.rule ?? null,
            order: index + 1,
            comment: "",
            response: "",
            depth: Number(l.depth ?? 0),
            refs: Array.isArray(l.refs) ? l.refs.map((s: any) => String(s)) : [],
          })),
        },
      },
      include: { lines: true },
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/proofs failed:", error);
    return NextResponse.json({ error: "Failed to save proof" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const urlId = searchParams.get("id");
    const body = await request.json().catch(() => ({} as any));
    const id = body?.id ?? urlId;
    if (!id) return NextResponse.json({ error: "Missing proof id" }, { status: 400 });

    const existing = await prisma.proof.findUnique({ where: { id }, select: { createdById: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.createdById !== session.user.id && !session.user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const {
      name = null,
      rules = "tfl_basic",
      premises = [],
      conclusion = "",
      lines = [],
      skipValidation = false,
    } = body ?? {};

    if (!skipValidation) {
      const validation = validateProof(premises, conclusion, lines, rules);
      if (!validation.ok) {
        return NextResponse.json({ error: "Validation failed", validation }, { status: 400 });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.proofLine.deleteMany({ where: { proofId: id } });
      return tx.proof.update({
        where: { id },
        data: {
          name,
          rules,
          premises: premises.join(", "),
          conclusion,
          // ensure updatedAt advances even if scalar values did not change materially
          updatedAt: new Date(),
          lines: {
            create: lines.map((l: any, index: number) => ({
              lineNo: String(l.lineNo),
              formula: l.formula ?? null,
              rule: l.rule ?? null,
              order: index + 1,
              comment: "",
              response: "",
              depth: Number(l.depth ?? 0),
              refs: Array.isArray(l.refs) ? l.refs.map((s: any) => String(s)) : [],
            })),
          },
        },
        include: { lines: true },
      });
    });

    return NextResponse.json({ item: updated });
  } catch (error: unknown) {
    console.error("PATCH /api/proofs failed:", error);
    return NextResponse.json({ error: "Failed to update proof" }, { status: 500 });
  }
}


