import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.course.findMany({
    include: { instructor: { include: { user: true } }, students: true },
  });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const data = await request.json();
  const created = await prisma.course.create({ data });
  return NextResponse.json({ item: created }, { status: 201 });
}


