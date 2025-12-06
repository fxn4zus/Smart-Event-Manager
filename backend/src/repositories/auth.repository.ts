import { PrismaClient } from "@prisma/client";
import type { User } from "@prisma/client";

const prisma = new PrismaClient();

export const findUserById = async (id: string) => {
  return await prisma.user.findUnique({
    where: {
      id: id.toString(),
    },
  });
};

export const findUserByEmail = async (email: string) => {
  return await prisma.user.findUnique({
    where: {
      email: email,
    },
  });
};

export const createUser = async (userData: any): Promise<User> => {
  return await prisma.user.create({
    data: userData,
  });
};

export const loginUser = async (
  email: string,
  password: string
): Promise<User | null> => {
  const user = await findUserByEmail(email);
  if (user && user.password === password) {
    return user;
  }
  return null;
};

export const getMe = async (userId: string): Promise<User | null> => {
  return await prisma.user.findUnique({
    where: {
      id: userId.toString(),
    },
    include: {
      events: true,
      tickets: true,
    },
  });
};

export const resetPassword = async (
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<User | any> => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  return await prisma.user.update({
    where: {
      id: userId.toString(),
    },
    data: {
      password: newPassword,
    },
  });
};

export const findRefreshToken = async (token: string) => {
  return await prisma.refreshToken.findUnique({
    where: { token },
  });
};

export const createRefreshToken = async (userId: string, token: string) => {
  return await prisma.refreshToken.create({
    data: {
      token,
      userId,
    },
  });
};

export const deleteRefreshToken = async (token: string) => {
  return await prisma.refreshToken.delete({
    where: { token: token },
  });
};
