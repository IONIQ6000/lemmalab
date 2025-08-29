import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  try {
    const random = Math.random().toString(36).slice(2, 8);
    const usernameBase = "admin";
    const emailBase = "admin@localhost";

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: usernameBase }, { email: emailBase }] },
    });

    const username = existing ? `${usernameBase}-${random}` : usernameBase;
    const email = existing ? `admin+${random}@localhost` : emailBase;
    const password = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase();
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        hashedPassword,
        isInstructor: true,
        isStudent: false,
        isAdmin: true,
        isActive: true,
      },
      select: { id: true, email: true, username: true },
    });

    return NextResponse.json({
      success: true,
      user,
      credentials: { username, email, password },
      note: "Use email or username to sign in on /sign-in",
    });
  } catch (error) {
    console.error("create-admin error", error);
    return NextResponse.json({ error: "Failed to create admin" }, { status: 500 });
  }
}


