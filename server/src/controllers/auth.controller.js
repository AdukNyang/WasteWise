const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { validateRegistration, validateLogin } = require("../services/auth-validation.service");

const prisma = new PrismaClient();

const register = async (req, res) => {
  const { name, email, password, phone } = req.body;
  const validationError = validateRegistration(req.body);
  if (validationError) return res.status(400).json({ message: validationError });

  try {
    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) return res.status(400).json({ message: "Email already in use" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name: name.trim(), email: email.trim().toLowerCase(), password: hashed, phone: phone?.trim() || null, role: "COMMUNITY_USER" },
    });

    await prisma.ecoCoinsAccount.create({ data: { userId: user.id } });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "24h" });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const validationError = validateLogin(req.body);
  if (validationError) return res.status(400).json({ message: validationError });

  try {
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { register, login };
