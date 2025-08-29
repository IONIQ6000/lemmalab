import { PrismaClient } from "../src/generated/prisma/index.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function randomString(len = 8) {
  return Math.random().toString(36).slice(2, 2 + len);
}

(async () => {
  try {
    const baseUsername = "admin";
    const baseEmail = "admin@localhost";

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: baseUsername }, { email: baseEmail }] },
      select: { id: true, username: true, email: true },
    });

    const suffix = randomString(6);
    const username = existing ? `${baseUsername}-${suffix}` : baseUsername;
    const email = existing ? `admin+${suffix}@localhost` : baseEmail;

    const password = `${randomString(8)}${randomString(4).toUpperCase()}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        hashedPassword,
        isInstructor: true,
        isStudent: false,
        isActive: true,
      },
      select: { id: true, email: true, username: true },
    });

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          success: true,
          user,
          credentials: { username, email, password },
          note: "Use email or username to sign in on /sign-in",
        },
        null,
        2
      )
    );
    process.exit(0);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to create admin:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
