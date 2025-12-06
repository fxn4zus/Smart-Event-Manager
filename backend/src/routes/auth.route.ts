import express from "express";
import {
  passwordReset,
  getMyProfile,
  login,
  logout,
  refreshToken,
  register,
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../utils/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.get("/me", authMiddleware, getMyProfile);
router.post("/logout", authMiddleware, logout);
router.post("/forgot-password", authMiddleware, passwordReset);
router.post("/refresh-token", authMiddleware, refreshToken);

export default router;
