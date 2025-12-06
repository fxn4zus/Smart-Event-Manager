import jwt from "jsonwebtoken";
import { PrismaClient, User } from "@prisma/client";

const prisma = new PrismaClient();

export const generateToken = async (user: User) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };
  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET || ("fault_access_token" as string),
    {
      expiresIn: "1h",
    }
  );

  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_SECRET || ("fault_refresh_token" as string),
    {
      expiresIn: "7d",
    }
  );

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
    },
  });

  return { accessToken, refreshToken };
};
