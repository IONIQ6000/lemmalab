import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, username, password } = await request.json();
    if (!email || !username || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const exists = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (exists) {
      return NextResponse.json({ error: "Email or username already in use" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, username, hashedPassword, isActive: true },
      select: { id: true, email: true, username: true },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("register error", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}


