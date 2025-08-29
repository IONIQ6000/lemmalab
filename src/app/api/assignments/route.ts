import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.assignment.findMany({
    include: { course: true, problems: true },
  });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const data = await request.json();
  const created = await prisma.assignment.create({ data });
  return NextResponse.json({ item: created }, { status: 201 });
}


