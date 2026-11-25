const express = require("express");
const db = require("./db");
const {
  hashPassword, verifyPassword, signToken, requireAuth, requireRole
} = require("./auth");

const router = express.Router();
const cookieOpts = { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 3600 * 1000 };

// ---------- AUTH ----------
router.post("/auth/signup", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Missing fields" });
  }
  if (!["student", "professional", "company"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be 6+ characters" });
  }
  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (exists) return res.status(409).json({ error: "Email already registered" });

  const hash = await hashPassword(password);
  const info = db.prepare(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)"
  ).run(name.trim(), email.toLowerCase(), hash, role);

  const user = { id: info.lastInsertRowid, name: name.trim(), email: email.toLowerCase(), role };
  res.cookie("token", signToken(user), cookieOpts);
  res.json({ user });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get((email || "").toLowerCase());
  if (!row) return res.status(401).json({ error: "Invalid email or password" });
  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });
  const user = { id: row.id, name: row.name, email: row.email, role: row.role };
  res.cookie("token", signToken(user), cookieOpts);
  res.json({ user });
});

router.post("/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

router.get("/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ---------- INTERESTS ----------
router.get("/interests", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT tag FROM interests WHERE user_id = ?").all(req.user.id);
  res.json({ interests: rows.map(r => r.tag) });
});

router.post("/interests", requireAuth, requireRole("student"), (req, res) => {
  const { tags } = req.body;
  if (!Array.isArray(tags)) return res.status(400).json({ error: "tags must be array" });
  db.prepare("DELETE FROM interests WHERE user_id = ?").run(req.user.id);
  const stmt = db.prepare("INSERT INTO interests (user_id, tag) VALUES (?, ?)");
  const tx = db.transaction(() => tags.forEach(t => stmt.run(req.user.id, t)));
  tx();
  res.json({ interests: tags });
});

// ---------- OPENINGS ----------
router.get("/openings", (req, res) => {
  const rows = db.prepare("SELECT * FROM openings ORDER BY created_at DESC").all();
  res.json({
    openings: rows.map(r => ({ ...r, skills: r.skills.split(",").filter(Boolean) }))
  });
});

router.post("/openings", requireAuth, requireRole("company"), (req, res) => {
  const { title, description, skills } = req.body;
  if (!title || !description || !Array.isArray(skills)) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const info = db.prepare(
    "INSERT INTO openings (company_id, company_name, title, description, skills) VALUES (?, ?, ?, ?, ?)"
  ).run(req.user.id, req.user.name, title, description, skills.join(","));
  res.json({ id: info.lastInsertRowid });
});

router.delete("/openings/:id", requireAuth, requireRole("company"), (req, res) => {
  const row = db.prepare("SELECT company_id FROM openings WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  if (row.company_id !== req.user.id) return res.status(403).json({ error: "Not yours" });
  db.prepare("DELETE FROM openings WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ---------- ADVICE ----------
router.get("/advice", (req, res) => {
  const rows = db.prepare("SELECT * FROM advice ORDER BY created_at DESC").all();
  res.json({ advice: rows });
});

router.post("/advice", requireAuth, requireRole("professional"), (req, res) => {
  const { professionId, text } = req.body;
  if (!professionId || !text) return res.status(400).json({ error: "Missing fields" });
  const info = db.prepare(
    "INSERT INTO advice (user_id, profession_id, text) VALUES (?, ?, ?)"
  ).run(req.user.id, professionId, text);
  res.json({ id: info.lastInsertRowid });
});

// ---------- SKILL DEMAND ----------
router.get("/skill-demand", requireAuth, requireRole("company"), (req, res) => {
  const rows = db.prepare(`
    SELECT i.tag AS tag, COUNT(*) AS count
    FROM interests i
    GROUP BY i.tag
    ORDER BY count DESC
  `).all();
  res.json({ demand: rows });
});

module.exports = router;