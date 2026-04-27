import React from 'react'
import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const YEAR         = new Date().getFullYear();
const MONTHS       = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const TODAY        = new Date();
const MONTH_IDX    = TODAY.getMonth();
const WEEK_OF_YEAR = Math.ceil((TODAY - new Date(YEAR, 0, 1)) / 604800000);
const DAY_KEY      = `${TODAY.getFullYear()}-${TODAY.getMonth()}-${TODAY.getDate()}`;
const WEEK_KEY     = `${TODAY.getFullYear()}-W${WEEK_OF_YEAR}`;
const MONTH_KEY    = `${TODAY.getFullYear()}-${TODAY.getMonth()}`;
const SESSION_KEY  = "gt_session";
const USERS_KEY    = "gt_users";

const CATEGORIES = [
  { id: "health",   label: "Health",   color: "#5B8A72" },
  { id: "work",     label: "Work",     color: "#7A7ACB" },
  { id: "learning", label: "Learning", color: "#C4865A" },
  { id: "personal", label: "Personal", color: "#B05E7A" },
  { id: "finance",  label: "Finance",  color: "#4E9BB0" },
];

const FREQ_CONFIG = {
  daily:   { label: "Daily",   icon: "☀️", periodKey: DAY_KEY },
  weekly:  { label: "Weekly",  icon: "📅", periodKey: WEEK_KEY },
  monthly: { label: "Monthly", icon: "🗓️", periodKey: MONTH_KEY },
};

// Sentiment options: value 1–5, emoji, label, colour
const SENTIMENTS = [
  { value: 1, emoji: "😞", label: "Struggling",  color: "#E57373" },
  { value: 2, emoji: "😕", label: "Below par",   color: "#FFB74D" },
  { value: 3, emoji: "😐", label: "Neutral",     color: "#90A4AE" },
  { value: 4, emoji: "🙂", label: "Good",        color: "#81C784" },
  { value: 5, emoji: "🚀", label: "Crushing it", color: "#4DB6AC" },
];

function sentimentForValue(v) { return SENTIMENTS.find(s => s.value === v) || SENTIMENTS[2]; }

// ─────────────────────────────────────────────────────────────────────────────
// AUTH HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9); }

function hashPassword(pw) {
  let h = 5381;
  for (let i = 0; i < pw.length; i++) h = (h * 33) ^ pw.charCodeAt(i);
  return (h >>> 0).toString(16);
}

const getUsers    = () => { try { return JSON.parse(sessionStorage.getItem(USERS_KEY) || "{}"); } catch { return {}; } };
const saveUsers   = u => sessionStorage.setItem(USERS_KEY, JSON.stringify(u));
const getSession  = () => { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch { return null; } };
const saveSession = s => sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
const clearSession= () => sessionStorage.removeItem(SESSION_KEY);
const getUserData = id => { try { return JSON.parse(sessionStorage.getItem(`gt_data_${id}`) || "null"); } catch { return null; } };
const saveUserData= (id, d) => sessionStorage.setItem(`gt_data_${id}`, JSON.stringify(d));

function tryRegister(name, email, password) {
  if (!name.trim() || !email.trim() || !password) return { ok: false, error: "All fields required." };
  if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  if (!/\S+@\S+\.\S+/.test(email)) return { ok: false, error: "Enter a valid email address." };
  const users = getUsers(), key = email.toLowerCase();
  if (users[key]) return { ok: false, error: "An account with this email already exists." };
  const user = { id: uid(), name: name.trim(), email: key, hash: hashPassword(password) };
  users[key] = user; saveUsers(users);
  return { ok: true, user };
}

