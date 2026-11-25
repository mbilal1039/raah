const LS = { lang: "raah_lang", theme: "raah_theme", session: "raah_session" };
let LANG = localStorage.getItem(LS.lang) || "en";
let CURRENT_USER = null;
let CURRENT_ROADMAP_ID = null;

async function api(path, options = {}) {
  const res = await fetch("/api" + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function init() {
  applyTheme(localStorage.getItem(LS.theme) || "light");
  applyLang();
  try {
    const { user } = await api("/auth/me");
    CURRENT_USER = user;
    routeAfterLogin();
  } catch {
    CURRENT_USER = null;
    showPage("landing");
  }
}

function showPage(name) {
  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
  const el = document.getElementById("page-" + name);
  if (el) el.classList.remove("hidden");
  window.scrollTo(0, 0);
  document.getElementById("logoutBtn").style.display = CURRENT_USER ? "" : "none";
  if (name === "student") renderStudentDashboard();
  if (name === "matches") renderFullMatches();
  if (name === "company-board") renderBoardFull();
  if (name === "pro") renderProDashboard();
  if (name === "company") renderCompanyDashboard();
  if (name === "roadmap") renderRoadmap();
}

function routeAfterLogin() {
  if (!CURRENT_USER) return showPage("landing");
  if (CURRENT_USER.role === "student") showPage("student");
  else if (CURRENT_USER.role === "professional") showPage("pro");
  else if (CURRENT_USER.role === "company") showPage("company");
}

async function handleSignup(e) {
  e.preventDefault();
  const f = e.target;
  try {
    const { user } = await api("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name: f.name.value, email: f.email.value, password: f.password.value, role: f.role.value })
    });
    CURRENT_USER = user;
    routeAfterLogin();
  } catch (err) { document.getElementById("signupMsg").textContent = err.message; }
}

async function handleLogin(e) {
  e.preventDefault();
  const f = e.target;
  try {
    const { user } = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: f.email.value, password: f.password.value })
    });
    CURRENT_USER = user;
    routeAfterLogin();
  } catch (err) { document.getElementById("loginMsg").textContent = err.message; }
}

async function logout() {
  try { await api("/auth/logout", { method: "POST" }); } catch {}
  CURRENT_USER = null;
  showPage("landing");
}

function loginDemo(role) {
  const d = DEMO_ACCOUNTS.find(a => a.role === role);
  if (!d) return;
  showPage("login");
  document.querySelector('#page-login input[name="email"]').value = d.email;
  document.querySelector('#page-login input[name="password"]').value = d.password;
}

async function fetchInterests() {
  try { const { interests } = await api("/interests"); return interests; }
  catch { return []; }
}

async function saveUserInterests(tags) {
  await api("/interests", { method: "POST", body: JSON.stringify({ tags }) });
}

function matchPercentage(p, interests) {
  if (!interests.length) return 0;
  const overlap = p.matchTags.filter(t => interests.includes(t)).length;
  return Math.min(100, Math.round((overlap / p.matchTags.length) * 100));
}

function rankedProfessions(interests) {
  return PROFESSIONS.map(p => ({ ...p, pct: matchPercentage(p, interests) })).sort((a,b) => b.pct - a.pct);
}

async function renderStudentDashboard() {
  if (!CURRENT_USER || CURRENT_USER.role !== "student") return;
  document.getElementById("studentGreeting").textContent = (LANG === "ur" ? "خوش آمدید، " : "Hi, ") + CURRENT_USER.name;
  const saved = await fetchInterests();
  const chipsBox = document.getElementById("interestChips");
  chipsBox.innerHTML = "";
  INTEREST_TAGS.forEach(tag => {
    const label = TAG_LABELS[tag] ? TAG_LABELS[tag][LANG] : tag;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip" + (saved.includes(tag) ? " active" : "");
    btn.textContent = label;
    btn.onclick = async () => {
      const cur = await fetchInterests();
      const idx = cur.indexOf(tag);
      if (idx >= 0) cur.splice(idx, 1); else cur.push(tag);
      await saveUserInterests(cur);
      renderStudentDashboard();
    };
    chipsBox.appendChild(btn);
  });
  const matchList = document.getElementById("matchList");
  if (!saved.length) {
    matchList.innerHTML = '<p class="muted">Pick some interests first.</p>';
  } else {
    matchList.innerHTML = "";
    rankedProfessions(saved).slice(0, 5).forEach(p => {
      const div = document.createElement("div");
      div.className = "match-item";
      div.innerHTML = `<div><strong>${p.name[LANG]}</strong><div class="skills-tags">${p.skills.slice(0,3).map(s => `<span class="skill-tag">${s}</span>`).join("")}</div></div><div style="display:flex;align-items:center;gap:.5rem;"><span class="match-pct">${p.pct}%</span><button class="btn-secondary" onclick="openRoadmap('${p.id}')">Roadmap</button></div>`;
      matchList.appendChild(div);
    });
  }
  renderCompanyBoard();
  renderSkillsToLearn();
}

