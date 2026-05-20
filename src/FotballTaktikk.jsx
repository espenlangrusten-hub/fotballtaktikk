import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Lock, User, Plus, Trash2, ChevronLeft, Users, Shield, Target,
  Save, Move, ArrowRight, X, LogOut, Edit3, Check, Settings,
  Trophy, ClipboardList, Activity, Eye, EyeOff, ShieldCheck,
  UserCog, KeyRound, AlertCircle
} from "lucide-react";
import { supabase } from './supabase';

/* ============================================================
   FOTBALL.TAKTIKK — v2
   - Admin-side med bruker/lag/spillerstyring
   - Rollebasert tilgang (admin / lagleder med les eller skriv)
   - Taktikkbrett vises umiddelbart
============================================================ */

// ---------- FONTS & STYLES ----------
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Manrope:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
    .font-display { font-family: 'Oswald', sans-serif; letter-spacing: 0.02em; }
    .font-body { font-family: 'Manrope', sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    body { font-family: 'Manrope', sans-serif; background: #020617; }
    .pitch-grad {
      background:
        repeating-linear-gradient(180deg,
          rgba(0,0,0,0.08) 0% 9%,
          transparent 9% 18%
        ),
        linear-gradient(180deg, #3a9e48 0%, #2e8a3c 50%, #3a9e48 100%);
    }
    .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
    .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(132, 204, 22, 0.3); border-radius: 3px; }
    .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
    .no-select { user-select: none; -webkit-user-select: none; touch-action: none; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .anim-in { animation: fadeIn 0.35s ease-out both; }
    @keyframes pulseDot { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .pulse-dot { animation: pulseDot 1.8s ease-in-out infinite; }
  `}</style>
);

// ---------- CONSTANTS ----------
const POSITIONS = [
  { code: "K",  label: "Keeper",            color: "#facc15", group: "K" },
  { code: "CB", label: "Midtstopper",       color: "#60a5fa", group: "DEF" },
  { code: "LB", label: "Venstreback",       color: "#60a5fa", group: "DEF" },
  { code: "RB", label: "Høyreback",         color: "#60a5fa", group: "DEF" },
  { code: "DM", label: "Defensiv midt",     color: "#a78bfa", group: "MID" },
  { code: "CM", label: "Sentral midt",      color: "#a78bfa", group: "MID" },
  { code: "AM", label: "Offensiv midt",     color: "#a78bfa", group: "MID" },
  { code: "LM", label: "Venstre midt",      color: "#a78bfa", group: "MID" },
  { code: "RM", label: "Høyre midt",        color: "#a78bfa", group: "MID" },
  { code: "LW", label: "Venstre ving",      color: "#f97316", group: "ATT" },
  { code: "RW", label: "Høyre ving",        color: "#f97316", group: "ATT" },
  { code: "ST", label: "Spiss",             color: "#ef4444", group: "ATT" },
];
const POSITION_BY_CODE = Object.fromEntries(POSITIONS.map(p => [p.code, p]));

const FORMATIONS = {
  "4-4-2": [
    { role: "K",  x: 50, y: 92 },
    { role: "LB", x: 15, y: 72 }, { role: "CB", x: 37, y: 76 },
    { role: "CB", x: 63, y: 76 }, { role: "RB", x: 85, y: 72 },
    { role: "LM", x: 15, y: 48 }, { role: "CM", x: 37, y: 48 },
    { role: "CM", x: 63, y: 48 }, { role: "RM", x: 85, y: 48 },
    { role: "ST", x: 37, y: 22 }, { role: "ST", x: 63, y: 22 },
  ],
  "4-3-3": [
    { role: "K",  x: 50, y: 92 },
    { role: "LB", x: 15, y: 72 }, { role: "CB", x: 37, y: 76 },
    { role: "CB", x: 63, y: 76 }, { role: "RB", x: 85, y: 72 },
    { role: "CM", x: 30, y: 52 }, { role: "CM", x: 50, y: 52 }, { role: "CM", x: 70, y: 52 },
    { role: "LW", x: 17, y: 25 }, { role: "ST", x: 50, y: 20 }, { role: "RW", x: 83, y: 25 },
  ],
  "4-2-3-1": [
    { role: "K",  x: 50, y: 92 },
    { role: "LB", x: 15, y: 72 }, { role: "CB", x: 37, y: 76 },
    { role: "CB", x: 63, y: 76 }, { role: "RB", x: 85, y: 72 },
    { role: "DM", x: 37, y: 60 }, { role: "DM", x: 63, y: 60 },
    { role: "AM", x: 22, y: 38 }, { role: "AM", x: 50, y: 38 }, { role: "AM", x: 78, y: 38 },
    { role: "ST", x: 50, y: 18 },
  ],
  "3-5-2": [
    { role: "K",  x: 50, y: 92 },
    { role: "CB", x: 27, y: 76 }, { role: "CB", x: 50, y: 78 }, { role: "CB", x: 73, y: 76 },
    { role: "LM", x: 10, y: 55 }, { role: "CM", x: 33, y: 52 },
    { role: "CM", x: 50, y: 50 }, { role: "CM", x: 67, y: 52 }, { role: "RM", x: 90, y: 55 },
    { role: "ST", x: 37, y: 22 }, { role: "ST", x: 63, y: 22 },
  ],
  "5-3-2": [
    { role: "K",  x: 50, y: 92 },
    { role: "LB", x: 10, y: 70 }, { role: "CB", x: 30, y: 76 },
    { role: "CB", x: 50, y: 78 }, { role: "CB", x: 70, y: 76 }, { role: "RB", x: 90, y: 70 },
    { role: "CM", x: 30, y: 50 }, { role: "CM", x: 50, y: 50 }, { role: "CM", x: 70, y: 50 },
    { role: "ST", x: 37, y: 22 }, { role: "ST", x: 63, y: 22 },
  ],
  "4-5-1": [
    { role: "K",  x: 50, y: 92 },
    { role: "LB", x: 15, y: 72 }, { role: "CB", x: 37, y: 76 },
    { role: "CB", x: 63, y: 76 }, { role: "RB", x: 85, y: 72 },
    { role: "LM", x: 12, y: 45 }, { role: "CM", x: 33, y: 50 },
    { role: "CM", x: 50, y: 50 }, { role: "CM", x: 67, y: 50 }, { role: "RM", x: 88, y: 45 },
    { role: "ST", x: 50, y: 22 },
  ],
  "3-4-3": [
    { role: "K",  x: 50, y: 92 },
    { role: "CB", x: 27, y: 76 }, { role: "CB", x: 50, y: 78 }, { role: "CB", x: 73, y: 76 },
    { role: "LM", x: 15, y: 52 }, { role: "CM", x: 37, y: 54 },
    { role: "CM", x: 63, y: 54 }, { role: "RM", x: 85, y: 52 },
    { role: "LW", x: 20, y: 22 }, { role: "ST", x: 50, y: 18 }, { role: "RW", x: 80, y: 22 },
  ],
  "4-1-4-1": [
    { role: "K",  x: 50, y: 92 },
    { role: "LB", x: 15, y: 72 }, { role: "CB", x: 37, y: 76 },
    { role: "CB", x: 63, y: 76 }, { role: "RB", x: 85, y: 72 },
    { role: "DM", x: 50, y: 60 },
    { role: "LM", x: 15, y: 42 }, { role: "CM", x: 37, y: 44 },
    { role: "CM", x: 63, y: 44 }, { role: "RM", x: 85, y: 42 },
    { role: "ST", x: 50, y: 20 },
  ],
};

const uid = () => Math.random().toString(36).slice(2, 10);
const roleGroup = (code) => POSITION_BY_CODE[code]?.group || "ATT";

// ---------- STORAGE ----------
const storage = {
  async get(key) {
    try {
      const { data, error } = await supabase
        .from('app_data')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      if (data) return data.value;
    } catch {}
    // fallback: localStorage
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  async set(key, value) {
    try {
      const { error } = await supabase
        .from('app_data')
        .upsert({ key, value });
      if (error) throw error;
    } catch {}
    // mirror to localStorage as offline cache
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};

const DB_KEY = "fotball_app_v2";
const defaultDB = () => ({
  users: [{
    id: uid(),
    username: "admin",
    password: "admin",
    role: "admin",      // "admin" | "lagleder"
    teamAccess: [],     // for lagledere: [{ teamId, permission: "read" | "write" }]
  }],
  club: { name: "Min Klubb" },
  teams: [],
});

// ---------- PERMISSIONS ----------
const isAdmin = (u) => u?.role === "admin";
const canRead = (u, teamId) => {
  if (!u) return false;
  if (isAdmin(u)) return true;
  return u.teamAccess?.some(a => a.teamId === teamId);
};
const canWrite = (u, teamId) => {
  if (!u) return false;
  if (isAdmin(u)) return true;
  return u.teamAccess?.some(a => a.teamId === teamId && a.permission === "write");
};
const visibleTeams = (u, teams) => {
  if (!u) return [];
  if (isAdmin(u)) return teams;
  return teams.filter(t => canRead(u, t.id));
};

// ---------- SHARED UI ----------
function Field({ icon, label, children }) {
  return (
    <div>
      {label && <label className="text-xs font-semibold text-slate-400 tracking-wider mb-1.5 block">{label.toUpperCase()}</label>}
      <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 focus-within:border-lime-400/50 transition-colors">
        {icon && <span className="text-slate-500">{icon}</span>}
        {children}
      </div>
    </div>
  );
}

function Modal({ title, onClose, children, size = "md" }) {
  const sizeCls = size === "lg" ? "max-w-2xl" : size === "xl" ? "max-w-4xl" : "max-w-lg";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm anim-in" onClick={onClose}>
      <div className={`bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full ${sizeCls} max-h-[90vh] flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="font-display text-xl text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider bg-lime-400/15 text-lime-400 border border-lime-400/30">
        <ShieldCheck className="w-3 h-3" /> ADMIN
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider bg-slate-700/30 text-slate-300 border border-slate-700">
      LAGLEDER
    </span>
  );
}

function PermBadge({ permission }) {
  const map = {
    write: { label: "SKRIVE", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    read:  { label: "LESE",   cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  };
  const m = map[permission] || map.read;
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider border ${m.cls}`}>
      {m.label}
    </span>
  );
}

function ReadOnlyBanner() {
  return (
    <div className="bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm rounded-xl px-4 py-2.5 flex items-center gap-2 mb-4">
      <Eye className="w-4 h-4 flex-shrink-0" />
      <span>Du har <strong>lese-tilgang</strong> til dette laget. Redigering er deaktivert.</span>
    </div>
  );
}

// ---------- AUTH ----------
function AuthScreen({ onLogin, db }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");

  const submit = () => {
    setErr("");
    if (!u.trim() || !p.trim()) return setErr("Fyll inn brukernavn og passord");
    const found = db.users.find(x => x.username === u.trim() && x.password === p);
    if (!found) return setErr("Feil brukernavn eller passord");
    onLogin(found.id);
  };

  return (
    <div className="min-h-screen w-full pitch-grad relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/75 to-slate-950/95" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-lime-400 via-emerald-400 to-lime-400" />

      <div className="relative w-full max-w-md anim-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-lime-400 mb-4 shadow-2xl shadow-lime-400/30">
            <Trophy className="w-8 h-8 text-slate-950" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-5xl text-white tracking-wide">
            FOTBALL<span className="text-lime-400">.</span>TAKTIKK
          </h1>
          <p className="text-slate-400 text-sm mt-2 tracking-wide">
            PROFESJONELL KLUBBSTYRING FOR LAGLEDERE
          </p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="space-y-4">
            <Field icon={<User className="w-4 h-4" />} label="Brukernavn">
              <input value={u} onChange={e => setU(e.target.value)}
                className="bg-transparent w-full outline-none text-white placeholder:text-slate-600"
                placeholder="lagleder" autoComplete="username" />
            </Field>
            <Field icon={<Lock className="w-4 h-4" />} label="Passord">
              <input type={showPass ? "text" : "password"} value={p} onChange={e => setP(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
                className="bg-transparent w-full outline-none text-white placeholder:text-slate-600"
                placeholder="••••••••" autoComplete="current-password" />
              <button onClick={() => setShowPass(s => !s)} className="text-slate-500 hover:text-lime-400">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </Field>

            {err && (
              <div className="text-red-400 text-sm bg-red-950/40 border border-red-900/60 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {err}
              </div>
            )}

            <button onClick={submit}
              className="w-full py-3.5 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold rounded-xl shadow-lg shadow-lime-400/20 active:scale-[0.98]">
              LOGG INN
            </button>

            <p className="text-xs text-slate-500 text-center pt-2">
              Demo-admin: <span className="font-mono text-lime-400/80">admin / admin</span>
            </p>
            <p className="text-xs text-slate-600 text-center">
              Brukerkontoer opprettes og administreres av admin.
            </p>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6 tracking-wider">v2.0 · DATA LAGRES LOKALT</p>
      </div>
    </div>
  );
}

// ---------- HEADER ----------
function Header({ user, club, onLogout, breadcrumbs, onBack, onAdmin, currentView }) {
  return (
    <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 flex-shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-9 h-9 rounded-xl bg-lime-400 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-slate-950" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="font-display text-lg text-white leading-none truncate">
              {club?.name || "FOTBALL.TAKTIKK"}
            </div>
            {breadcrumbs && <div className="text-xs text-slate-500 mt-0.5 truncate">{breadcrumbs}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin(user) && (
            <button onClick={onAdmin}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider flex items-center gap-2 transition-all ${
                currentView === "admin"
                  ? "bg-lime-400 text-slate-950"
                  : "bg-slate-900 border border-slate-800 hover:border-lime-400/50 text-lime-400"
              }`}>
              <ShieldCheck className="w-4 h-4" /> ADMIN
            </button>
          )}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <div className="w-2 h-2 rounded-full bg-lime-400 pulse-dot" />
            <span className="text-xs text-slate-300 font-medium">{user.username}</span>
            <RoleBadge role={user.role} />
          </div>
          <button onClick={onLogout} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400" title="Logg ut">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

// ---------- CLUB VIEW ----------
function ClubView({ user, db, setDB, onOpenTeam }) {
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear() - 13);
  const [variant, setVariant] = useState("1");

  const teams = visibleTeams(user, db.teams);
  const isAdminUser = isAdmin(user);

  const createTeam = async () => {
    if (!name.trim()) return;
    const team = {
      id: uid(), name: name.trim(), ageYear: year, variant, format: "11v11",
      players: [], tactics: [], createdAt: Date.now(),
    };
    const next = { ...db, teams: [...db.teams, team] };
    setDB(next); await storage.set(DB_KEY, next);
    setShowNew(false); setName(""); setVariant("1");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-xs font-semibold text-lime-400 tracking-widest mb-2">KLUBBSIDE</div>
          <h1 className="font-display text-4xl sm:text-5xl text-white">LAG OVERSIKT</h1>
          <p className="text-slate-400 mt-2">
            {isAdminUser ? "Administrer alle 11-er lag i klubben" : `${teams.length} lag du har tilgang til`}
          </p>
        </div>
        {isAdminUser && (
          <button onClick={() => setShowNew(true)}
            className="px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-semibold text-sm flex items-center gap-2 shadow-lg shadow-lime-400/20">
            <Plus className="w-4 h-4" /> Nytt lag
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
        <StatCard label="Lag" value={teams.length} icon={<Shield className="w-4 h-4" />} />
        <StatCard label="Spillere" value={teams.reduce((s, t) => s + t.players.length, 0)} icon={<Users className="w-4 h-4" />} />
        <StatCard label="Taktikker" value={teams.reduce((s, t) => s + (t.tactics?.length || 0), 0)} icon={<ClipboardList className="w-4 h-4" />} />
      </div>

      {teams.length === 0 ? (
        <div className="border-2 border-dashed border-slate-800 rounded-2xl p-16 text-center">
          <Shield className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="font-display text-2xl text-slate-300 mb-2">
            {isAdminUser ? "INGEN LAG ENNÅ" : "INGEN TILGANG TIL LAG"}
          </h3>
          <p className="text-slate-500 text-sm mb-6">
            {isAdminUser ? "Opprett ditt første 11-er lag" : "Ta kontakt med admin for tilgang"}
          </p>
          {isAdminUser && (
            <button onClick={() => setShowNew(true)}
              className="px-5 py-2.5 rounded-xl bg-lime-400 text-slate-950 font-semibold text-sm inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Opprett lag
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <TeamCard key={team.id} team={team} user={user} onClick={() => onOpenTeam(team.id)} />
          ))}
        </div>
      )}

      {showNew && (
        <Modal title="Opprett nytt lag" onClose={() => setShowNew(false)}>
          <div className="space-y-4">
            <Field icon={<Shield className="w-4 h-4" />} label="Lagnavn">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="f.eks. Monolitten G14"
                className="bg-transparent w-full outline-none text-white placeholder:text-slate-600" autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field icon={<Activity className="w-4 h-4" />} label="Årskull">
                <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value) || year)}
                  className="bg-transparent w-full outline-none text-white" />
              </Field>
              <Field icon={<Target className="w-4 h-4" />} label="Variant">
                <input value={variant} onChange={e => setVariant(e.target.value)} placeholder="1, 2, A, B..."
                  className="bg-transparent w-full outline-none text-white placeholder:text-slate-600" />
              </Field>
            </div>
            <div className="text-xs text-slate-500 bg-slate-950/50 border border-slate-800 rounded-lg p-3">
              Format: <span className="text-lime-400 font-semibold">11-er fotball</span>
            </div>
            <button onClick={createTeam} className="w-full py-3 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold rounded-xl">
              Opprett lag
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold tracking-wider mb-2">
        {icon} {label.toUpperCase()}
      </div>
      <div className="font-display text-3xl sm:text-4xl text-white">{value}</div>
    </div>
  );
}

function TeamCard({ team, user, onClick }) {
  const write = canWrite(user, team.id);
  return (
    <button onClick={onClick}
      className="group text-left bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-lime-400/40 rounded-2xl p-5 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-lime-400/20 to-emerald-500/20 border border-lime-400/30 flex items-center justify-center">
          <Shield className="w-6 h-6 text-lime-400" />
        </div>
        <div className="flex items-center gap-1.5">
          <PermBadge permission={write ? "write" : "read"} />
        </div>
      </div>
      <h3 className="font-display text-xl text-white group-hover:text-lime-400 transition-colors">
        {team.name}{team.variant ? ` ${team.variant}` : ""}
      </h3>
      <div className="text-xs text-slate-500 mt-1">Årskull {team.ageYear} · {team.format}</div>
      <div className="flex gap-4 mt-4 pt-4 border-t border-slate-800">
        <div>
          <div className="text-xs text-slate-500">Spillere</div>
          <div className="font-display text-lg text-white">{team.players.length}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Taktikker</div>
          <div className="font-display text-lg text-white">{team.tactics?.length || 0}</div>
        </div>
      </div>
    </button>
  );
}

// ---------- TEAM VIEW ----------
function TeamView({ team, user, db, setDB, onOpenTactics }) {
  const [showAdd, setShowAdd] = useState(false);
  const write = canWrite(user, team.id);

  const update = async (mut) => {
    const next = { ...db, teams: db.teams.map(t => t.id === team.id ? mut(t) : t) };
    setDB(next); await storage.set(DB_KEY, next);
  };
  const removePlayer = async (pid) => {
    if (!write) return;
    if (!confirm("Fjerne spilleren?")) return;
    await update(t => ({ ...t, players: t.players.filter(p => p.id !== pid) }));
  };
  const addPlayer = async (player) => {
    await update(t => ({ ...t, players: [...t.players, { ...player, id: uid() }] }));
    setShowAdd(false);
  };
  const editPlayer = async (pid, patch) => {
    await update(t => ({ ...t, players: t.players.map(p => p.id === pid ? { ...p, ...patch } : p) }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {!write && <ReadOnlyBanner />}
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-xs font-semibold text-lime-400 tracking-widest mb-2">LAG · {team.format}</div>
          <h1 className="font-display text-4xl sm:text-5xl text-white">
            {team.name}{team.variant ? ` ${team.variant}` : ""}
          </h1>
          <p className="text-slate-400 mt-2">Årskull {team.ageYear} · {team.players.length} spillere</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={onOpenTactics}
            className="px-4 py-2.5 rounded-xl border border-slate-700 hover:border-lime-400 text-white text-sm flex items-center gap-2 bg-slate-900">
            <Target className="w-4 h-4" /> Taktikkbrett
          </button>
          {write && (
            <button onClick={() => setShowAdd(true)}
              className="px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-semibold text-sm flex items-center gap-2 shadow-lg shadow-lime-400/20">
              <Plus className="w-4 h-4" /> Ny spiller
            </button>
          )}
        </div>
      </div>

      {team.players.length === 0 ? (
        <div className="border-2 border-dashed border-slate-800 rounded-2xl p-16 text-center">
          <Users className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="font-display text-2xl text-slate-300 mb-2">INGEN SPILLERE</h3>
          {write && (
            <>
              <p className="text-slate-500 text-sm mb-6">Legg til spillere for å bygge laget</p>
              <button onClick={() => setShowAdd(true)} className="px-5 py-2.5 rounded-xl bg-lime-400 text-slate-950 font-semibold text-sm inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Legg til spiller
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 tracking-wider">
            <div className="col-span-1">NR</div>
            <div className="col-span-4">NAVN</div>
            <div className="col-span-6">POSISJONER</div>
            <div className="col-span-1 text-right"></div>
          </div>
          {team.players
            .slice()
            .sort((a,b) => (a.number||999) - (b.number||999))
            .map(p => (
              <PlayerRow key={p.id} player={p} writable={write}
                onRemove={() => removePlayer(p.id)}
                onEdit={(patch) => editPlayer(p.id, patch)} />
          ))}
        </div>
      )}

      {showAdd && (
        <PlayerEditor onSave={addPlayer} onClose={() => setShowAdd(false)} title="Ny spiller" />
      )}
    </div>
  );
}

function PlayerRow({ player, writable, onRemove, onEdit }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <PlayerEditor player={player} title="Rediger spiller"
        onSave={(patch) => { onEdit(patch); setEditing(false); }}
        onClose={() => setEditing(false)} />
    );
  }
  return (
    <div className="grid grid-cols-12 gap-3 px-5 py-3.5 border-b border-slate-800/50 last:border-0 hover:bg-slate-900/60 items-center">
      <div className="col-span-1">
        <span className="font-mono font-bold text-lime-400">{player.number || "—"}</span>
      </div>
      <div className="col-span-4">
        <div className="text-white font-medium">{player.name}</div>
      </div>
      <div className="col-span-6 flex flex-wrap gap-1.5">
        {player.positions.map(code => {
          const pos = POSITION_BY_CODE[code];
          if (!pos) return null;
          return (
            <span key={code} className="text-xs font-semibold px-2 py-0.5 rounded-md border"
              style={{ color: pos.color, borderColor: pos.color + "50", backgroundColor: pos.color + "15" }}>
              {pos.code}
            </span>
          );
        })}
      </div>
      <div className="col-span-1 flex justify-end gap-1">
        {writable && (
          <>
            <button onClick={() => setEditing(true)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
              <Edit3 className="w-4 h-4" />
            </button>
            <button onClick={onRemove} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400">
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PlayerEditor({ player, onSave, onClose, title }) {
  const [name, setName] = useState(player?.name || "");
  const [number, setNumber] = useState(player?.number || "");
  const [positions, setPositions] = useState(player?.positions || []);
  const toggle = (code) => setPositions(p => p.includes(code) ? p.filter(c => c !== code) : [...p, code]);
  const save = () => {
    if (!name.trim()) return alert("Skriv inn navn");
    if (positions.length === 0) return alert("Velg minst én posisjon");
    onSave({ name: name.trim(), number: number ? parseInt(number) : null, positions });
  };
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field icon={<User className="w-4 h-4" />} label="Navn">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ola Nordmann"
                className="bg-transparent w-full outline-none text-white placeholder:text-slate-600" autoFocus />
            </Field>
          </div>
          <Field icon={<span className="text-xs font-mono text-slate-500">#</span>} label="Draktnr">
            <input value={number} onChange={e => setNumber(e.target.value.replace(/\D/g, ""))} placeholder="10"
              className="bg-transparent w-full outline-none text-white placeholder:text-slate-600" />
          </Field>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-400 tracking-wider mb-2 block">POSISJONER (velg en eller flere)</label>
          <div className="flex flex-wrap gap-2">
            {POSITIONS.map(pos => {
              const active = positions.includes(pos.code);
              return (
                <button key={pos.code} onClick={() => toggle(pos.code)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                  style={{
                    color: active ? pos.color : "#94a3b8",
                    borderColor: active ? pos.color : "#334155",
                    backgroundColor: active ? pos.color + "20" : "transparent",
                  }}>
                  <span className="font-mono mr-1">{pos.code}</span>
                  <span className="opacity-80">{pos.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <button onClick={save} className="w-full py-3 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold rounded-xl">
          Lagre spiller
        </button>
      </div>
    </Modal>
  );
}

// ==================================================================
// =============== TACTICS BOARD (always visible) ===================
// ==================================================================
function TacticsView({ team, user, db, setDB }) {
  const write = canWrite(user, team.id);

  const makeFresh = (formationKey = "4-4-2") => ({
    id: uid(), name: "Ny taktikk", formation: formationKey,
    slots: FORMATIONS[formationKey].map(s => ({ id: uid(), x: s.x, y: s.y, role: s.role, playerId: null })),
    arrows: [], isNew: true,
  });

  const initial = useMemo(() => {
    const list = team.tactics || [];
    if (list.length) return { ...list[list.length - 1], isNew: false };
    return makeFresh("4-4-2");
  }, [team.id]);

  const [tactic, setTactic] = useState(initial);
  const [mode, setMode] = useState("move");
  const [draggingSlot, setDraggingSlot] = useState(null);   // slot id being dragged on pitch
  const [drawingArrow, setDrawingArrow] = useState(null);
  const [showAssign, setShowAssign] = useState(null);
  const [showFormations, setShowFormations] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // ---- sidebar drag state ----
  // sidebarDrag: { playerId, ghostX, ghostY } | null
  const [sidebarDrag, setSidebarDrag] = useState(null);
  // slot id highlighted as drop target
  const [dropTarget, setDropTarget] = useState(null);

  const pitchRef = useRef(null);

  const pitchCoords = useCallback((clientX, clientY) => {
    const r = pitchRef.current.getBoundingClientRect();
    return {
      x: Math.max(3, Math.min(97, ((clientX - r.left) / r.width) * 100)),
      y: Math.max(3, Math.min(97, ((clientY - r.top) / r.height) * 100)),
    };
  }, []);

  // Find nearest slot within `threshold` pitch-% units of a client position
  const nearestSlot = useCallback((clientX, clientY, threshold = 12) => {
    if (!pitchRef.current) return null;
    const r = pitchRef.current.getBoundingClientRect();
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return null;
    const px = ((clientX - r.left) / r.width) * 100;
    const py = ((clientY - r.top) / r.height) * 100;
    let best = null, bestDist = Infinity;
    tactic.slots.forEach(s => {
      const d = Math.hypot(s.x - px, s.y - py);
      if (d < bestDist) { best = s; bestDist = d; }
    });
    return bestDist < threshold ? best : null;
  }, [tactic.slots]);

  // ---- assign helper (used by both sidebar drop and click-modal) ----
  const assignPlayer = useCallback((slotId, playerId) => {
    setTactic(t => ({
      ...t,
      slots: t.slots.map(s => {
        if (s.id === slotId) return { ...s, playerId };
        if (s.playerId === playerId && playerId) return { ...s, playerId: null };
        return s;
      }),
    }));
    setShowAssign(null);
  }, []);

  // ---- document-level listeners for sidebar drag ----
  useEffect(() => {
    if (!sidebarDrag) return;
    const onMove = (e) => {
      e.preventDefault(); // prevent page scroll while dragging from sidebar
      const cx = e.clientX ?? e.touches?.[0]?.clientX;
      const cy = e.clientY ?? e.touches?.[0]?.clientY;
      setSidebarDrag(d => d ? { ...d, ghostX: cx, ghostY: cy } : null);
      const slot = nearestSlot(cx, cy);
      setDropTarget(slot?.id ?? null);
    };
    const onUp = (e) => {
      const cx = e.clientX ?? e.changedTouches?.[0]?.clientX;
      const cy = e.clientY ?? e.changedTouches?.[0]?.clientY;
      const slot = nearestSlot(cx, cy);
      if (slot) assignPlayer(slot.id, sidebarDrag.playerId);
      setSidebarDrag(null);
      setDropTarget(null);
    };
    // passive: false lets us call preventDefault() to block scroll during drag
    document.addEventListener("pointermove", onMove, { passive: false });
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, [sidebarDrag, nearestSlot, assignPlayer]);

  // ---- sidebar drag start ----
  const startSidebarDrag = (e, player) => {
    if (!write) return;
    e.preventDefault();
    setSidebarDrag({ playerId: player.id, ghostX: e.clientX, ghostY: e.clientY });
  };

  // ---- pitch slot drag (capture pointer on PITCH to prevent scroll) ----
  const onSlotPointerDown = (e, slot) => {
    if (!write) return;
    e.stopPropagation();
    e.preventDefault(); // <-- prevents page scroll on touch
    if (mode === "move") {
      setDraggingSlot(slot.id);
      // Capture on the PITCH element so onPointerMove fires there, not on the slot
      try { pitchRef.current.setPointerCapture(e.pointerId); } catch {}
    } else if (mode === "arrow") {
      const { x, y } = pitchCoords(e.clientX, e.clientY);
      setDrawingArrow({ slotId: slot.id, fromX: slot.x, fromY: slot.y, toX: x, toY: y });
      try { pitchRef.current.setPointerCapture(e.pointerId); } catch {}
    }
  };

  const onPitchPointerMove = (e) => {
    if (draggingSlot) {
      const { x, y } = pitchCoords(e.clientX, e.clientY);
      setTactic(t => ({ ...t, slots: t.slots.map(s => s.id === draggingSlot ? { ...s, x, y } : s) }));
    } else if (drawingArrow) {
      const { x, y } = pitchCoords(e.clientX, e.clientY);
      setDrawingArrow(a => ({ ...a, toX: x, toY: y }));
    }
  };

  const onPitchPointerUp = () => {
    if (draggingSlot) setDraggingSlot(null);
    if (drawingArrow) {
      const dist = Math.hypot(drawingArrow.toX - drawingArrow.fromX, drawingArrow.toY - drawingArrow.fromY);
      if (dist > 3) {
        setTactic(t => ({
          ...t,
          arrows: [...t.arrows, {
            id: uid(), slotId: drawingArrow.slotId,
            fromX: drawingArrow.fromX, fromY: drawingArrow.fromY,
            toX: drawingArrow.toX, toY: drawingArrow.toY,
          }],
        }));
      }
      setDrawingArrow(null);
    }
  };

  // Short tap on slot → open assign modal (only if not mid-drag)
  const onSlotClick = (e, slot) => {
    e.stopPropagation();
    if (!write || draggingSlot || drawingArrow) return;
    if (mode === "move") setShowAssign(slot.id);
  };

  const autoAssign = () => {
    if (!write) return;
    const players = [...team.players];
    const used = new Set();
    setTactic(t => ({
      ...t,
      slots: t.slots.map(slot => {
        const g = roleGroup(slot.role);
        const cand = players.find(p =>
          !used.has(p.id) && (p.positions.includes(slot.role) || p.positions.some(c => roleGroup(c) === g))
        );
        if (cand) { used.add(cand.id); return { ...slot, playerId: cand.id }; }
        return { ...slot, playerId: null };
      }),
    }));
  };

  const clearArrows = () => {
    if (!write) return;
    if (tactic.arrows.length && confirm("Fjern alle piler?")) setTactic(t => ({ ...t, arrows: [] }));
  };

  const removeArrow = (id) => {
    if (!write) return;
    setTactic(t => ({ ...t, arrows: t.arrows.filter(a => a.id !== id) }));
  };

  const switchFormation = (key) => {
    if (!write) return;
    const newSlots = FORMATIONS[key].map((s, i) => {
      const prev = tactic.slots[i];
      return { id: uid(), x: s.x, y: s.y, role: s.role, playerId: prev?.playerId || null };
    });
    setTactic({ ...tactic, formation: key, slots: newSlots, arrows: [] });
    setShowFormations(false);
  };

  const saveTactic = async () => {
    if (!write) return;
    const list = team.tactics || [];
    const cleaned = { ...tactic }; delete cleaned.isNew;
    const exists = list.some(t => t.id === tactic.id);
    const newList = exists ? list.map(x => x.id === tactic.id ? cleaned : x) : [...list, cleaned];
    const next = { ...db, teams: db.teams.map(t => t.id === team.id ? { ...t, tactics: newList } : t) };
    setDB(next); await storage.set(DB_KEY, next);
    setTactic(cleaned);
    alert("Taktikk lagret");
  };

  const deleteTactic = async (tid) => {
    if (!write) return;
    if (!confirm("Slette taktikken?")) return;
    const newList = (team.tactics || []).filter(x => x.id !== tid);
    const next = { ...db, teams: db.teams.map(t => t.id === team.id ? { ...t, tactics: newList } : t) };
    setDB(next); await storage.set(DB_KEY, next);
    if (tactic.id === tid) setTactic(makeFresh("4-4-2"));
  };

  const newTactic = () => { if (!write) return; setTactic(makeFresh(tactic.formation || "4-4-2")); setShowSaved(false); };
  const loadTactic = (t) => { setTactic({ ...t, isNew: false }); setShowSaved(false); };
  const playerById = (id) => team.players.find(p => p.id === id);

  // Sorted roster
  const sortedPlayers = useMemo(() =>
    [...team.players].sort((a,b) => (a.number||999) - (b.number||999))
  , [team.players]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
      {!write && <ReadOnlyBanner />}

      {/* ===== TOP BAR ===== */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <input value={tactic.name}
            onChange={e => write && setTactic({ ...tactic, name: e.target.value })}
            disabled={!write}
            className="bg-slate-900/60 border border-slate-800 px-3 py-2 rounded-lg text-white font-display text-lg outline-none focus:border-lime-400/50 w-40 sm:w-56 disabled:opacity-70" />
          <select
            value={tactic.formation}
            onChange={e => write && switchFormation(e.target.value)}
            disabled={!write}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-lime-400 font-display text-base outline-none focus:border-lime-400/50 disabled:opacity-50 cursor-pointer"
          >
            {Object.keys(FORMATIONS).map(key => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
          <button onClick={() => setShowSaved(true)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-sm flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">Lagrede</span>
            <span className="font-mono text-xs text-lime-400">{(team.tactics || []).length}</span>
          </button>
        </div>
        {write && (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={autoAssign}
              className="px-3 py-2 rounded-lg border border-slate-700 hover:border-lime-400/50 text-white text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" /> Auto-tilord
            </button>
            <button onClick={saveTactic}
              className="px-4 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-lime-400/20">
              <Save className="w-4 h-4" /> Lagre
            </button>
          </div>
        )}
      </div>

      {/* ===== PLAYER STRIP (mobile: above pitch; desktop: sidebar) ===== */}

      {/* Mobile horizontal strip */}
      <div className="lg:hidden mb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-xs font-semibold text-slate-400 tracking-wider">STALL</span>
          {write && <span className="text-[10px] text-lime-400">— dra ned på banen</span>}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {sortedPlayers.length === 0 && (
            <div className="text-xs text-slate-500 italic py-2 px-1">Ingen spillere registrert</div>
          )}
          {sortedPlayers.map(p => {
            const onPitch = tactic.slots.some(s => s.playerId === p.id);
            const isDraggingThis = sidebarDrag?.playerId === p.id;
            return (
              <div
                key={p.id}
                onPointerDown={(e) => startSidebarDrag(e, p)}
                className={`flex-shrink-0 flex flex-col items-center gap-1 px-2 py-2 rounded-xl border transition-all no-select ${
                  write ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                } ${onPitch
                  ? "bg-lime-400/10 border-lime-400/40"
                  : "bg-slate-900/80 border-slate-700 hover:border-slate-600"
                } ${isDraggingThis ? "opacity-40 scale-95" : ""}`}
                style={{ minWidth: 56, touchAction: "none" }}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-mono text-sm font-bold border-2 bg-slate-950"
                  style={{ borderColor: onPitch ? "#84cc16" : "#475569", color: onPitch ? "#84cc16" : "#94a3b8" }}>
                  {p.number ?? "?"}
                </div>
                <div className="text-[10px] text-white font-semibold max-w-[52px] truncate text-center leading-tight">
                  {p.name.split(" ")[0]}
                </div>
                {onPitch && <div className="w-1.5 h-1.5 rounded-full bg-lime-400" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_260px] gap-4">
        {/* ===== PITCH ===== */}
        <div>
          {write && (
            <div className="flex items-center gap-2 mb-3 p-1 bg-slate-900/60 border border-slate-800 rounded-xl w-fit">
              <ModeBtn active={mode === "move"} onClick={() => setMode("move")} icon={<Move className="w-4 h-4" />}>Flytt</ModeBtn>
              <ModeBtn active={mode === "arrow"} onClick={() => setMode("arrow")} icon={<ArrowRight className="w-4 h-4" />}>Piler</ModeBtn>
              {tactic.arrows.length > 0 && (
                <button onClick={clearArrows} className="px-3 py-1.5 text-xs text-slate-400 hover:text-red-400">Nullstill</button>
              )}
            </div>
          )}

          <div
            ref={pitchRef}
            onPointerDown={(e) => {
              // In arrow mode, tapping empty pitch area (not a slot) also starts an arrow
              if (!write || mode !== "arrow" || drawingArrow || draggingSlot) return;
              const { x, y } = pitchCoords(e.clientX, e.clientY);
              setDrawingArrow({ slotId: null, fromX: x, fromY: y, toX: x, toY: y });
              try { pitchRef.current.setPointerCapture(e.pointerId); } catch {}
            }}
            onPointerMove={onPitchPointerMove}
            onPointerUp={onPitchPointerUp}
            onPointerLeave={onPitchPointerUp}
            className="relative w-full pitch-grad shadow-2xl no-select border-2 border-white/20 rounded-2xl overflow-hidden"
            style={{ aspectRatio: "68 / 100", touchAction: "none" }}
          >
            <PitchMarkings />

            {/* Arrows SVG */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <marker id="arrowhead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#facc15" />
                </marker>
                <marker id="arrowhead-drawing" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#fde047" />
                </marker>
              </defs>
              {tactic.arrows.map(a => (
                <line key={a.id} x1={a.fromX} y1={a.fromY} x2={a.toX} y2={a.toY}
                  stroke="#facc15" strokeWidth="1.5" strokeDasharray="3 2"
                  markerEnd="url(#arrowhead)" vectorEffect="non-scaling-stroke" />
              ))}
              {drawingArrow && (
                <line x1={drawingArrow.fromX} y1={drawingArrow.fromY} x2={drawingArrow.toX} y2={drawingArrow.toY}
                  stroke="#fde047" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.85"
                  markerEnd="url(#arrowhead-drawing)" vectorEffect="non-scaling-stroke" />
              )}
            </svg>

            {/* Arrow delete buttons */}
            {write && tactic.arrows.map(a => (
              <button key={"del-" + a.id}
                onClick={(e) => { e.stopPropagation(); removeArrow(a.id); }}
                className="absolute w-5 h-5 rounded-full bg-slate-950/90 border border-yellow-400/50 text-yellow-400 flex items-center justify-center hover:bg-red-500 hover:text-white"
                style={{ left: `${a.toX}%`, top: `${a.toY}%`, transform: "translate(-50%,-50%) translate(10px,-10px)" }}>
                <X className="w-3 h-3" />
              </button>
            ))}

            {/* Player slots */}
            {tactic.slots.map(slot => {
              const player = playerById(slot.playerId);
              const posMeta = POSITION_BY_CODE[slot.role];
              const isDragging = draggingSlot === slot.id;
              const isDropTarget = dropTarget === slot.id;
              return (
                <div
                  key={slot.id}
                  onPointerDown={(e) => onSlotPointerDown(e, slot)}
                  onClick={(e) => onSlotClick(e, slot)}
                  className="absolute no-select"
                  style={{
                    left: `${slot.x}%`, top: `${slot.y}%`,
                    transform: "translate(-50%,-50%)",
                    touchAction: "none",
                    cursor: !write ? "default" : mode === "move" ? (isDragging ? "grabbing" : "grab") : "crosshair",
                    zIndex: isDragging ? 50 : 10,
                  }}
                >
                  <div className={`flex flex-col items-center pointer-events-none transition-transform ${isDragging ? "scale-110" : isDropTarget ? "scale-105" : ""}`} style={{ gap: 3 }}>
                    {/* Drop target ring */}
                    {isDropTarget && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full border-2 border-white animate-ping opacity-50" />
                      </div>
                    )}
                    {/* Jersey circle */}
                    <div
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-bold text-white shadow-lg"
                      style={{
                        background: player
                          ? "linear-gradient(160deg, #c0392b 0%, #96281b 100%)"
                          : "rgba(0,0,0,0.35)",
                        border: isDropTarget
                          ? "2.5px solid #fff"
                          : player
                            ? "2.5px solid rgba(255,255,255,0.5)"
                            : `2px dashed ${posMeta?.color || "#fff"}80`,
                        boxShadow: "0 3px 10px rgba(0,0,0,0.45)",
                        color: player ? "#fff" : (posMeta?.color || "#fff"),
                      }}
                    >
                      <span className="font-mono text-sm leading-none">
                        {player ? (player.number ?? "?") : slot.role}
                      </span>
                    </div>
                    {/* FM-style info card */}
                    <div
                      className="rounded px-1.5 py-0.5 text-center shadow-md"
                      style={{
                        background: "rgba(10,14,20,0.88)",
                        border: `1px solid ${posMeta?.color || "#84cc16"}55`,
                        minWidth: 58,
                        maxWidth: 80,
                      }}
                    >
                      <div className="text-[9px] font-bold tracking-wider leading-tight" style={{ color: posMeta?.color || "#84cc16" }}>
                        {slot.role}
                      </div>
                      <div className="text-[10px] text-white font-semibold leading-tight truncate">
                        {player
                          ? (player.name.split(" ").slice(-1)[0])
                          : <span className="text-white/30">—</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {write && (
            <div className="text-xs text-slate-500 mt-2 text-center">
              {mode === "move"
                ? "Dra spillerbrikker fritt · Dra fra stallen ned på banen · Trykk for tilordne"
                : "Dra fra en spiller for å tegne et løp"}
            </div>
          )}
        </div>

        {/* ===== DESKTOP SIDEBAR ===== */}
        <div className="hidden lg:flex flex-col gap-3">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
            <div className="text-xs font-semibold text-slate-400 tracking-wider mb-2 flex items-center justify-between">
              <span>SPILLERSTALL ({team.players.length})</span>
              {write && <span className="text-lime-400 font-normal">dra inn på banen</span>}
            </div>
            <div className="overflow-y-auto scrollbar-thin space-y-1 pr-1" style={{ maxHeight: "calc(100vh - 260px)" }}>
              {sortedPlayers.length === 0 && (
                <div className="text-xs text-slate-500 italic py-2">Ingen spillere</div>
              )}
              {sortedPlayers.map(p => {
                const onPitch = tactic.slots.some(s => s.playerId === p.id);
                const isDraggingThis = sidebarDrag?.playerId === p.id;
                const posMeta = POSITION_BY_CODE[p.positions[0]];
                return (
                  <div
                    key={p.id}
                    onPointerDown={(e) => startSidebarDrag(e, p)}
                    style={{ touchAction: "none" }}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-all no-select ${
                      write ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                    } ${onPitch
                      ? "bg-lime-400/10 border-lime-400/30"
                      : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                    } ${isDraggingThis ? "opacity-40" : ""}`}
                  >
                    {/* Number dot */}
                    <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-mono text-xs font-bold flex-shrink-0"
                      style={{
                        borderColor: onPitch ? "#84cc16" : (posMeta?.color || "#64748b"),
                        color: onPitch ? "#84cc16" : (posMeta?.color || "#94a3b8"),
                        backgroundColor: "#0f172a",
                      }}>
                      {p.number ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm truncate leading-tight">{p.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">{p.positions.join(" · ")}</div>
                    </div>
                    {onPitch
                      ? <Check className="w-3.5 h-3.5 text-lime-400 flex-shrink-0" />
                      : write && <Move className="w-3 h-3 text-slate-600 flex-shrink-0" />
                    }
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 space-y-1.5">
            <div className="font-semibold text-slate-300 tracking-wider mb-1.5">HJELP</div>
            <div>• <span className="text-lime-400">Dra fra stall:</span> Slipp på brikke</div>
            <div>• <span className="text-lime-400">Dra brikke:</span> Flytt fritt på banen</div>
            <div>• <span className="text-lime-400">Trykk brikke:</span> Velg fra liste</div>
            <div>• <span className="text-lime-400">Pil-modus:</span> Tegn løp</div>
          </div>
        </div>
      </div>

      {/* ===== DRAG GHOST (follows cursor) ===== */}
      {sidebarDrag && (() => {
        const p = team.players.find(x => x.id === sidebarDrag.playerId);
        if (!p) return null;
        const posMeta = POSITION_BY_CODE[p.positions[0]];
        return (
          <div className="fixed z-[9999] pointer-events-none"
            style={{ left: sidebarDrag.ghostX, top: sidebarDrag.ghostY, transform: "translate(-50%,-50%)" }}>
            <div className="flex flex-col items-center gap-1 drop-shadow-2xl">
              <div className="w-12 h-12 rounded-full border-[3px] flex items-center justify-center font-mono text-sm font-bold"
                style={{
                  backgroundColor: "#0f172a",
                  borderColor: posMeta?.color || "#84cc16",
                  color: posMeta?.color || "#84cc16",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.7)",
                }}>
                {p.number ?? "?"}
              </div>
              <div className="text-xs font-semibold text-white bg-slate-950/90 px-2 py-0.5 rounded whitespace-nowrap">
                {p.name.split(" ")[0]}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modals */}
      {showFormations && (
        <Modal title="Velg formasjon" onClose={() => setShowFormations(false)} size="lg">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.keys(FORMATIONS).map(key => (
              <button key={key} onClick={() => switchFormation(key)}
                className={`bg-slate-950/50 hover:bg-slate-950 border rounded-xl p-3 transition-all ${
                  tactic.formation === key ? "border-lime-400" : "border-slate-800 hover:border-slate-700"
                }`}>
                <FormationPreview formation={FORMATIONS[key]} />
                <div className="font-display text-lg text-white mt-2">{key}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">Spillertilordninger beholdes der det er mulig. Piler nullstilles.</p>
        </Modal>
      )}

      {showSaved && (
        <Modal title="Lagrede taktikker" onClose={() => setShowSaved(false)}>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-thin">
            {write && (
              <button onClick={newTactic}
                className="w-full flex items-center gap-2 px-3 py-3 rounded-lg bg-lime-400/10 border border-lime-400/30 hover:bg-lime-400/20 text-lime-400 text-sm font-semibold">
                <Plus className="w-4 h-4" /> Ny taktikk (4-4-2)
              </button>
            )}
            {(team.tactics || []).length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-6">Ingen lagrede taktikker</div>
            ) : team.tactics.map(t => (
              <div key={t.id} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border ${
                t.id === tactic.id ? "bg-lime-400/10 border-lime-400/40" : "bg-slate-950/50 border-slate-800"
              }`}>
                <button onClick={() => loadTactic(t)} className="flex-1 text-left min-w-0">
                  <div className="text-white text-sm font-medium truncate">{t.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{t.formation} · {t.arrows.length} løp</div>
                </button>
                {write && (
                  <button onClick={() => deleteTactic(t.id)} className="p-2 text-slate-500 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}

      {showAssign && (
        <AssignPlayerModal
          slot={tactic.slots.find(s => s.id === showAssign)}
          players={team.players}
          currentPlayerId={tactic.slots.find(s => s.id === showAssign)?.playerId}
          usedPlayerIds={tactic.slots.filter(s => s.id !== showAssign && s.playerId).map(s => s.playerId)}
          onAssign={(pid) => assignPlayer(showAssign, pid)}
          onClose={() => setShowAssign(null)} />
      )}
    </div>
  );
}

function ModeBtn({ active, onClick, icon, children }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
        active ? "bg-lime-400 text-slate-950" : "text-slate-400 hover:text-white"
      }`}>
      {icon} {children}
    </button>
  );
}

function FormationPreview({ formation }) {
  return (
    <div className="relative w-full pitch-grad border border-slate-700/50 rounded-md overflow-hidden" style={{ aspectRatio: "68 / 100" }}>
      {formation.map((s, i) => (
        <div key={i} className="absolute w-2 h-2 rounded-full bg-lime-400 shadow"
          style={{ left: `${s.x}%`, top: `${s.y}%`, transform: "translate(-50%,-50%)" }} />
      ))}
    </div>
  );
}

function PitchMarkings() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 150" preserveAspectRatio="none">
      <rect x="1.5" y="1.5" width="97" height="147" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="0.5" />
      <line x1="1.5" y1="75" x2="98.5" y2="75" stroke="white" strokeOpacity="0.9" strokeWidth="0.5" />
      <circle cx="50" cy="75" r="9" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="0.5" />
      <circle cx="50" cy="75" r="0.6" fill="white" fillOpacity="0.8" />
      <rect x="22" y="1.5" width="56" height="20" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="0.5" />
      <rect x="35" y="1.5" width="30" height="7" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="0.5" />
      <circle cx="50" cy="14" r="0.6" fill="white" fillOpacity="0.8" />
      <path d="M 40 21.5 A 9 9 0 0 0 60 21.5" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="0.5" />
      <rect x="22" y="128.5" width="56" height="20" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="0.5" />
      <rect x="35" y="141.5" width="30" height="7" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="0.5" />
      <circle cx="50" cy="136" r="0.6" fill="white" fillOpacity="0.8" />
      <path d="M 40 128.5 A 9 9 0 0 1 60 128.5" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="0.5" />
      {[[1.5,1.5],[98.5,1.5],[1.5,148.5],[98.5,148.5]].map(([cx,cy],i)=>(
        <circle key={i} cx={cx} cy={cy} r="1.5" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="0.5" />
      ))}
    </svg>
  );
}

function AssignPlayerModal({ slot, players, currentPlayerId, usedPlayerIds, onAssign, onClose }) {
  const used = new Set(usedPlayerIds);
  const roleMatch = (p) => p.positions.includes(slot.role) || p.positions.some(c => roleGroup(c) === roleGroup(slot.role));
  const sorted = [...players].sort((a,b) => {
    const am = roleMatch(a) ? 0 : 1, bm = roleMatch(b) ? 0 : 1;
    if (am !== bm) return am - bm;
    return (a.number||999) - (b.number||999);
  });
  return (
    <Modal title={`Tilordne · ${POSITION_BY_CODE[slot.role]?.label || slot.role}`} onClose={onClose}>
      <div className="space-y-1.5 max-h-[60vh] overflow-y-auto scrollbar-thin">
        <button onClick={() => onAssign(null)}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-950/50 border border-slate-800 hover:border-red-500/40 text-slate-400 hover:text-red-400 text-sm">
          <X className="w-4 h-4" /> Fjern spiller fra denne posisjonen
        </button>
        {sorted.map(p => {
          const isUsed = used.has(p.id);
          const isCurrent = p.id === currentPlayerId;
          const matches = roleMatch(p);
          return (
            <button key={p.id} onClick={() => onAssign(p.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm ${
                isCurrent ? "bg-lime-400/10 border-lime-400/40" :
                isUsed ? "bg-slate-950/30 border-slate-800 opacity-50" :
                "bg-slate-950/50 border-slate-800 hover:border-lime-400/40"
              }`}>
              <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center font-mono text-xs text-lime-400">
                {p.number ?? "?"}
              </div>
              <div className="flex-1 text-left">
                <div className="text-white">{p.name}</div>
                <div className="text-[10px] text-slate-500 font-mono">{p.positions.join(" · ")}</div>
              </div>
              {matches && <span className="text-[10px] font-semibold text-lime-400">PASSER</span>}
              {isUsed && !isCurrent && <span className="text-[10px] text-slate-500">PÅ BANEN</span>}
              {isCurrent && <Check className="w-4 h-4 text-lime-400" />}
            </button>
          );
        })}
        {players.length === 0 && (
          <div className="text-sm text-slate-500 text-center py-6">Ingen spillere i stallen.</div>
        )}
      </div>
    </Modal>
  );
}

// ==================================================================
// ============ ADMIN VIEW (Users / Teams / Players) ===============
// ==================================================================
function AdminView({ user, db, setDB, onOpenTeam }) {
  const [tab, setTab] = useState("users");
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <div className="text-xs font-semibold text-lime-400 tracking-widest mb-2 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5" /> ADMIN-PANEL
        </div>
        <h1 className="font-display text-4xl sm:text-5xl text-white">SYSTEMSTYRING</h1>
        <p className="text-slate-400 mt-2">Brukere, lag, spillere og tilganger</p>
      </div>

      <div className="flex gap-1 mb-6 p-1 bg-slate-900/60 border border-slate-800 rounded-xl w-fit overflow-x-auto">
        <AdminTab active={tab === "users"} onClick={() => setTab("users")} icon={<UserCog className="w-4 h-4" />} count={db.users.length}>Brukere</AdminTab>
        <AdminTab active={tab === "teams"} onClick={() => setTab("teams")} icon={<Shield className="w-4 h-4" />} count={db.teams.length}>Lag</AdminTab>
        <AdminTab active={tab === "players"} onClick={() => setTab("players")} icon={<Users className="w-4 h-4" />} count={db.teams.reduce((s,t) => s + t.players.length, 0)}>Spillere</AdminTab>
        <AdminTab active={tab === "club"} onClick={() => setTab("club")} icon={<Trophy className="w-4 h-4" />}>Klubb</AdminTab>
      </div>

      {tab === "users" && <AdminUsers user={user} db={db} setDB={setDB} />}
      {tab === "teams" && <AdminTeams db={db} setDB={setDB} onOpenTeam={onOpenTeam} />}
      {tab === "players" && <AdminPlayers db={db} setDB={setDB} />}
      {tab === "club" && <AdminClub db={db} setDB={setDB} />}
    </div>
  );
}

function AdminTab({ active, onClick, icon, count, children }) {
  return (
    <button onClick={onClick}
      className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
        active ? "bg-lime-400 text-slate-950" : "text-slate-400 hover:text-white"
      }`}>
      {icon} {children}
      {count !== undefined && (
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${active ? "bg-slate-950/20 text-slate-950" : "bg-slate-800 text-slate-500"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ----- Admin: Users -----
function AdminUsers({ user, db, setDB }) {
  const [editingId, setEditingId] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const remove = async (uid_) => {
    if (uid_ === user.id) return alert("Du kan ikke slette deg selv");
    const u = db.users.find(x => x.id === uid_);
    if (!confirm(`Slette brukeren "${u.username}"?`)) return;
    const next = { ...db, users: db.users.filter(x => x.id !== uid_) };
    setDB(next); await storage.set(DB_KEY, next);
  };

  const save = async (data) => {
    const isEdit = !!editingId;
    let nextUsers;
    if (isEdit) {
      nextUsers = db.users.map(u => u.id === editingId ? { ...u, ...data } : u);
    } else {
      if (db.users.find(u => u.username === data.username)) {
        return alert("Brukernavnet er opptatt");
      }
      nextUsers = [...db.users, { id: uid(), ...data }];
    }
    const next = { ...db, users: nextUsers };
    setDB(next); await storage.set(DB_KEY, next);
    setEditingId(null); setShowNew(false);
  };

  const editingUser = db.users.find(u => u.id === editingId);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl text-white">BRUKERE</h2>
        <button onClick={() => setShowNew(true)}
          className="px-3 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-slate-950 font-semibold text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Ny bruker
        </button>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 tracking-wider">
          <div className="col-span-3">BRUKERNAVN</div>
          <div className="col-span-2">ROLLE</div>
          <div className="col-span-6">TILGANG</div>
          <div className="col-span-1 text-right"></div>
        </div>
        {db.users.map(u => (
          <div key={u.id} className="grid grid-cols-12 gap-3 px-5 py-3.5 border-b border-slate-800/50 last:border-0 hover:bg-slate-900/60 items-center">
            <div className="col-span-3 flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono text-lime-400 flex-shrink-0">
                {u.username[0]?.toUpperCase()}
              </div>
              <div className="text-white text-sm truncate">{u.username}</div>
              {u.id === user.id && <span className="text-[10px] text-lime-400 font-bold">DEG</span>}
            </div>
            <div className="col-span-2"><RoleBadge role={u.role} /></div>
            <div className="col-span-6 flex flex-wrap gap-1.5">
              {u.role === "admin" ? (
                <span className="text-xs text-slate-400 italic">Full tilgang til alle lag</span>
              ) : (u.teamAccess?.length || 0) === 0 ? (
                <span className="text-xs text-slate-500 italic">Ingen tilgang</span>
              ) : (
                u.teamAccess.map(a => {
                  const team = db.teams.find(t => t.id === a.teamId);
                  if (!team) return null;
                  return (
                    <span key={a.teamId} className="text-xs px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-700 text-slate-200 flex items-center gap-1.5">
                      {team.name}{team.variant ? ` ${team.variant}` : ""}
                      <PermBadge permission={a.permission} />
                    </span>
                  );
                })
              )}
            </div>
            <div className="col-span-1 flex justify-end gap-1">
              <button onClick={() => setEditingId(u.id)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
                <Edit3 className="w-4 h-4" />
              </button>
              <button onClick={() => remove(u.id)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {(showNew || editingUser) && (
        <UserEditor
          user={editingUser}
          teams={db.teams}
          onSave={save}
          onClose={() => { setShowNew(false); setEditingId(null); }}
        />
      )}
    </div>
  );
}

function UserEditor({ user: u, teams, onSave, onClose }) {
  const [username, setUsername] = useState(u?.username || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(u?.role || "lagleder");
  const [teamAccess, setTeamAccess] = useState(u?.teamAccess || []);
  const isEdit = !!u;

  const getAccess = (tid) => teamAccess.find(a => a.teamId === tid)?.permission || "none";
  const setAccess = (tid, perm) => {
    setTeamAccess(prev => {
      const without = prev.filter(a => a.teamId !== tid);
      if (perm === "none") return without;
      return [...without, { teamId: tid, permission: perm }];
    });
  };

  const submit = () => {
    if (!username.trim()) return alert("Skriv inn brukernavn");
    if (!isEdit && !password.trim()) return alert("Skriv inn passord");
    const data = { username: username.trim(), role, teamAccess: role === "admin" ? [] : teamAccess };
    if (password.trim()) data.password = password;
    onSave(data);
  };

  return (
    <Modal title={isEdit ? `Rediger bruker · ${u.username}` : "Ny bruker"} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field icon={<User className="w-4 h-4" />} label="Brukernavn">
            <input value={username} onChange={e => setUsername(e.target.value)} disabled={isEdit}
              className="bg-transparent w-full outline-none text-white placeholder:text-slate-600 disabled:opacity-60"
              placeholder="lagleder1" />
          </Field>
          <Field icon={<KeyRound className="w-4 h-4" />} label={isEdit ? "Nytt passord (valgfritt)" : "Passord"}>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="bg-transparent w-full outline-none text-white placeholder:text-slate-600"
              placeholder={isEdit ? "La stå tom for å beholde" : "••••••••"} />
          </Field>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 tracking-wider mb-2 block">ROLLE</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setRole("admin")}
              className={`p-3 rounded-xl border text-left transition-all ${
                role === "admin" ? "border-lime-400 bg-lime-400/10" : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className={`w-4 h-4 ${role === "admin" ? "text-lime-400" : "text-slate-500"}`} />
                <span className="font-semibold text-white text-sm">Admin</span>
              </div>
              <div className="text-xs text-slate-400">Full tilgang til alt</div>
            </button>
            <button onClick={() => setRole("lagleder")}
              className={`p-3 rounded-xl border text-left transition-all ${
                role === "lagleder" ? "border-lime-400 bg-lime-400/10" : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <User className={`w-4 h-4 ${role === "lagleder" ? "text-lime-400" : "text-slate-500"}`} />
                <span className="font-semibold text-white text-sm">Lagleder</span>
              </div>
              <div className="text-xs text-slate-400">Tilgang per lag</div>
            </button>
          </div>
        </div>

        {role === "lagleder" && (
          <div>
            <label className="text-xs font-semibold text-slate-400 tracking-wider mb-2 block">LAGTILGANG</label>
            {teams.length === 0 ? (
              <div className="text-sm text-slate-500 italic bg-slate-950/40 border border-slate-800 rounded-lg p-3">
                Ingen lag opprettet ennå
              </div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin pr-1">
                {teams.map(t => {
                  const perm = getAccess(t.id);
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
                      <div className="min-w-0">
                        <div className="text-white text-sm truncate">{t.name}{t.variant ? ` ${t.variant}` : ""}</div>
                        <div className="text-[10px] text-slate-500">Årskull {t.ageYear}</div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {["none", "read", "write"].map(p => (
                          <button key={p} onClick={() => setAccess(t.id, p)}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider border transition-all ${
                              perm === p
                                ? p === "write" ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                                : p === "read"  ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                                                : "bg-slate-700/40 border-slate-600 text-slate-300"
                                : "border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700"
                            }`}>
                            {p === "none" ? "INGEN" : p === "read" ? "LESE" : "SKRIVE"}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <button onClick={submit} className="w-full py-3 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold rounded-xl">
          {isEdit ? "Lagre endringer" : "Opprett bruker"}
        </button>
      </div>
    </Modal>
  );
}

// ----- Admin: Teams -----
function AdminTeams({ db, setDB, onOpenTeam }) {
  const remove = async (tid) => {
    const t = db.teams.find(x => x.id === tid);
    if (!confirm(`Slette laget "${t.name}"? Alle spillere og taktikker forsvinner.`)) return;
    // also clean up teamAccess refs
    const nextUsers = db.users.map(u => ({
      ...u, teamAccess: (u.teamAccess || []).filter(a => a.teamId !== tid),
    }));
    const next = { ...db, teams: db.teams.filter(x => x.id !== tid), users: nextUsers };
    setDB(next); await storage.set(DB_KEY, next);
  };

  return (
    <div>
      <h2 className="font-display text-xl text-white mb-4">LAG</h2>
      {db.teams.length === 0 ? (
        <div className="text-slate-500 text-sm italic bg-slate-900/40 border border-slate-800 rounded-xl p-6 text-center">
          Ingen lag opprettet ennå
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 tracking-wider">
            <div className="col-span-5">LAG</div>
            <div className="col-span-2">ÅRSKULL</div>
            <div className="col-span-2">SPILLERE</div>
            <div className="col-span-2">TAKTIKKER</div>
            <div className="col-span-1 text-right"></div>
          </div>
          {db.teams.map(t => (
            <div key={t.id} className="grid grid-cols-12 gap-3 px-5 py-3.5 border-b border-slate-800/50 last:border-0 hover:bg-slate-900/60 items-center">
              <div className="col-span-5">
                <button onClick={() => onOpenTeam(t.id)} className="text-white hover:text-lime-400 font-medium text-left">
                  {t.name}{t.variant ? ` ${t.variant}` : ""}
                </button>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{t.format}</div>
              </div>
              <div className="col-span-2 text-slate-300 text-sm">{t.ageYear}</div>
              <div className="col-span-2 text-white font-mono">{t.players.length}</div>
              <div className="col-span-2 text-white font-mono">{t.tactics?.length || 0}</div>
              <div className="col-span-1 flex justify-end">
                <button onClick={() => remove(t.id)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ----- Admin: Players (across all teams) -----
function AdminPlayers({ db, setDB }) {
  const [filterTeam, setFilterTeam] = useState("all");

  const allPlayers = useMemo(() => {
    const list = [];
    db.teams.forEach(t => {
      t.players.forEach(p => list.push({ ...p, teamId: t.id, teamName: `${t.name}${t.variant ? ` ${t.variant}` : ""}` }));
    });
    return list.sort((a,b) => a.teamName.localeCompare(b.teamName) || (a.number||999) - (b.number||999));
  }, [db]);

  const shown = filterTeam === "all" ? allPlayers : allPlayers.filter(p => p.teamId === filterTeam);

  const remove = async (teamId, playerId) => {
    if (!confirm("Slette spilleren?")) return;
    const next = {
      ...db,
      teams: db.teams.map(t => t.id === teamId ? { ...t, players: t.players.filter(p => p.id !== playerId) } : t),
    };
    setDB(next); await storage.set(DB_KEY, next);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-display text-xl text-white">ALLE SPILLERE</h2>
        <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-lime-400/50">
          <option value="all">Alle lag ({allPlayers.length})</option>
          {db.teams.map(t => (
            <option key={t.id} value={t.id}>{t.name}{t.variant ? ` ${t.variant}` : ""} ({t.players.length})</option>
          ))}
        </select>
      </div>

      {shown.length === 0 ? (
        <div className="text-slate-500 text-sm italic bg-slate-900/40 border border-slate-800 rounded-xl p-6 text-center">
          Ingen spillere
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 tracking-wider">
            <div className="col-span-1">NR</div>
            <div className="col-span-3">NAVN</div>
            <div className="col-span-3">LAG</div>
            <div className="col-span-4">POSISJONER</div>
            <div className="col-span-1 text-right"></div>
          </div>
          {shown.map(p => (
            <div key={p.teamId + p.id} className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-slate-800/50 last:border-0 hover:bg-slate-900/60 items-center">
              <div className="col-span-1 font-mono font-bold text-lime-400">{p.number || "—"}</div>
              <div className="col-span-3 text-white text-sm truncate">{p.name}</div>
              <div className="col-span-3 text-slate-300 text-sm truncate">{p.teamName}</div>
              <div className="col-span-4 flex flex-wrap gap-1">
                {p.positions.map(c => {
                  const pos = POSITION_BY_CODE[c];
                  if (!pos) return null;
                  return (
                    <span key={c} className="text-[10px] font-semibold px-1.5 py-0.5 rounded border"
                      style={{ color: pos.color, borderColor: pos.color + "50", backgroundColor: pos.color + "15" }}>
                      {pos.code}
                    </span>
                  );
                })}
              </div>
              <div className="col-span-1 flex justify-end">
                <button onClick={() => remove(p.teamId, p.id)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ----- Admin: Club -----
function AdminClub({ db, setDB }) {
  const updateName = async (name) => {
    const next = { ...db, club: { ...db.club, name } };
    setDB(next); await storage.set(DB_KEY, next);
  };
  const resetAll = async () => {
    if (!confirm("Nullstille hele systemet? Alle data slettes permanent.")) return;
    if (!confirm("Helt sikker? Dette kan ikke angres.")) return;
    const fresh = defaultDB();
    setDB(fresh); await storage.set(DB_KEY, fresh);
    alert("Systemet er nullstilt. Logger deg ut.");
    window.location.reload();
  };
  return (
    <div>
      <h2 className="font-display text-xl text-white mb-4">KLUBBINNSTILLINGER</h2>
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 max-w-lg space-y-4">
        <Field icon={<Trophy className="w-4 h-4" />} label="Klubbnavn">
          <input value={db.club.name} onChange={e => updateName(e.target.value)}
            className="bg-transparent w-full outline-none text-white" />
        </Field>
        <div className="text-xs text-slate-500 pt-3 border-t border-slate-800">
          Data lagres lokalt (per enhet/økt). For deling mellom enheter trengs ekstern database.
        </div>
        <button onClick={resetAll}
          className="text-xs text-red-400 hover:text-red-300 flex items-center gap-2">
          <Trash2 className="w-3.5 h-3.5" /> Nullstill alle data
        </button>
      </div>
    </div>
  );
}

// ==================================================================
// =================== ROOT APP ====================================
// ==================================================================
export default function App() {
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [db, setDB] = useState(defaultDB());
  const [view, setView] = useState({ name: "club" });

  useEffect(() => {
    (async () => {
      let stored = await storage.get(DB_KEY);
      if (!stored) {
        stored = defaultDB();
        await storage.set(DB_KEY, stored);
      } else if (!stored.users?.[0]?.role) {
        // migrate older versions
        stored.users = stored.users.map((u, i) => ({
          id: u.id || uid(),
          role: i === 0 ? "admin" : "lagleder",
          teamAccess: [],
          ...u,
        }));
        await storage.set(DB_KEY, stored);
      }
      setDB(stored);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <GlobalStyles />
        <div className="text-lime-400 font-display tracking-widest">LASTER...</div>
      </div>
    );
  }

  const user = db.users.find(u => u.id === currentUserId);

  if (!user) {
    return (
      <>
        <GlobalStyles />
        <AuthScreen onLogin={setCurrentUserId} db={db} />
      </>
    );
  }

  const currentTeam = (view.name === "team" || view.name === "tactics")
    ? db.teams.find(t => t.id === view.teamId)
    : null;

  // Permission guard: if user lost read access, kick back to club
  if (currentTeam && !canRead(user, currentTeam.id)) {
    setTimeout(() => setView({ name: "club" }), 0);
  }

  const breadcrumbs = view.name === "club" ? "Klubbside"
    : view.name === "team" ? `Klubbside · ${currentTeam?.name || ""}`
    : view.name === "tactics" ? `${currentTeam?.name || ""} · Taktikkbrett`
    : view.name === "admin" ? "Admin-panel"
    : "";

  const onBack = view.name === "club" || view.name === "admin" ? null
    : view.name === "team" ? () => setView({ name: "club" })
    : () => setView({ name: "team", teamId: view.teamId });

  return (
    <div className="min-h-screen bg-slate-950 text-white font-body">
      <GlobalStyles />
      <Header
        user={user}
        club={db.club}
        breadcrumbs={breadcrumbs}
        onBack={onBack}
        currentView={view.name}
        onAdmin={() => setView(v => v.name === "admin" ? { name: "club" } : { name: "admin" })}
        onLogout={() => { setCurrentUserId(null); setView({ name: "club" }); }}
      />

      <div className="anim-in">
        {view.name === "club" && (
          <ClubView user={user} db={db} setDB={setDB}
            onOpenTeam={(id) => setView({ name: "team", teamId: id })} />
        )}
        {view.name === "team" && currentTeam && (
          <TeamView team={currentTeam} user={user} db={db} setDB={setDB}
            onOpenTactics={() => setView({ name: "tactics", teamId: currentTeam.id })} />
        )}
        {view.name === "tactics" && currentTeam && (
          <TacticsView team={currentTeam} user={user} db={db} setDB={setDB} />
        )}
        {view.name === "admin" && isAdmin(user) && (
          <AdminView user={user} db={db} setDB={setDB}
            onOpenTeam={(id) => setView({ name: "team", teamId: id })} />
        )}
      </div>
    </div>
  );
}