function tryLogin(email, password) {
  if (!email.trim() || !password) return { ok: false, error: "Enter your email and password." };
  const users = getUsers(), user = users[email.toLowerCase()];
  if (!user) return { ok: false, error: "No account found for this email." };
  if (user.hash !== hashPassword(password)) return { ok: false, error: "Incorrect password." };
  return { ok: true, user };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO DATA
// ─────────────────────────────────────────────────────────────────────────────

function demoData() {
  const g1 = uid(), g2 = uid(), g3 = uid();
  // Build some fake past sentiment entries so the chart looks interesting
  const sentiments = {};
  [g1, g2, g3].forEach(gid => {
    for (let w = WEEK_OF_YEAR - 7; w < WEEK_OF_YEAR; w++) {
      if (w < 1) continue;
      const key = `${YEAR}-W${w}`;
      if (!sentiments[key]) sentiments[key] = { weekKey: key, ratings: {}, note: "" };
      sentiments[key].ratings[gid] = Math.floor(Math.random() * 3) + 2; // 2-4
    }
  });
  return {
    goals: [
      { id: g1, title: "Read 24 books",  category: "learning", target: 24,   progress: 7,    unit: "books", deadline: "Dec", note: "Mostly non-fiction this year.", monthly: [2,1,1,2,1,0,0,0,0,0,0,0] },
      { id: g2, title: "Run 500 km",     category: "health",   target: 500,  progress: 148,  unit: "km",    deadline: "Dec", note: "", monthly: [28,22,30,35,33,0,0,0,0,0,0,0] },
      { id: g3, title: "Save £5,000",    category: "finance",  target: 5000, progress: 1800, unit: "£",     deadline: "Dec", note: "Emergency fund first.", monthly: [400,350,500,550,0,0,0,0,0,0,0,0] },
    ],
    actions: [
      { id: uid(), goalId: g1, title: "Read for 30 mins",          freq: "daily",   completions: {} },
      { id: uid(), goalId: g1, title: "Pick next book from list",  freq: "weekly",  completions: {} },
      { id: uid(), goalId: g2, title: "Morning run",               freq: "daily",   completions: {} },
      { id: uid(), goalId: g2, title: "Log weekly mileage",        freq: "weekly",  completions: {} },
      { id: uid(), goalId: g3, title: "Review budget spreadsheet", freq: "monthly", completions: {} },
      { id: uid(), goalId: g3, title: "Transfer to savings",       freq: "monthly", completions: {} },
    ],
    sentiments, // { "2026-W14": { weekKey, ratings: { goalId: 1-5 }, note: "" }, … }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────────────────────

function actionIsDoneThisPeriod(action) {
  return !!(action.completions && action.completions[FREQ_CONFIG[action.freq].periodKey]);
}

function actionStreakCount(action) {
  if (!action.completions) return 0;
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    let k;
    if (action.freq === "daily") {
      const d = new Date(TODAY); d.setDate(d.getDate() - i);
      k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    } else if (action.freq === "weekly") {
      const wk = WEEK_OF_YEAR - i; if (wk < 1) break; k = `${YEAR}-W${wk}`;
    } else {
      const mo = MONTH_IDX - i; if (mo < 0) break; k = `${YEAR}-${mo}`;
    }
    if (action.completions[k]) streak++; else break;
  }
  return streak;
}

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  bg: "#F7F6F3", card: "#FFFFFF", border: "#EBEBEB",
  ink: "#1A1A1A", muted: "#999999", faint: "#CCCCCC",
  mono: "'DM Mono', monospace", serif: "'Lora', serif",
};

const inputStyle = {
  width: "100%", border: `1px solid ${T.border}`, borderRadius: 8,
  padding: "10px 13px", fontSize: 14, outline: "none",
  fontFamily: T.serif, background: "#FAFAFA", boxSizing: "border-box",
  color: T.ink, transition: "border-color 0.15s",
};
const labelStyle = {
  fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
  color: T.muted, textTransform: "uppercase", marginBottom: 5,
  display: "block", fontFamily: T.mono,
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH SCREEN
// ─────────────────────────────────────────────────────────────────────────────

function PasswordStrength({ pw }) {
  const checks = [{ label: "6+ chars", ok: pw.length >= 6 }, { label: "uppercase", ok: /[A-Z]/.test(pw) }, { label: "number", ok: /[0-9]/.test(pw) }];
  const score = checks.filter(c => c.ok).length;
  const colors = ["#E74C3C","#F39C12","#27AE60"];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
        {[0,1,2].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i < score ? colors[score-1] : "#E8E8E8", transition: "background 0.3s" }} />)}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {checks.map(c => <span key={c.label} style={{ fontSize: 10, fontFamily: T.mono, color: c.ok ? "#27AE60" : T.faint }}>{c.ok ? "✓" : "·"} {c.label}</span>)}
      </div>
    </div>
  );
}