function saveInterests() { renderStudentDashboard(); }

async function renderCompanyBoard() {
  const box = document.getElementById("companyBoard");
  try {
    const { openings } = await api("/openings");
    if (!openings.length) { box.innerHTML = '<p class="muted">No openings yet.</p>'; return; }
    box.innerHTML = openings.map(o => `<div class="opening"><div><strong>${o.title}</strong> — <span class="muted">${o.company_name}</span><div class="skills-tags">${o.skills.map(s => `<span class="skill-tag">${s}</span>`).join("")}</div><p class="muted" style="margin:.35rem 0 0;">${o.description}</p></div></div>`).join("");
  } catch { box.innerHTML = '<p class="muted">Could not load openings.</p>'; }
}

async function renderSkillsToLearn() {
  const box = document.getElementById("skillsToLearn");
  const interests = await fetchInterests();
  if (!interests.length) { box.innerHTML = '<p class="muted">Save a profession to see skills.</p>'; return; }
  const top = rankedProfessions(interests)[0];
  if (!top) return;
  box.innerHTML = `<p class="muted">For ${top.name[LANG]}:</p><div class="skills-tags">${top.skills.map(s => `<span class="skill-tag">${s}</span>`).join("")}</div>`;
}

async function renderFullMatches() {
  const box = document.getElementById("matchesFull");
  const interests = await fetchInterests();
  if (!interests.length) { box.innerHTML = '<p class="muted">No interests saved yet.</p>'; return; }
  box.innerHTML = "";
  rankedProfessions(interests).forEach(p => {
    const div = document.createElement("div");
    div.className = "match-item";
    div.innerHTML = `<div><strong>${p.name[LANG]}</strong><div class="skills-tags">${p.skills.map(s => `<span class="skill-tag">${s}</span>`).join("")}</div></div><div style="display:flex;align-items:center;gap:.5rem;"><span class="match-pct">${p.pct}%</span><button class="btn-secondary" onclick="openRoadmap('${p.id}')">Roadmap</button></div>`;
    box.appendChild(div);
  });
}

function openRoadmap(id) { CURRENT_ROADMAP_ID = id; showPage("roadmap"); }

function renderRoadmap() {
  const titleEl = document.getElementById("roadmapTitle");
  const body = document.getElementById("roadmapBody");
  const p = PROFESSIONS.find(x => x.id === CURRENT_ROADMAP_ID);
  if (!p) { titleEl.textContent = "Roadmap"; body.innerHTML = '<p class="muted">Pick a profession first.</p>'; return; }
  titleEl.textContent = (LANG === "ur" ? "روڈ میپ — " : "Roadmap — ") + p.name[LANG];
  const steps = [
    { h: LANG === "ur" ? "ایف ایس سی گروپ" : "FSc Group", v: p.fscGroup[LANG] },
    { h: LANG === "ur" ? "داخلہ ٹیسٹ" : "Entry Test", v: p.entryTest[LANG] },
    { h: LANG === "ur" ? "ڈگری" : "Degree", v: p.degree[LANG] },
    { h: LANG === "ur" ? "مطلوبہ مہارتیں" : "Skills to build", v: p.skills.join(", ") },
    { h: LANG === "ur" ? "انٹرنشپ" : "Internship", v: p.internship[LANG] },
    { h: LANG === "ur" ? "پہلی نوکری" : "First Job", v: p.firstJob[LANG] }
  ];
  body.innerHTML = steps.map((s, i) => `<div class="roadmap-step"><h4>${i+1}. ${s.h}</h4><p style="margin:0">${s.v}</p></div>`).join("");
}

async function renderBoardFull() {
  const box = document.getElementById("boardFull");
  try {
    const { openings } = await api("/openings");
    if (!openings.length) { box.innerHTML = '<p class="muted">No openings yet.</p>'; return; }
    box.innerHTML = openings.map(o => `<div class="opening"><div><strong>${o.title}</strong> — <span class="muted">${o.company_name}</span><div class="skills-tags">${o.skills.map(s => `<span class="skill-tag">${s}</span>`).join("")}</div><p class="muted" style="margin:.35rem 0 0;">${o.description}</p></div></div>`).join("");
  } catch { box.innerHTML = '<p class="muted">Could not load openings.</p>'; }
}

