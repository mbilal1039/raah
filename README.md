# Raah (راہ) — Career Guidance Platform

> **راہ** means "path" in Urdu. Raah helps students after 10th grade discover careers that match their interests — not just their parents' advice — and shows them the exact steps to get there.

A bilingual (English + Urdu, RTL-aware) full-stack web app built for a hackathon.

---

## 🎯 The Problem

After 10th grade, most students pick a field based on parents' advice, not their own interests. They don't know:
- What professions actually exist
- What path each one needs (FSc group → entry test → degree → skills → internship → first job)
- What skills companies actually want right now

## 💡 The Solution

Raah asks students about their hobbies and interests, then:
1. **Matches them** to professions ranked by a match percentage
2. **Shows a step-by-step roadmap** for any chosen profession
3. **Connects them to companies** posting real openings and the skills they need

---

## ✨ Features

### For Students
- Pick interests from 26 tags → get professions ranked by match %
- Full roadmap for each profession (FSc group, entry test, degree, skills, internship, first job)
- Live company board showing what skills are in demand
- "Skills to learn" list based on top match

### For Professionals
- Share career path and advice for any profession
- Help students avoid mistakes

### For Companies
- Post, edit, and delete job openings with required skills
- See a **skills demand chart** — how many students are learning each skill

### Platform
- 🌐 **Bilingual** — English + Urdu with proper RTL layout and Nastaliq font
- 🌙 **Light / Dark mode**
- 📱 **Mobile-first**, keyboard-friendly, accessible
- 🔐 **Secure auth** — bcrypt-hashed passwords, JWT in HttpOnly cookies
- 🗄️ **Persistent storage** — SQLite database (not localStorage)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, vanilla JavaScript (single-page) |
| Backend | Node.js + Express 5 |
| Database | SQLite (`better-sqlite3`) |
| Auth | bcrypt (password hashing) + JWT (HttpOnly cookie) |
| Fonts | Inter + Noto Nastaliq Urdu |

No frontend framework, no build step — just open and it works.

---

## 🚀 Run Locally

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/raah.git
cd raah

# 2. Install
npm install

# 3. Seed demo data (creates 3 accounts + 4 company openings)
npm run seed

# 4. Start
npm run dev