function AuthScreen({ onAuth }) {
  const [mode, setMode]         = useState("login");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  function submit() {
    setError(""); setLoading(true);
    setTimeout(() => {
      if (mode === "register") {
        const r = tryRegister(name, email, password);
        if (!r.ok) { setError(r.error); setLoading(false); return; }
        saveUserData(r.user.id, demoData()); saveSession(r.user); onAuth(r.user);
      } else {
        const r = tryLogin(email, password);
        if (!r.ok) { setError(r.error); setLoading(false); return; }
        saveSession(r.user); onAuth(r.user);
      }
    }, 320);
  }

  function switchMode(m) { setMode(m); setError(""); setName(""); setEmail(""); setPassword(""); }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=DM+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.serif, padding: 20, boxSizing: "border-box" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 16, background: T.ink, marginBottom: 14 }}>
              <span style={{ fontSize: 22 }}>🎯</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>GoalTracker</div>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>{mode === "login" ? "Welcome back" : "Create your account"}</div>
          </div>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, padding: "32px 28px", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", background: "#F0F0EE", borderRadius: 10, padding: 3, marginBottom: 24 }}>
              {["login","register"].map(m => (
                <button key={m} onClick={() => switchMode(m)} style={{ flex: 1, background: mode === m ? "#fff" : "transparent", color: mode === m ? T.ink : T.muted, border: "none", borderRadius: 8, padding: "8px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s", fontFamily: T.mono }}>
                  {m === "login" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {mode === "register" && <div><label style={labelStyle}>Full name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" style={inputStyle} onFocus={e => e.target.style.borderColor="#AAA"} onBlur={e => e.target.style.borderColor=T.border} /></div>}
              <div><label style={labelStyle}>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} onKeyDown={e => e.key === "Enter" && submit()} onFocus={e => e.target.style.borderColor="#AAA"} onBlur={e => e.target.style.borderColor=T.border} /></div>
              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === "register" ? "Min. 6 characters" : "••••••••"} style={{ ...inputStyle, paddingRight: 44 }} onKeyDown={e => e.key === "Enter" && submit()} onFocus={e => e.target.style.borderColor="#AAA"} onBlur={e => e.target.style.borderColor=T.border} />
                  <button onClick={() => setShowPw(x => !x)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 15, color: T.muted, padding: 2 }}>{showPw ? "🙈" : "👁"}</button>
                </div>
                {mode === "register" && password.length > 0 && <PasswordStrength pw={password} />}
              </div>
              {error && <div style={{ background: "#FFF2F2", border: "1px solid #FFCDD2", borderRadius: 8, padding: "10px 13px", fontSize: 13, color: "#C0392B", display: "flex", gap: 7, alignItems: "center" }}><span>⚠️</span> {error}</div>}
              <button onClick={submit} disabled={loading} style={{ background: T.ink, color: "#fff", border: "none", borderRadius: 11, padding: "12px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", marginTop: 4, opacity: loading ? 0.6 : 1, transition: "opacity 0.15s", fontFamily: T.serif }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = 0.82; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.opacity = 1; }}>
                {loading ? "…" : mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: T.faint, fontFamily: T.mono }}>Data stored locally in this browser session only.</div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function ProgressRing({ pct, color, size = 44 }) {
  const r = (size - 6) / 2, circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#EBEBEB" strokeWidth={3} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={circ - (pct/100)*circ} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SENTIMENT SPARKLINE  (mini 8-week chart per goal)
// ─────────────────────────────────────────────────────────────────────────────

function SentimentSparkline({ goalId, sentiments, color }) {
  const weeks = [];
  for (let w = WEEK_OF_YEAR - 7; w <= WEEK_OF_YEAR; w++) {
    if (w < 1) continue;
    const key = `${YEAR}-W${w}`;
    const entry = sentiments[key];
    const val = entry?.ratings?.[goalId] || null;
    weeks.push({ w, key, val });
  }
  if (weeks.every(x => x.val === null)) return null;

  const W = 14, H = 28, GAP = 3;
  const totalW = weeks.length * (W + GAP) - GAP;

  return (
    <svg width={totalW} height={H + 12} style={{ overflow: "visible" }}>
      {/* connecting line */}
      {weeks.map((pt, i) => {
        if (i === 0 || pt.val === null || weeks[i-1].val === null) return null;
        const x1 = (i-1)*(W+GAP) + W/2, y1 = H - ((weeks[i-1].val-1)/4)*H;
        const x2 = i*(W+GAP) + W/2,     y2 = H - ((pt.val-1)/4)*H;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.5} strokeOpacity={0.35} />;
      })}
      {weeks.map((pt, i) => {
        const x = i * (W + GAP);
        const isCurrent = pt.w === WEEK_OF_YEAR;
        if (pt.val === null) {
          return (
            <g key={pt.key}>
              <rect x={x} y={0} width={W} height={H} rx={4} fill="#F2F2F2" opacity={isCurrent ? 0.9 : 0.5} />
              <text x={x+W/2} y={H/2+4} textAnchor="middle" fontSize={9} fill="#CCC">–</text>
            </g>
          );
        }
        const s = sentimentForValue(pt.val);
        const barH = Math.round(((pt.val-1)/4) * (H-6)) + 6;
        return (
          <g key={pt.key}>
            <rect x={x} y={H-barH} width={W} height={barH} rx={4}
              fill={s.color} opacity={isCurrent ? 1 : 0.55}
              style={{ transition: "all 0.3s" }} />
            <text x={x+W/2} y={H+11} textAnchor="middle" fontSize={8} fill={T.faint} fontFamily={T.mono}>
              {isCurrent ? "now" : `W${pt.w}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY CHECK-IN PANEL  (full Reflect tab)
// ─────────────────────────────────────────────────────────────────────────────

function ReflectPanel({ goals, sentiments, onSaveSentiment }) {
  const thisWeekEntry = sentiments[WEEK_KEY] || { weekKey: WEEK_KEY, ratings: {}, note: "" };
  const [ratings, setRatings] = useState({ ...thisWeekEntry.ratings });
  const [note, setNote]       = useState(thisWeekEntry.note || "");
  const [saved, setSaved]     = useState(false);

  const allRated   = goals.length > 0 && goals.every(g => ratings[g.id]);
  const alreadyDone = Object.keys(thisWeekEntry.ratings).length === goals.length && goals.length > 0;

  function save() {
    onSaveSentiment(WEEK_KEY, { weekKey: WEEK_KEY, ratings, note });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // History: last 8 weeks worth of entries
  const historyWeeks = [];
  for (let w = WEEK_OF_YEAR - 1; w >= Math.max(1, WEEK_OF_YEAR - 7); w--) {
    const key = `${YEAR}-W${w}`;
    if (sentiments[key] && Object.keys(sentiments[key].ratings).length > 0) {
      historyWeeks.push({ key, w, entry: sentiments[key] });
    }
  }

  function avgRating(entry) {
    const vals = Object.values(entry.ratings).filter(Boolean);
    if (!vals.length) return null;
    return (vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(1);
  }

  return (
    <div>
      {/* ── This week's check-in ── */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: "24px 24px 22px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: T.faint, textTransform: "uppercase", fontFamily: T.mono, marginBottom: 3 }}>
              Week {WEEK_OF_YEAR} Check-in
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.ink }}>How's each goal feeling?</div>
          </div>
          {alreadyDone && !saved && (
            <div style={{ fontSize: 11, fontFamily: T.mono, color: "#81C784", background: "#F0FFF4", border: "1px solid #B7EAC8", borderRadius: 8, padding: "4px 10px" }}>
              ✓ Logged this week
            </div>
          )}
        </div>

        {goals.length === 0 && (
          <div style={{ fontSize: 13, color: T.faint, fontStyle: "italic" }}>Add goals first to start tracking sentiment.</div>
        )}

        {/* Per-goal rating rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {goals.map(g => {
            const cat = CATEGORIES.find(c => c.id === g.category) || CATEGORIES[0];
            const current = ratings[g.id] || null;
            return (
              <div key={g.id} style={{ borderBottom: `1px solid #F4F4F4`, paddingBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 99, background: cat.color, flexShrink: 0 }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{g.title}</div>
                  {current && (
                    <span style={{ marginLeft: "auto", fontSize: 11, fontFamily: T.mono, color: sentimentForValue(current).color, fontWeight: 700 }}>
                      {sentimentForValue(current).emoji} {sentimentForValue(current).label}
                    </span>
                  )}
                </div>
                {/* Sentiment picker */}
                <div style={{ display: "flex", gap: 6 }}>
                  {SENTIMENTS.map(s => (
                    <button key={s.value} onClick={() => setRatings(r => ({ ...r, [g.id]: r[g.id] === s.value ? null : s.value }))}
                      title={s.label}
                      style={{
                        flex: 1, padding: "8px 4px", borderRadius: 10, cursor: "pointer",
                        border: current === s.value ? `2px solid ${s.color}` : `2px solid transparent`,
                        background: current === s.value ? s.color + "22" : "#F7F6F3",
                        transition: "all 0.15s", display: "flex", flexDirection: "column",
                        alignItems: "center", gap: 3,
                      }}
                      onMouseEnter={e => { if (current !== s.value) e.currentTarget.style.background = "#EFEFED"; }}
                      onMouseLeave={e => { if (current !== s.value) e.currentTarget.style.background = "#F7F6F3"; }}
                    >
                      <span style={{ fontSize: 18 }}>{s.emoji}</span>
                      <span style={{ fontSize: 8, fontFamily: T.mono, color: current === s.value ? s.color : T.faint, fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Reflection note */}
        {goals.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Weekly reflection (optional)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="What went well? What got in the way? What will you do differently next week?"
              rows={3}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, fontSize: 13 }}
              onFocus={e => e.target.style.borderColor = "#AAAAAA"}
              onBlur={e => e.target.style.borderColor = T.border}
            />
          </div>
        )}

        {goals.length > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button onClick={save} style={{
              background: saved ? "#81C784" : allRated ? T.ink : "#DCDCDC",
              color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px",
              fontSize: 14, fontWeight: 700, cursor: allRated ? "pointer" : "default",
              transition: "all 0.2s", fontFamily: T.serif,
            }}>
              {saved ? "✓ Saved!" : allRated ? "Save check-in" : "Rate all goals to save"}
            </button>
          </div>
        )}
      </div>

      {/* ── Overall mood trend chart ── */}
      {Object.keys(sentiments).length > 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: "22px 24px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: T.faint, textTransform: "uppercase", fontFamily: T.mono, marginBottom: 14 }}>
            Sentiment trend — last 8 weeks
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {goals.map(g => {
              const cat = CATEGORIES.find(c => c.id === g.category) || CATEGORIES[0];
              return (
                <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 130, flexShrink: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.title}</div>
                    <div style={{ fontSize: 10, color: cat.color, fontFamily: T.mono, textTransform: "uppercase", fontWeight: 700 }}>{cat.label}</div>
                  </div>
                  <div style={{ flex: 1, overflowX: "auto" }}>
                    <SentimentSparkline goalId={g.id} sentiments={sentiments} color={cat.color} />
                  </div>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
            {SENTIMENTS.map(s => (
              <div key={s.value} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
                <span style={{ fontSize: 10, fontFamily: T.mono, color: T.muted }}>{s.emoji} {s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Past check-in history ── */}
      {historyWeeks.length > 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: "22px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: T.faint, textTransform: "uppercase", fontFamily: T.mono, marginBottom: 14 }}>
            Past check-ins
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {historyWeeks.map(({ key, w, entry }) => {
              const avg = avgRating(entry);
              const avgVal = avg ? Math.round(parseFloat(avg)) : null;
              const s = avgVal ? sentimentForValue(avgVal) : null;
              return (
                <details key={key} style={{ borderBottom: `1px solid #F4F4F4` }}>
                  <summary style={{
                    cursor: "pointer", padding: "12px 0", listStyle: "none",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <span style={{ fontSize: 11, fontFamily: T.mono, color: T.muted, width: 56 }}>W{w}</span>
                    {s && <span style={{ fontSize: 16 }}>{s.emoji}</span>}
                    {avg && <span style={{ fontSize: 12, fontFamily: T.mono, color: s?.color, fontWeight: 700 }}>avg {avg}</span>}
                    <div style={{ flex: 1, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {goals.map(g => {
                        const v = entry.ratings[g.id];
                        if (!v) return null;
                        const sv = sentimentForValue(v);
                        const cat = CATEGORIES.find(c => c.id === g.category) || CATEGORIES[0];
                        return (
                          <span key={g.id} style={{ fontSize: 10, fontFamily: T.mono, background: sv.color + "20", color: sv.color, borderRadius: 6, padding: "2px 7px", fontWeight: 600 }}>
                            {sv.emoji} {g.title.split(" ").slice(0,3).join(" ")}
                          </span>
                        );
                      })}
                    </div>
                    <span style={{ fontSize: 12, color: T.faint }}>▾</span>
                  </summary>
                  <div style={{ padding: "0 0 14px 68px" }}>
                    {entry.note && (
                      <div style={{ fontSize: 13, color: T.muted, fontStyle: "italic", lineHeight: 1.6, marginTop: 4 }}>
                        "{entry.note}"
                      </div>
                    )}
                    {!entry.note && <div style={{ fontSize: 12, color: T.faint, fontStyle: "italic" }}>No reflection note.</div>}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GOAL CARD
// ─────────────────────────────────────────────────────────────────────────────

function ActionRow({ action, color, onToggle, onDelete }) {
  const done = actionIsDoneThisPeriod(action);
  const streak = actionStreakCount(action);
  const fc = FREQ_CONFIG[action.freq];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #F4F4F4" }}>
      <button onClick={() => onToggle(action)} style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: `2px solid ${done ? color : "#DCDCDC"}`, background: done ? color : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
        {done && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: done ? "#AAAAAA" : "#2A2A2A", textDecoration: done ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{action.title}</div>
      </div>
      <span style={{ fontSize: 10, fontFamily: T.mono, fontWeight: 600, background: "#F2F2F2", color: "#999", borderRadius: 99, padding: "2px 8px", flexShrink: 0 }}>{fc.icon} {fc.label}</span>
      {streak > 0 && <span style={{ fontSize: 10, fontFamily: T.mono, color, fontWeight: 700, flexShrink: 0 }}>🔥{streak}</span>}
      <button onClick={() => onDelete(action.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#DDD", fontSize: 14, padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
    </div>
  );
}

function GoalCard({ goal, actions, sentiments, onUpdateGoal, onDeleteGoal, onAddAction, onToggleAction, onDeleteAction }) {
  const cat = CATEGORIES.find(c => c.id === goal.category) || CATEGORIES[0];
  const pct = Math.min(100, Math.round((goal.progress / goal.target) * 100)) || 0;
  const [editingProgress, setEditingProgress] = useState(false);
  const [draft, setDraft]       = useState(goal.progress);
  const [expanded, setExpanded] = useState(true);
  const [addingAction, setAddingAction]   = useState(false);
  const [newActionTitle, setNewActionTitle] = useState("");
  const [newActionFreq, setNewActionFreq]   = useState("daily");

  const myActions  = actions.filter(a => a.goalId === goal.id);
  const doneCount  = myActions.filter(a => actionIsDoneThisPeriod(a)).length;
  const thisWeekSentiment = sentiments[WEEK_KEY]?.ratings?.[goal.id];

  function saveProgress() {
    const v = Math.max(0, Math.min(goal.target, Number(draft)));
    onUpdateGoal({ ...goal, progress: v }); setEditingProgress(false);
  }
  function submitAction() {
    if (!newActionTitle.trim()) return;
    onAddAction({ id: uid(), goalId: goal.id, title: newActionTitle.trim(), freq: newActionFreq, completions: {} });
    setNewActionTitle(""); setAddingAction(false);
  }

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", transition: "box-shadow 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 18px rgba(0,0,0,0.08)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"}
    >
      <div style={{ height: 4, background: cat.color, opacity: 0.7 }} />
      <div style={{ padding: "18px 20px 20px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: cat.color, textTransform: "uppercase", marginBottom: 3, fontFamily: T.mono }}>{cat.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, lineHeight: 1.3 }}>{goal.title}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* This-week sentiment badge */}
            {thisWeekSentiment && (
              <span title={`This week: ${sentimentForValue(thisWeekSentiment).label}`} style={{ fontSize: 16, cursor: "default" }}>
                {sentimentForValue(thisWeekSentiment).emoji}
              </span>
            )}
            <div style={{ position: "relative" }}>
              <ProgressRing pct={pct} color={cat.color} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: cat.color, fontFamily: T.mono }}>{pct}%</div>
            </div>
            <button onClick={() => setExpanded(x => !x)} style={{ background: "none", border: "none", cursor: "pointer", color: "#BBB", fontSize: 13, padding: 2, transform: expanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}>▾</button>
            <button onClick={() => onDeleteGoal(goal.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#DDD", fontSize: 16, padding: 2, lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 12 }}>
          <div style={{ height: 5, background: "#F2F2F2", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: cat.color, borderRadius: 99, transition: "width 0.6s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 11, color: "#999", fontFamily: T.mono }}>
            <span>
              {editingProgress ? (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <input type="number" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && saveProgress()}
                    style={{ width: 52, border: "1px solid #DCDCDC", borderRadius: 6, padding: "1px 5px", fontSize: 11, fontFamily: T.mono, outline: "none" }} autoFocus />
                  <button onClick={saveProgress} style={{ background: cat.color, color: "#fff", border: "none", borderRadius: 5, padding: "2px 7px", cursor: "pointer", fontSize: 11, fontFamily: T.mono }}>save</button>
                </span>
              ) : (
                <span style={{ cursor: "pointer" }} onClick={() => { setDraft(goal.progress); setEditingProgress(true); }}>
                  {goal.progress} / {goal.target} {goal.unit}
                </span>
              )}
            </span>
            <span style={{ color: "#bbb" }}>due {goal.deadline || "Dec"}</span>
          </div>
        </div>

        {/* Monthly bars */}
        {goal.monthly && (
          <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 22, marginTop: 12 }}>
            {MONTHS.map((m, i) => {
              const val = goal.monthly[i] || 0, max = Math.max(...goal.monthly, 1);
              return <div key={m} title={`${m}: ${val}`} style={{ flex: 1, height: Math.round((val/max)*18)+4, borderRadius: 3, background: i === MONTH_IDX ? cat.color : "#E8E8E8", opacity: i > MONTH_IDX ? 0.3 : 1 }} />;
            })}
          </div>
        )}

        {/* Actions */}
        {expanded && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#BBBBBB", textTransform: "uppercase", fontFamily: T.mono }}>
                Actions {myActions.length > 0 && `· ${doneCount}/${myActions.length} done`}
              </div>
              <button onClick={() => setAddingAction(x => !x)} style={{ background: "none", border: `1px solid ${cat.color}`, color: cat.color, borderRadius: 99, padding: "2px 10px", fontSize: 11, cursor: "pointer", fontFamily: T.mono, fontWeight: 600 }}>+ action</button>
            </div>
            {addingAction && (
              <div style={{ background: "#FAFAFA", border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                <input placeholder="e.g. Go for a run, Read 20 pages…" value={newActionTitle} onChange={e => setNewActionTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && submitAction()} autoFocus
                  style={{ border: "1px solid #DCDCDC", borderRadius: 7, padding: "7px 10px", fontSize: 13, outline: "none", fontFamily: T.serif, background: "#fff", width: "100%", boxSizing: "border-box" }} />
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {Object.entries(FREQ_CONFIG).map(([k, fc]) => (
                    <button key={k} onClick={() => setNewActionFreq(k)} style={{ background: newActionFreq === k ? cat.color : "#F2F2F2", color: newActionFreq === k ? "#fff" : "#888", border: "none", borderRadius: 99, padding: "4px 12px", fontSize: 11, cursor: "pointer", fontFamily: T.mono, fontWeight: 600, transition: "all 0.15s" }}>{fc.icon} {fc.label}</button>
                  ))}
                  <div style={{ flex: 1 }} />
                  <button onClick={submitAction} style={{ background: cat.color, color: "#fff", border: "none", borderRadius: 7, padding: "5px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600, opacity: !newActionTitle.trim() ? 0.4 : 1 }}>Add</button>
                  <button onClick={() => setAddingAction(false)} style={{ background: "none", border: "none", color: "#bbb", cursor: "pointer", fontSize: 18 }}>×</button>
                </div>
              </div>
            )}
            {myActions.length === 0 && !addingAction && <div style={{ fontSize: 12, color: "#CCCCCC", fontStyle: "italic", padding: "6px 0" }}>No actions yet.</div>}
            {myActions.map(a => <ActionRow key={a.id} action={a} color={cat.color} onToggle={onToggleAction} onDelete={onDeleteAction} />)}
          </div>
        )}

        {goal.note && <div style={{ fontSize: 12, color: "#AAA", fontStyle: "italic", borderTop: "1px solid #F2F2F2", paddingTop: 10, marginTop: 12 }}>{goal.note}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TODAY PANEL
// ─────────────────────────────────────────────────────────────────────────────

function TodayPanel({ actions, goals, onToggleAction }) {
  const pending = actions.filter(a => !actionIsDoneThisPeriod(a));
  const done    = actions.filter(a =>  actionIsDoneThisPeriod(a));
  const pct     = actions.length ? Math.round((done.length / actions.length) * 100) : 0;
  const grouped = Object.keys(FREQ_CONFIG).reduce((acc, freq) => { acc[freq] = pending.filter(a => a.freq === freq); return acc; }, {});
  const goalFor = a => goals.find(g => g.id === a.goalId);
  const catFor  = a => { const g = goalFor(a); return g ? (CATEGORIES.find(c => c.id === g.category) || CATEGORIES[0]) : CATEGORIES[0]; };

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: "22px", marginBottom: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#AAAAAA", textTransform: "uppercase", marginBottom: 3, fontFamily: T.mono }}>Today's Actions</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.ink }}>{done.length} of {actions.length} complete</div>
        </div>
        <div style={{ position: "relative" }}>
          <ProgressRing pct={pct} color={T.ink} size={52} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: T.ink, fontFamily: T.mono }}>{pct}%</div>
        </div>
      </div>
      {actions.length === 0 && <div style={{ fontSize: 13, color: "#CCC", fontStyle: "italic" }}>Add actions to your goals and they'll appear here.</div>}
      {Object.entries(FREQ_CONFIG).map(([freq, fc]) => {
        const items = grouped[freq] || []; if (!items.length) return null;
        return (
          <div key={freq} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#CCCCCC", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: T.mono, marginBottom: 4 }}>{fc.icon} {fc.label}</div>
            {items.map(a => {
              const cat = catFor(a); const goal = goalFor(a);
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #F4F4F4" }}>
                  <button onClick={() => onToggleAction(a)} style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, border: `2px solid ${cat.color}`, background: "transparent", cursor: "pointer" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: "#2A2A2A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</div>
                    {goal && <div style={{ fontSize: 11, color: "#BBB", fontFamily: T.mono }}>↳ {goal.title}</div>}
                  </div>
                  {(() => { const s = actionStreakCount(a); return s > 0 ? <span style={{ fontSize: 11, color: cat.color, fontWeight: 700, fontFamily: T.mono }}>🔥{s}</span> : null; })()}
                </div>
              );
            })}
          </div>
        );
      })}
      {done.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#CCCCCC", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: T.mono, marginBottom: 4 }}>✅ Done</div>
          {done.map(a => {
            const cat = catFor(a);
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", opacity: 0.4 }}>
                <div style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, background: cat.color, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => onToggleAction(a)}>
                  <span style={{ color: "#fff", fontSize: 11 }}>✓</span>
                </div>
                <div style={{ fontSize: 13, color: "#AAA", textDecoration: "line-through" }}>{a.title}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD GOAL MODAL
// ─────────────────────────────────────────────────────────────────────────────

function AddGoalModal({ onAdd, onClose }) {
  const [title, setTitle] = useState(""), [cat, setCat] = useState("health"),
        [target, setTarget] = useState(""), [unit, setUnit] = useState(""),
        [deadline, setDeadline] = useState("Dec"), [note, setNote] = useState("");
  function submit() {
    if (!title.trim() || !target) return;
    onAdd({ id: uid(), title: title.trim(), category: cat, target: Number(target), progress: 0, unit: unit.trim() || "units", deadline, note: note.trim(), monthly: Array(12).fill(0) });
    onClose();
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.18)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(2px)" }}>
      <div style={{ background: T.card, borderRadius: 20, padding: "32px 28px", width: 420, maxWidth: "92vw", boxShadow: "0 20px 60px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.ink, fontFamily: T.serif }}>New Goal</div>
        <div><label style={labelStyle}>Goal title</label><input placeholder="What do you want to achieve?" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} autoFocus /></div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}><label style={labelStyle}>Target</label><input type="number" placeholder="100" value={target} onChange={e => setTarget(e.target.value)} style={inputStyle} /></div>
          <div style={{ flex: 1 }}><label style={labelStyle}>Unit</label><input placeholder="books, km, sessions…" value={unit} onChange={e => setUnit(e.target.value)} style={inputStyle} /></div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}><label style={labelStyle}>Category</label><select value={cat} onChange={e => setCat(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
          <div style={{ flex: 1 }}><label style={labelStyle}>Deadline</label><select value={deadline} onChange={e => setDeadline(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>{MONTHS.map(m => <option key={m} value={m}>{m} {YEAR}</option>)}</select></div>
        </div>
        <div><label style={labelStyle}>Note (optional)</label><input placeholder="Why does this matter?" value={note} onChange={e => setNote(e.target.value)} style={inputStyle} /></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 9, padding: "9px 20px", cursor: "pointer", fontSize: 14, color: "#888" }}>Cancel</button>
          <button onClick={submit} style={{ background: T.ink, color: "#fff", border: "none", borderRadius: 9, padding: "9px 24px", cursor: "pointer", fontSize: 14, fontWeight: 600, opacity: (!title || !target) ? 0.4 : 1 }}>Add Goal</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP + DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(() => getSession());
  if (!user) return <AuthScreen onAuth={u => setUser(u)} />;
  return <Dashboard user={user} onLogout={() => { clearSession(); setUser(null); }} />;
}

function Dashboard({ user, onLogout }) {
  const [data, setData]         = useState(() => getUserData(user.id) || demoData());
  const { goals, actions, sentiments } = data;
  const [showAdd, setShowAdd]   = useState(false);
  const [filter, setFilter]     = useState("all");
  const [view, setView]         = useState("goals");
  const [showUserMenu, setShowUserMenu] = useState(false);

  function persist(next) { setData(next); saveUserData(user.id, next); }

  function addGoal(g)      { persist({ ...data, goals: [...goals, g] }); }
  function updateGoal(g)   { persist({ ...data, goals: goals.map(x => x.id === g.id ? g : x) }); }
  function deleteGoal(id)  { persist({ ...data, goals: goals.filter(x => x.id !== id), actions: actions.filter(a => a.goalId !== id) }); }
  function addAction(a)    { persist({ ...data, actions: [...actions, a] }); }
  function deleteAction(id){ persist({ ...data, actions: actions.filter(a => a.id !== id) }); }
  function toggleAction(action) {
    const key = FREQ_CONFIG[action.freq].periodKey;
    const updated = { ...action, completions: { ...action.completions, [key]: !action.completions[key] } };
    persist({ ...data, actions: actions.map(a => a.id === action.id ? updated : a) });
  }
  function saveSentiment(weekKey, entry) {
    persist({ ...data, sentiments: { ...(sentiments || {}), [weekKey]: entry } });
  }

  const displayed    = filter === "all" ? goals : goals.filter(g => g.category === filter);
  const overallPct   = goals.length ? Math.round(goals.reduce((s, g) => s + Math.min(100, (g.progress/g.target)*100), 0) / goals.length) : 0;
  const pendingCount = actions.filter(a => !actionIsDoneThisPeriod(a)).length;
  const thisWeekDone = sentiments?.[WEEK_KEY] && Object.keys(sentiments[WEEK_KEY].ratings).length === goals.length && goals.length > 0;
  const initials     = user.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();

  const TABS = [
    { id: "goals",   label: "Goals" },
    { id: "today",   label: `Today${pendingCount > 0 ? ` · ${pendingCount}` : ""}` },
    { id: "reflect", label: `Reflect${thisWeekDone ? " ✓" : ""}` },
  ];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=DM+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.serif, padding: "36px 16px 60px", boxSizing: "border-box" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: 26 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", color: "#AAAAAA", textTransform: "uppercase", marginBottom: 5, fontFamily: T.mono }}>{YEAR} · Week {WEEK_OF_YEAR} of 52</div>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>Your Goals</h1>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => setShowAdd(true)} style={{ background: T.ink, color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 0.8} onMouseLeave={e => e.currentTarget.style.opacity = 1}>
                  <span style={{ fontSize: 17 }}>+</span> Add Goal
                </button>
                {/* Avatar */}
                <div style={{ position: "relative" }}>
                  <button onClick={() => setShowUserMenu(x => !x)} style={{ width: 40, height: 40, borderRadius: 12, background: T.ink, color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: T.mono, display: "flex", alignItems: "center", justifyContent: "center" }} title={user.name}>{initials}</button>
                  {showUserMenu && (
                    <>
                      <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setShowUserMenu(false)} />
                      <div style={{ position: "absolute", right: 0, top: 48, zIndex: 50, background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", minWidth: 200, padding: 8 }}>
                        <div style={{ padding: "10px 12px", borderBottom: `1px solid ${T.border}`, marginBottom: 6 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{user.name}</div>
                          <div style={{ fontSize: 11, color: T.muted, fontFamily: T.mono, marginTop: 2 }}>{user.email}</div>
                        </div>
                        <div style={{ padding: "6px 12px", fontSize: 11, color: T.faint, fontFamily: T.mono, display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>🔒 Session active</div>
                        <button onClick={() => { setShowUserMenu(false); onLogout(); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", padding: "9px 12px", cursor: "pointer", borderRadius: 8, fontSize: 13, color: "#C0392B", fontFamily: T.serif, textAlign: "left" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#FFF2F2"} onMouseLeave={e => e.currentTarget.style.background = "none"}>
                          <span>↩</span> Sign out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Summary strip */}
            <div style={{ marginTop: 20, background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: "16px 20px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                <ProgressRing pct={overallPct} color={T.ink} size={48} />
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: T.ink }}>{overallPct}%</div>
                  <div style={{ fontSize: 11, color: T.muted, fontFamily: T.mono }}>overall progress</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: pendingCount > 0 ? "#FFF8F0" : "#F0FFF4", border: `1px solid ${pendingCount > 0 ? "#FDDCB5" : "#B7EAC8"}`, borderRadius: 10, padding: "8px 14px" }}>
                <span style={{ fontSize: 16 }}>{pendingCount > 0 ? "⏳" : "✅"}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{pendingCount} pending</div>
                  <div style={{ fontSize: 10, color: T.muted, fontFamily: T.mono }}>actions today</div>
                </div>
              </div>
              {/* Sentiment this week */}
              {goals.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: thisWeekDone ? "#F0FFF4" : "#FAFAFA", border: `1px solid ${thisWeekDone ? "#B7EAC8" : T.border}`, borderRadius: 10, padding: "8px 14px", cursor: "pointer" }}
                  onClick={() => setView("reflect")}>
                  <span style={{ fontSize: 16 }}>{thisWeekDone ? "😊" : "💭"}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{thisWeekDone ? "Week logged" : "Check in"}</div>
                    <div style={{ fontSize: 10, color: T.muted, fontFamily: T.mono }}>weekly feel</div>
                  </div>
                </div>
              )}
              {CATEGORIES.map(c => {
                const gs = goals.filter(g => g.category === c.id); if (!gs.length) return null;
                const avg = Math.round(gs.reduce((s, g) => s + Math.min(100, (g.progress/g.target)*100), 0) / gs.length);
                return (
                  <div key={c.id} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: c.color }}>{avg}%</div>
                    <div style={{ fontSize: 10, color: "#bbb", fontFamily: T.mono, textTransform: "uppercase" }}>{c.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Tabs ── */}
          <div style={{ display: "flex", marginBottom: 22, background: "#EBEBEB", borderRadius: 12, padding: 3, width: "fit-content" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setView(t.id)} style={{ background: view === t.id ? "#fff" : "transparent", color: view === t.id ? T.ink : T.muted, border: "none", borderRadius: 10, padding: "7px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: view === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s", whiteSpace: "nowrap" }}>{t.label}</button>
            ))}
          </div>

          {/* ── Views ── */}
          {view === "today" && <TodayPanel actions={actions} goals={goals} onToggleAction={toggleAction} />}

          {view === "reflect" && (
            <ReflectPanel goals={goals} sentiments={sentiments || {}} onSaveSentiment={saveSentiment} />
          )}

          {view === "goals" && (
            <>
              <div style={{ display: "flex", gap: 7, marginBottom: 20, flexWrap: "wrap" }}>
                {[{ id: "all", label: "All" }, ...CATEGORIES].map(c => (
                  <button key={c.id} onClick={() => setFilter(c.id)} style={{ background: filter === c.id ? T.ink : T.card, color: filter === c.id ? "#fff" : "#888", border: `1px solid ${filter === c.id ? T.ink : "#DCDCDC"}`, borderRadius: 99, padding: "5px 15px", cursor: "pointer", fontSize: 12, fontFamily: T.mono, fontWeight: 500, transition: "all 0.15s" }}>{c.label}</button>
                ))}
              </div>
              {displayed.length === 0
                ? <div style={{ textAlign: "center", padding: "60px 20px", color: "#bbb", fontSize: 15 }}>No goals yet — add one to get started!</div>
                : <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {displayed.map(g => (
                      <GoalCard key={g.id} goal={g} actions={actions} sentiments={sentiments || {}}
                        onUpdateGoal={updateGoal} onDeleteGoal={deleteGoal}
                        onAddAction={addAction} onToggleAction={toggleAction} onDeleteAction={deleteAction} />
                    ))}
                  </div>
              }
            </>
          )}

          <div style={{ marginTop: 44, textAlign: "center", fontSize: 11, color: T.faint, fontFamily: T.mono }}>
            click progress numbers to update · check actions to build streaks · reflect weekly
          </div>
        </div>
      </div>
      {showAdd && <AddGoalModal onAdd={addGoal} onClose={() => setShowAdd(false)} />}
    </>
  );
}
