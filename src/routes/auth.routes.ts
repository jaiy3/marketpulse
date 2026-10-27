import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { login, register } from "../services/auth.service";
import { loginSchema, registerSchema } from "../schemas/auth";
import { HttpError } from "../utils/http-error";

const router = Router();

router.post("/register", async (req, res) => {
  const input = registerSchema.parse(req.body);
  const result = await register(input.email, input.password);
  return res.status(201).json({ success: true, data: result });
});

router.post("/login", async (req, res) => {
  const input = loginSchema.parse(req.body);
  const result = await login(input.email, input.password);
  return res.json({ success: true, data: result });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, role: true, createdAt: true },
  });
  if (!user) throw new HttpError(404, "User not found");
  return res.json({ success: true, data: user });
});

export default router;
