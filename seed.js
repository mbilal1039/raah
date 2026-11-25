require("dotenv").config();
const db = require("./server/db");
const { hashPassword } = require("./server/auth");

(async () => {
  const demos = [
    { name: "Ayesha", email: "student@raah.pk", password: "student123", role: "student" },
    { name: "Bilal", email: "pro@raah.pk", password: "pro123", role: "professional" },
    { name: "TechNova Pvt Ltd", email: "company@raah.pk", password: "company123", role: "company" }
  ];

  for (const d of demos) {
    const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(d.email);
    if (exists) { console.log("Skipping (exists):", d.email); continue; }
    const hash = await hashPassword(d.password);
    db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)")
      .run(d.name, d.email, hash, d.role);
    console.log("Created:", d.email);
  }

  const companySeeds = [
    { name: "TechNova Pvt Ltd", email: "hr@technova.pk", title: "Junior Frontend Developer",
      description: "Build responsive web apps in React.", skills: ["JavaScript","HTML","CSS","Git"] },
    { name: "CreativeStudio Karachi", email: "jobs@cs.pk", title: "Design Intern",
      description: "Help the design team with branding.", skills: ["Figma","Photoshop","Typography"] },
    { name: "FinBank Limited", email: "careers@finbank.pk", title: "Junior Data Analyst",
      description: "Analyse data and build dashboards.", skills: ["Python","SQL","Excel"] },
    { name: "BuildRight Construction", email: "hr@buildright.pk", title: "Site Engineer Trainee",
      description: "Assist on-site engineers.", skills: ["AutoCAD","Project management"] }
  ];

  for (const c of companySeeds) {
    let user = db.prepare("SELECT id, name FROM users WHERE email = ?").get(c.email);
    if (!user) {
      const hash = await hashPassword("company123");
      const info = db.prepare(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'company')"
      ).run(c.name, c.email, hash);
      user = { id: info.lastInsertRowid, name: c.name };
    }
    const existing = db.prepare(
      "SELECT id FROM openings WHERE company_id = ? AND title = ?"
    ).get(user.id, c.title);
    if (!existing) {
      db.prepare(
        "INSERT INTO openings (company_id, company_name, title, description, skills) VALUES (?, ?, ?, ?, ?)"
      ).run(user.id, user.name, c.title, c.description, c.skills.join(","));
      console.log("Opening created:", c.title);
    }
  }

  console.log("✅ Seed complete.");
  process.exit(0);
})();