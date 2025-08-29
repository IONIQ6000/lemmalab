import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const existing = await prisma.proof.findUnique({ where: { id }, select: { createdById: true, isDeleted: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.createdById !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const updated = await prisma.proof.update({ where: { id }, data: { isDeleted: false } });
    return NextResponse.json({ ok: true, item: updated });
  } catch (e) {
    console.error("POST /api/proofs/recover failed:", e);
    return NextResponse.json({ error: "Failed to recover proof" }, { status: 500 });
  }
}





