import { Router } from "express";
import { login, register } from "../services/auth.service";
import { loginSchema, registerSchema } from "../schemas/auth";

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

export default router;
