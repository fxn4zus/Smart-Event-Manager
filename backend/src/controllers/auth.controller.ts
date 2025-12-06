// controller/auth.controller.ts
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import {
  createUser,
  deleteRefreshToken,
  findRefreshToken,
  findUserByEmail,
  findUserById,
  getMe,
  resetPassword,
} from "../repositories/auth.repository.js";
import { verifyEmailSMTP } from "../utils/verifyEmail.js";
import { registerSchema, loginSchema } from "../utils/validation.js"; // Zod schemas
import type { RegisterInput, LoginInput } from "../utils/validation.js";
import { generateToken } from "../utils/jwt.js"; // JWT generation
import prisma from "@prisma/client";
import { AuthRequest } from "../utils/authMiddleware.js";
import jwt from "jsonwebtoken";

export const register = async (req: Request, res: Response) => {
  try {
    // Validate request body using Zod
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.message });
    }

    const { name, email, password, role }: RegisterInput = validation.data;

    // Verify email
    const isEmailValid = await verifyEmailSMTP(email);
    if (!isEmailValid) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await createUser({
      name,
      email,
      password: hashedPassword,
      role: role || "ATTENDEE",
    });

    // Generate tokens
    const { accessToken, refreshToken } = await generateToken(newUser);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, //7 days
    });

    // Remove password from response
    const { password: _, ...safeUser } = newUser;

    res.status(201).json({
      message: "User registered successfully",
      user: safeUser,
      token: accessToken,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.message });
    }

    const { email, password }: LoginInput = validation.data;

    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateToken(user);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, //7 days
    });

    // Remove password from response
    const { password: _, ...safeUser } = user;

    res.status(200).json({
      message: "Login successful",
      user: safeUser,
      token: accessToken,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ message: "No refresh token provided" });
    }
    res.clearCookie("refreshToken");
    await deleteRefreshToken(refreshToken);
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const user = await getMe(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const { password: _, ...safeUser } = user;
    res.status(200).json({ user: safeUser });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const passwordReset = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { oldPassword, newPassword } = req.body as {
      oldPassword: string;
      newPassword: string;
    };

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Old password and new password are required" });
    }

    const user = await getMe(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const oldPasswordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!oldPasswordMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await resetPassword(
      userId,
      oldPassword,
      hashedNewPassword
    );

    await deleteRefreshToken(req.cookies.refreshToken);
    res.clearCookie("refreshToken"); // Clear refresh token on password change and require re-login
    if (!updatedUser) {
      return res.status(500).json({ message: "Could not update password" });
    }

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ message: "No refresh token provided" });
    }

    const storedToken = await findRefreshToken(refreshToken);
    if (!storedToken)
      return res.status(401).json({ message: "Invalid refresh token" });

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_SECRET || "fault_refresh_token"
    ) as jwt.JwtPayload;

    const user = await findUserById(decoded.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    const { accessToken, refreshToken: newRefreshToken } = await generateToken(
      user
    );

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, //7 days
    });
    res.status(200).json({ accessToken });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