function renderProDashboard() {
  if (!CURRENT_USER || CURRENT_USER.role !== "professional") return;
  document.getElementById("proProfession").innerHTML = PROFESSIONS.map(p => `<option value="${p.id}">${p.name[LANG]}</option>`).join("");
  renderMyAdvice();
}

async function saveAdvice(e) {
  e.preventDefault();
  const f = e.target;
  try {
    await api("/advice", { method: "POST", body: JSON.stringify({ professionId: f.profession.value, text: f.advice.value }) });
    f.reset();
    renderMyAdvice();
  } catch (err) { alert(err.message); }
}

async function renderMyAdvice() {
  const box = document.getElementById("myAdvice");
  try {
    const { advice } = await api("/advice");
    const mine = advice.filter(a => a.user_id === CURRENT_USER.id);
    if (!mine.length) { box.innerHTML = '<p class="muted">No advice posted yet.</p>'; return; }
    box.innerHTML = mine.map(a => {
      const p = PROFESSIONS.find(x => x.id === a.profession_id);
      return `<div class="card" style="margin:.5rem 0"><strong>${p ? p.name[LANG] : a.profession_id}</strong><p style="margin:.25rem 0">${a.text}</p></div>`;
    }).join("");
  } catch { box.innerHTML = '<p class="muted">Could not load advice.</p>'; }
}

function renderCompanyDashboard() {
  if (!CURRENT_USER || CURRENT_USER.role !== "company") return;
  renderMyOpenings();
  renderSkillDemand();
}

async function createOpening(e) {
  e.preventDefault();
  const f = e.target;
  const skills = f.skills.value.split(",").map(s => s.trim()).filter(Boolean);
  try {
    await api("/openings", { method: "POST", body: JSON.stringify({ title: f.title.value, description: f.description.value, skills }) });
    f.reset();
    renderMyOpenings();
    renderSkillDemand();
  } catch (err) { alert(err.message); }
}

async function renderMyOpenings() {
  const box = document.getElementById("myOpenings");
  try {
    const { openings } = await api("/openings");
    const mine = openings.filter(o => o.company_id === CURRENT_USER.id);
    if (!mine.length) { box.innerHTML = '<p class="muted">You have no openings yet.</p>'; return; }
    box.innerHTML = mine.map(o => `<div class="opening"><div><strong>${o.title}</strong><div class="skills-tags">${o.skills.map(s => `<span class="skill-tag">${s}</span>`).join("")}</div><p class="muted" style="margin:.35rem 0 0;">${o.description}</p></div><div><button class="btn-danger" onclick="deleteOpening(${o.id})">Delete</button></div></div>`).join("");
  } catch { box.innerHTML = '<p class="muted">Could not load openings.</p>'; }
}

async function deleteOpening(id) {
  if (!confirm("Delete this opening?")) return;
  try {
    await api("/openings/" + id, { method: "DELETE" });
    renderMyOpenings();
    renderSkillDemand();
  } catch (err) { alert(err.message); }
}

async function renderSkillDemand() {
  const box = document.getElementById("skillDemand");
  try {
    const { demand } = await api("/skill-demand");
    if (!demand.length) { box.innerHTML = '<p class="muted">No student skill data yet.</p>'; return; }
    const max = demand[0].count;
    box.innerHTML = demand.map(d => `<div class="demand-row"><span style="min-width:140px">${d.tag}</span><div class="demand-bar"><div class="demand-fill" style="width:${(d.count/max)*100}%"></div></div><span>${d.count}</span></div>`).join("");
  } catch { box.innerHTML = '<p class="muted">Could not load demand data.</p>'; }
}

function toggleLang() {
  LANG = LANG === "en" ? "ur" : "en";
  localStorage.setItem(LS.lang, LANG);
  applyLang();
  routeAfterLogin();
}

function applyLang() {
  const isUr = LANG === "ur";
  document.documentElement.lang = isUr ? "ur" : "en";
  document.documentElement.dir = isUr ? "rtl" : "ltr";
  document.getElementById("langBtn").textContent = isUr ? "English" : "اردو";
}

function toggleTheme() {
  const cur = localStorage.getItem(LS.theme) || "light";
  applyTheme(cur === "light" ? "dark" : "light");
  localStorage.setItem(LS.theme, cur === "light" ? "dark" : "light");
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("themeBtn");
  if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
}

document.addEventListener("DOMContentLoaded", init);