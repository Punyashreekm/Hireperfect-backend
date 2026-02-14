const express = require("express");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { auth } = require("../middleware/auth");

const router = express.Router();

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

router.post(
  "/signup",
  [
    body("name").trim().isLength({ min: 2 }),
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
    body("role").optional().isIn(["candidate", "admin"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Validation failed", errors: errors.array() });
      }

      const { name, email, password } = req.body;
      let { role } = req.body;

      const existing = await User.findOne({ email });
      if (existing) return res.status(409).json({ message: "Email already registered" });

      if (role === "admin") {
        const allowAdmins = (process.env.ADMIN_EMAILS || "")
          .split(",")
          .map((v) => v.trim().toLowerCase())
          .filter(Boolean);
        if (!allowAdmins.includes(email.toLowerCase())) role = "candidate";
      }

      const user = await User.create({
        name,
        email,
        password,
        role: role || "candidate",
      });

      const token = signToken(user._id);
      return res.status(201).json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      return res.status(500).json({ message: "Signup failed" });
    }
  }
);

router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Validation failed", errors: errors.array() });
      }

      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.status(401).json({ message: "Invalid credentials" });

      const valid = await user.comparePassword(password);
      if (!valid) return res.status(401).json({ message: "Invalid credentials" });

      const token = signToken(user._id);
      return res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          purchasedExams: user.purchasedExams,
        },
      });
    } catch (error) {
      return res.status(500).json({ message: "Login failed" });
    }
  }
);

router.get("/me", auth, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      purchasedExams: req.user.purchasedExams,
    },
  });
});

module.exports = router;
