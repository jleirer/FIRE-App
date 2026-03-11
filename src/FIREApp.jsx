import { useState, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from "recharts";

const fmt = (n) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K`
  : `$${n.toFixed(0)}`;

const pct = (n) => `${n.toFixed(1)}%`;

// --- Themes ---
const THEMES = {
  dark: {
    bg: "#0d0d0d", panel: "#111111", panelAlt: "#141414",
    border: "#222222", borderAlt: "#2a2a2a", borderStrong: "#333333",
    text: "#e0e0e0", textMuted: "#8a8a8a", textFaint: "#666666", textVeryFaint: "#444444",
    inputBg: "#1a1a1a", divider: "#1e1e1e", tooltipBg: "#1a1a1a", sliderTrack: "#2a2a2a",
    tabInactiveText: "#555555", tabActiveFire: "#e8d5a3", tabActiveCoast: "#6b9ab8",
    tabActiveTextDark: "#0d0d0d", userActiveBg: "#e8d5a3", userActiveText: "#0d0d0d",
    userInactiveBg: "#1a1a1a", userInactiveBorder: "#2a2a2a",
    accent: "#e8d5a3", blue: "#6b9ab8", green: "#4a7c6f", orange: "#c97b63",
    purple: "#9b8ab8", teal: "#4a9ab8",
    scenarioColors: ["#e8d5a3", "#6b9ab8", "#4a7c6f", "#c97b63", "#9b8ab8", "#b8a86b"],
  },
  light: {
    bg: "#f5f4ef", panel: "#ffffff", panelAlt: "#f9f8f5",
    border: "#e0ddd5", borderAlt: "#d8d5ce", borderStrong: "#c8c4bc",
    text: "#1a1a1a", textMuted: "#5a5a5a", textFaint: "#777777", textVeryFaint: "#aaaaaa",
    inputBg: "#f0efe9", divider: "#e8e6e0", tooltipBg: "#ffffff", sliderTrack: "#d5d2ca",
    tabInactiveText: "#888888", tabActiveFire: "#7a5f10", tabActiveCoast: "#2a5a7a",
    tabActiveTextDark: "#ffffff", userActiveBg: "#7a5f10", userActiveText: "#ffffff",
    userInactiveBg: "#f0efe9", userInactiveBorder: "#d8d5ce",
    accent: "#7a5f10", blue: "#2a5a7a", green: "#2a5a4a", orange: "#8a4a2a",
    purple: "#5a4a7a", teal: "#1a6a7a",
    scenarioColors: ["#7a5f10", "#2a5a7a", "#2a5a4a", "#8a4a2a", "#5a4a7a", "#6a5a30"],
  },
  "high-contrast": {
    bg: "#000000", panel: "#000000", panelAlt: "#000000",
    border: "#ffffff", borderAlt: "#888888", borderStrong: "#ffffff",
    text: "#ffffff", textMuted: "#dddddd", textFaint: "#bbbbbb", textVeryFaint: "#999999",
    inputBg: "#111111", divider: "#555555", tooltipBg: "#111111", sliderTrack: "#444444",
    tabInactiveText: "#aaaaaa", tabActiveFire: "#ffff00", tabActiveCoast: "#00ccff",
    tabActiveTextDark: "#000000", userActiveBg: "#ffff00", userActiveText: "#000000",
    userInactiveBg: "#111111", userInactiveBorder: "#888888",
    accent: "#ffff00", blue: "#00ccff", green: "#00ff88", orange: "#ff8800",
    purple: "#cc88ff", teal: "#00ffcc",
    scenarioColors: ["#ffff00", "#00ccff", "#00ff88", "#ff8800", "#cc88ff", "#ffcc00"],
  },
};

// --- Historical S&P 500 nominal total returns, 1928–2024 (Damodaran) ---
const HISTORICAL_RETURNS = [
  0.4381, -0.0830, -0.2490, -0.4334, -0.0819,  0.5399, -0.0144,  0.4767,
  0.3392, -0.3496,  0.3112, -0.0041, -0.0978, -0.1159,  0.2034,  0.2590,
  0.1975,  0.3644, -0.0807,  0.0520,  0.0570,  0.1879,  0.3171,  0.2402,
  0.1837, -0.0099,  0.5262,  0.3156,  0.0656, -0.1078,  0.4336,  0.1196,
  0.0047,  0.2689, -0.0873,  0.2280,  0.1648,  0.1245, -0.1006,  0.2398,
  0.1106, -0.0850,  0.0401,  0.1431,  0.1898, -0.1466, -0.2647,  0.3723,
  0.2384, -0.0718,  0.0656,  0.1844,  0.3242, -0.0491,  0.2141,  0.2251,
  0.0627,  0.3216,  0.1847,  0.0523,  0.1681,  0.3149, -0.0317,  0.3055,
  0.0767,  0.0999,  0.0131,  0.3758,  0.2296,  0.3336,  0.2858,  0.2104,
 -0.0910, -0.1189, -0.2210,  0.2868,  0.1088,  0.0491,  0.1579,  0.0549,
 -0.3700,  0.2646,  0.1506,  0.0211,  0.1600,  0.3239,  0.1369,  0.0138,
  0.1196,  0.2183, -0.0438,  0.3149,  0.1840,  0.2871, -0.1811,  0.2629,
  0.2331,
];

// --- FIRE calculation ---
function calcFIRE({ age, netWorth, spending, annualContributions, inflation, growth, swr, maxAge = 90 }) {
  const data = [];
  let nw = netWorth;
  let fireAge = null;
  let ruinAge = null;
  const fireNumber = spending / (swr / 100);

  for (let yr = 0; yr <= maxAge - age; yr++) {
    const currentAge = age + yr;
    const realSpending = spending * Math.pow(1 + inflation / 100, yr);
    if (fireAge === null && nw >= fireNumber) fireAge = currentAge;
    const isFired = fireAge !== null;
    let newNw = isFired
      ? nw * (1 + growth / 100) - realSpending
      : nw * (1 + growth / 100) + annualContributions;
    if (isFired && nw > 0 && newNw <= 0 && ruinAge === null) ruinAge = currentAge + 1;
    data.push({ age: currentAge, netWorth: Math.max(0, nw), fireNumber, phase: isFired ? "retirement" : "accumulation" });
    nw = newNw;
    if (nw < 0 && ruinAge !== null) nw = 0;
  }
  return { data, fireAge, ruinAge, fireNumber };
}

// --- Coast FIRE calculation ---
function calcCoastFIRE({ age, netWorth, spending, annualContributions, growth, swr, retirementAge }) {
  const data = [];
  let nw = netWorth;
  let coastAge = null;
  const fireNumber = spending / (swr / 100);
  const endAge = Math.max(retirementAge + 5, age + 10);

  for (let yr = 0; yr <= endAge - age; yr++) {
    const currentAge = age + yr;
    const yearsToRetirement = Math.max(0, retirementAge - currentAge);
    const coastNumber = yearsToRetirement > 0
      ? fireNumber / Math.pow(1 + growth / 100, yearsToRetirement)
      : fireNumber;
    if (coastAge === null && nw >= coastNumber) coastAge = currentAge;
    data.push({ age: currentAge, netWorth: Math.max(0, nw), coastNumber });
    nw = nw * (1 + growth / 100) + annualContributions;
  }
  const todayCoastNumber = retirementAge > age
    ? fireNumber / Math.pow(1 + growth / 100, retirementAge - age)
    : fireNumber;
  return { data, coastAge, fireNumber, todayCoastNumber };
}

// --- Monte Carlo simulation (bootstrap from historical S&P 500 returns) ---
function runMonteCarlo({ age, netWorth, spending, annualContributions, inflation, swr, simCount, maxAge = 90 }) {
  const fireNumber = spending / (swr / 100);
  const years = maxAge - age;
  const netWorths = Array.from({ length: years + 1 }, () => []);
  let successCount = 0;
  let fireReachedCount = 0;

  for (let sim = 0; sim < simCount; sim++) {
    let nw = netWorth;
    let fired = false;
    let fireYr = null;
    let ruined = false;

    for (let yr = 0; yr <= years; yr++) {
      netWorths[yr].push(Math.max(0, nw));
      const ret = HISTORICAL_RETURNS[Math.floor(Math.random() * HISTORICAL_RETURNS.length)];

      if (!fired && nw >= fireNumber) { fired = true; fireYr = yr; }

      let newNw;
      if (!fired) {
        newNw = nw * (1 + ret) + annualContributions;
      } else {
        const yrsRetired = yr - fireYr;
        const realSpending = spending * Math.pow(1 + inflation / 100, yrsRetired);
        newNw = nw * (1 + ret) - realSpending;
      }

      if (fired && newNw <= 0 && !ruined) ruined = true;
      nw = Math.max(0, newNw);
    }

    if (fired) {
      fireReachedCount++;
      if (!ruined) successCount++;
    }
  }

  const percentileData = netWorths.map((values, yr) => {
    const s = [...values].sort((a, b) => a - b);
    const n = s.length;
    const p  = (q) => s[Math.floor(n * q)];
    return {
      age: age + yr,
      p5: p(0.05), p10: p(0.10), p25: p(0.25),
      p50: p(0.50), p75: p(0.75), p95: p(0.95),
    };
  });

  const successRate = fireReachedCount > 0 ? successCount / fireReachedCount : 0;
  const fireReachedRate = fireReachedCount / simCount;
  return { percentileData, successRate, fireReachedRate };
}

// --- localStorage ---
const STORAGE_KEY = "fire-app-data";
const THEME_KEY   = "fire-app-theme";

const defaultParams = {
  age: 30, netWorth: 150000, spending: 60000, annualContributions: 20000,
  retirementAge: 65, inflation: 3, growth: 7, swr: 4,
};

function loadData() {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch {}
  return null;
}
function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}
function initData() {
  const stored = loadData();
  if (stored) {
    Object.values(stored.users).forEach((user) => {
      Object.keys(user.scenarios).forEach((key) => {
        user.scenarios[key] = { ...defaultParams, ...user.scenarios[key] };
      });
    });
    return stored;
  }
  return {
    activeUser: "Default",
    users: { Default: { activeScenario: "Base Case", scenarios: { "Base Case": { ...defaultParams } } } },
  };
}

// --- Sub-components ---
const NumberInput = ({ label, value, onChange, color, t }) => {
  const [display, setDisplay] = useState(() => value === 0 ? "" : value.toLocaleString("en-US"));

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^0-9.,]/g, "");
    setDisplay(raw);
    const num = parseFloat(raw.replace(/,/g, ""));
    if (!isNaN(num)) onChange(num);
    else if (raw === "" || raw === ".") onChange(0);
  };
  const handleFocus = () => {
    const num = parseFloat(display.replace(/,/g, ""));
    setDisplay(isNaN(num) || num === 0 ? "" : String(num));
  };
  const handleBlur = () => {
    const num = parseFloat(display.replace(/,/g, ""));
    if (!isNaN(num)) { onChange(num); setDisplay(num.toLocaleString("en-US")); }
    else { onChange(0); setDisplay(""); }
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: t.textMuted }}>{label}</span>
      </div>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color, fontFamily: "'DM Mono', monospace", pointerEvents: "none" }}>$</span>
        <input
          type="text" inputMode="decimal" value={display} placeholder="0"
          onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur}
          style={{ width: "100%", paddingLeft: 22, paddingRight: 10, paddingTop: 7, paddingBottom: 7, background: t.inputBg, border: `1px solid ${color}55`, borderRadius: 6, color, fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono', monospace", outline: "none" }}
          onFocusCapture={(e) => e.target.style.borderColor = color}
          onBlurCapture={(e) => e.target.style.borderColor = `${color}55`}
        />
      </div>
    </div>
  );
};

const Slider = ({ label, value, min, max, step, onChange, format, color, t }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
      <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: t.textMuted }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "'DM Mono', monospace" }}>{format(value)}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: "100%", appearance: "none", height: 3, borderRadius: 2, background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, ${t.sliderTrack} ${((value - min) / (max - min)) * 100}%, ${t.sliderTrack} 100%)`, outline: "none", cursor: "pointer" }}
    />
  </div>
);

const InfoTooltip = ({ text, t }) => {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block", verticalAlign: "middle" }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 13, height: 13, borderRadius: "50%",
          border: `1px solid ${t.textVeryFaint}`, color: t.textVeryFaint,
          fontSize: 8, cursor: "default", marginLeft: 5,
          fontFamily: "sans-serif", fontStyle: "normal", userSelect: "none",
        }}
      >?</span>
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
          transform: "translateX(-50%)",
          background: t.tooltipBg, border: `1px solid ${t.borderStrong}`,
          borderRadius: 8, padding: "10px 12px",
          fontSize: 11, color: t.textMuted, lineHeight: 1.6,
          width: 230, zIndex: 100, pointerEvents: "none", whiteSpace: "normal",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}>
          {text}
        </div>
      )}
    </span>
  );
};

const StatCard = ({ label, value, sub, accent, t, tooltip }) => (
  <div style={{ background: t.panelAlt, border: `1px solid ${accent}44`, borderRadius: 12, padding: "18px 20px", flex: 1, minWidth: 130 }}>
    <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: t.textFaint, marginBottom: 8, display: "flex", alignItems: "center" }}>
      {label}
      {tooltip && <InfoTooltip text={tooltip} t={t} />}
    </div>
    <div style={{ fontSize: 26, fontWeight: 800, color: accent, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>{sub}</div>}
  </div>
);

const ChartTooltip = ({ active, payload, label, t, mcMode, mcData, mcPercentiles }) => {
  if (!active || !payload?.length) return null;
  if (mcMode && mcData) {
    const pt = mcData.find((d) => d.age === label);
    if (!pt) return null;
    const allPcts = [95, 75, 50, 25, 10, 5];
    const visible = mcPercentiles ? allPcts.filter((p) => mcPercentiles.includes(p)) : allPcts;
    return (
      <div style={{ background: t.tooltipBg, border: `1px solid ${t.borderStrong}`, borderRadius: 8, padding: "12px 16px", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
        <div style={{ color: t.textMuted, marginBottom: 8 }}>Age {label}</div>
        {visible.map((p) => (
          <div key={p} style={{ color: p === 50 ? (payload[0]?.color || t.accent) : p >= 50 ? t.textFaint : t.textVeryFaint, fontWeight: p === 50 ? 700 : 400, marginBottom: 3 }}>
            {p === 50 ? "Median" : `${p}th`}{"  "}{fmt(pt[`p${p}`] || 0)}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ background: t.tooltipBg, border: `1px solid ${t.borderStrong}`, borderRadius: 8, padding: "12px 16px", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
      <div style={{ color: t.textMuted, marginBottom: 8 }}>Age {label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 4 }}>{p.name}: {fmt(p.value || 0)}</div>
      ))}
    </div>
  );
};

// --- Main App ---
export default function FIREApp() {
  const [appData, setAppData]             = useState(initData);
  const [view, setView]                   = useState("fire");
  const [theme, setTheme]                 = useState(() => { try { return localStorage.getItem(THEME_KEY) || "dark"; } catch { return "dark"; } });
  const [showMC, setShowMC]               = useState(false);
  const [mcSimCount, setMcSimCount]       = useState(1000);
  const [maxAge, setMaxAge]               = useState(90);
  const [mcPercentiles, setMcPercentiles] = useState([5, 25, 50, 75, 95]);
  const [newUserName, setNewUserName]     = useState("");
  const [newScenarioName, setNewScenarioName] = useState("");
  const [showAddUser, setShowAddUser]     = useState(false);
  const [showAddScenario, setShowAddScenario] = useState(false);

  const t = THEMES[theme] || THEMES.dark;

  const changeTheme = (th) => { setTheme(th); try { localStorage.setItem(THEME_KEY, th); } catch {} };
  const update = (newData) => { setAppData(newData); saveData(newData); };

  const activeUser   = appData.users[appData.activeUser];
  const activeParams = activeUser.scenarios[activeUser.activeScenario];

  const setParam = (key, val) => update({
    ...appData,
    users: { ...appData.users, [appData.activeUser]: { ...activeUser,
      scenarios: { ...activeUser.scenarios, [activeUser.activeScenario]: { ...activeParams, [key]: val } } } },
  });

  // --- FIRE results ---
  const allFireResults = useMemo(() => {
    const colors = THEMES[theme]?.scenarioColors || THEMES.dark.scenarioColors;
    return Object.entries(activeUser.scenarios).map(([name, params], i) => ({
      name, color: colors[i % colors.length], ...calcFIRE({ ...params, maxAge }),
    }));
  }, [activeUser.scenarios, theme, maxAge]);

  const activeFireResult = allFireResults.find((s) => s.name === activeUser.activeScenario);
  const { fireAge, ruinAge, fireNumber } = activeFireResult;
  const activeColor   = activeFireResult.color;
  const yearsToFire   = fireAge ? fireAge - activeParams.age : null;
  const runway        = fireAge && ruinAge ? ruinAge - fireAge : fireAge ? "∞" : null;

  const fireChartData = useMemo(() => {
    const byAge = {};
    allFireResults.forEach(({ name, data }) => {
      data.forEach(({ age, netWorth }) => {
        if (!byAge[age]) byAge[age] = { age };
        byAge[age][name] = netWorth;
      });
    });
    return Object.values(byAge).sort((a, b) => a.age - b.age);
  }, [allFireResults]);

  // --- Monte Carlo ---
  const mcResults = useMemo(() => {
    if (!showMC) return null;
    return runMonteCarlo({
      age: activeParams.age, netWorth: activeParams.netWorth,
      spending: activeParams.spending, annualContributions: activeParams.annualContributions,
      inflation: activeParams.inflation, swr: activeParams.swr, simCount: mcSimCount, maxAge,
    });
  }, [showMC, activeParams.age, activeParams.netWorth, activeParams.spending,
      activeParams.annualContributions, activeParams.inflation, activeParams.swr, mcSimCount, maxAge]);

  // --- Coast FIRE results ---
  const allCoastResults = useMemo(() => {
    const colors = THEMES[theme]?.scenarioColors || THEMES.dark.scenarioColors;
    return Object.entries(activeUser.scenarios).map(([name, params], i) => ({
      name, color: colors[i % colors.length], ...calcCoastFIRE(params),
    }));
  }, [activeUser.scenarios, theme]);

  const activeCoastResult = allCoastResults.find((s) => s.name === activeUser.activeScenario);
  const { coastAge, todayCoastNumber, fireNumber: coastFireNumber } = activeCoastResult;
  const yearsToCoast = coastAge ? coastAge - activeParams.age : null;

  const coastChartData = useMemo(() => {
    const byAge = {};
    allCoastResults.forEach(({ name, data }) => {
      data.forEach(({ age, netWorth, coastNumber }) => {
        if (!byAge[age]) byAge[age] = { age };
        byAge[age][`${name} Net Worth`] = netWorth;
        if (name === activeUser.activeScenario) byAge[age]["Coast Number"] = coastNumber;
      });
    });
    return Object.values(byAge).sort((a, b) => a.age - b.age);
  }, [allCoastResults, activeUser.activeScenario]);

  // --- User / scenario management ---
  const addUser = () => {
    const name = newUserName.trim();
    if (!name || appData.users[name]) return;
    update({ ...appData, activeUser: name, users: { ...appData.users, [name]: { activeScenario: "Base Case", scenarios: { "Base Case": { ...defaultParams } } } } });
    setNewUserName(""); setShowAddUser(false);
  };
  const deleteUser = (name) => {
    if (Object.keys(appData.users).length <= 1) return;
    const newUsers = { ...appData.users };
    delete newUsers[name];
    update({ ...appData, activeUser: name === appData.activeUser ? Object.keys(newUsers)[0] : appData.activeUser, users: newUsers });
  };
  const addScenario = () => {
    const name = newScenarioName.trim();
    if (!name || activeUser.scenarios[name]) return;
    update({ ...appData, users: { ...appData.users, [appData.activeUser]: { ...activeUser, activeScenario: name, scenarios: { ...activeUser.scenarios, [name]: { ...activeParams } } } } });
    setNewScenarioName(""); setShowAddScenario(false);
  };
  const deleteScenario = (name) => {
    if (Object.keys(activeUser.scenarios).length <= 1) return;
    const newScenarios = { ...activeUser.scenarios };
    delete newScenarios[name];
    const newActive = name === activeUser.activeScenario ? Object.keys(newScenarios)[0] : activeUser.activeScenario;
    update({ ...appData, users: { ...appData.users, [appData.activeUser]: { ...activeUser, activeScenario: newActive, scenarios: newScenarios } } });
  };
  const switchScenario = (name) => update({
    ...appData, users: { ...appData.users, [appData.activeUser]: { ...activeUser, activeScenario: name } },
  });

  const isCoast = view === "coast";

  const successRateColor = (r) => r >= 0.9 ? t.green : r >= 0.75 ? t.orange : t.purple;

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'Libre Baskerville', Georgia, serif", padding: "40px 24px", boxSizing: "border-box" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=DM+Mono:wght@400;500;700&display=swap');
        input[type=range]::-webkit-slider-thumb { appearance: none; width: 14px; height: 14px; border-radius: 50%; background: ${t.accent}; cursor: pointer; border: 2px solid ${t.bg}; box-shadow: 0 0 6px ${t.accent}88; }
        * { box-sizing: border-box; }
        .tab-btn { background: none; border: none; cursor: pointer; font-family: inherit; }
        .tab-btn:hover { opacity: 0.8; }
        .icon-btn { background: none; border: none; cursor: pointer; color: ${t.textVeryFaint}; padding: 2px 6px; font-size: 14px; line-height: 1; }
        .icon-btn:hover { color: ${t.textMuted}; }
        input[type=text] { background: ${t.inputBg}; border: 1px solid ${t.border}; border-radius: 6px; color: ${t.text}; padding: 6px 10px; font-size: 13px; font-family: inherit; outline: none; }
        input[type=text]:focus { border-color: ${t.borderStrong}; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 28, borderBottom: `1px solid ${t.border}`, paddingBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <h1 style={{ margin: 0, fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 700, letterSpacing: "-0.02em", color: t.accent }}>FIRE</h1>
              <span style={{ fontSize: "clamp(14px, 2vw, 18px)", color: t.textFaint, fontStyle: "italic" }}>Financial Independence, Retire Early</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {/* Theme selector */}
              <div style={{ display: "flex", background: t.panel, border: `1px solid ${t.border}`, borderRadius: 10, padding: 3, gap: 2 }}>
                {[["dark", "Dark"], ["light", "Light"], ["high-contrast", "HC"]].map(([key, label]) => (
                  <button key={key} className="tab-btn" onClick={() => changeTheme(key)}
                    title={key === "high-contrast" ? "High Contrast" : `${label} theme`}
                    style={{ padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
                      color: theme === key ? t.tabActiveTextDark : t.tabInactiveText,
                      background: theme === key ? t.accent : "transparent" }}>
                    {label}
                  </button>
                ))}
              </div>
              {/* View toggle */}
              <div style={{ display: "flex", background: t.panel, border: `1px solid ${t.border}`, borderRadius: 10, padding: 3, gap: 2 }}>
                {[["fire", "FIRE"], ["coast", "Coast FIRE"]].map(([key, label]) => (
                  <button key={key} className="tab-btn" onClick={() => setView(key)}
                    style={{ padding: "7px 18px", borderRadius: 8, fontSize: 12, fontWeight: 600, letterSpacing: "0.05em",
                      color: view === key ? t.tabActiveTextDark : t.tabInactiveText,
                      background: view === key ? (key === "coast" ? t.tabActiveCoast : t.tabActiveFire) : "transparent" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* User tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: t.textVeryFaint, marginRight: 4 }}>User</span>
            {Object.keys(appData.users).map((name) => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <button className="tab-btn" onClick={() => update({ ...appData, activeUser: name })}
                  style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: name === appData.activeUser ? 700 : 400,
                    color: name === appData.activeUser ? t.userActiveText : t.textFaint,
                    background: name === appData.activeUser ? t.userActiveBg : t.userInactiveBg,
                    border: `1px solid ${name === appData.activeUser ? t.userActiveBg : t.userInactiveBorder}` }}>
                  {name}
                </button>
                {Object.keys(appData.users).length > 1 && <button className="icon-btn" onClick={() => deleteUser(name)} title="Remove user">×</button>}
              </div>
            ))}
            {showAddUser ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="text" placeholder="Name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addUser(); if (e.key === "Escape") setShowAddUser(false); }} autoFocus style={{ width: 110 }} />
                <button className="tab-btn" onClick={addUser} style={{ color: t.accent, fontSize: 12, padding: "5px 12px", border: `1px solid ${t.border}`, borderRadius: 6 }}>Add</button>
                <button className="icon-btn" onClick={() => setShowAddUser(false)}>×</button>
              </div>
            ) : (
              <button className="tab-btn" onClick={() => setShowAddUser(true)} style={{ color: t.textVeryFaint, fontSize: 18, lineHeight: 1, padding: "2px 8px", border: `1px solid ${t.border}`, borderRadius: 20 }}>+</button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          {/* Left — Inputs */}
          <div style={{ flex: "0 0 280px", background: t.panel, border: `1px solid ${t.border}`, borderRadius: 16, padding: 28 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: t.textVeryFaint, marginBottom: 12 }}>Scenario</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(isCoast ? allCoastResults : allFireResults).map(({ name, color }) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button className="tab-btn" onClick={() => switchScenario(name)}
                      style={{ flex: 1, textAlign: "left", padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: name === activeUser.activeScenario ? 700 : 400,
                        color: name === activeUser.activeScenario ? t.tabActiveTextDark : color,
                        background: name === activeUser.activeScenario ? color : "transparent",
                        border: `1px solid ${name === activeUser.activeScenario ? color : t.borderAlt}` }}>
                      <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: name === activeUser.activeScenario ? t.tabActiveTextDark : color, marginRight: 8, verticalAlign: "middle" }} />
                      {name}
                    </button>
                    {Object.keys(activeUser.scenarios).length > 1 && <button className="icon-btn" onClick={() => deleteScenario(name)} title="Remove scenario">×</button>}
                  </div>
                ))}
                {showAddScenario ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                    <input type="text" placeholder="Scenario name" value={newScenarioName} onChange={(e) => setNewScenarioName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addScenario(); if (e.key === "Escape") setShowAddScenario(false); }} autoFocus style={{ flex: 1, fontSize: 12 }} />
                    <button className="tab-btn" onClick={addScenario} style={{ color: t.accent, fontSize: 11, padding: "4px 8px", border: `1px solid ${t.border}`, borderRadius: 6 }}>Add</button>
                    <button className="icon-btn" onClick={() => setShowAddScenario(false)}>×</button>
                  </div>
                ) : (
                  <button className="tab-btn" onClick={() => setShowAddScenario(true)} style={{ textAlign: "left", padding: "5px 10px", borderRadius: 8, fontSize: 11, color: t.textVeryFaint, border: `1px dashed ${t.borderAlt}` }}>
                    + Add scenario
                  </button>
                )}
              </div>
            </div>

            <div style={{ height: 1, background: t.divider, margin: "4px 0 20px" }} />

            <Slider label="Current Age" value={activeParams.age} min={18} max={70} step={1} onChange={(v) => setParam("age", v)} format={(v) => `${v} yrs`} color={t.blue} t={t} />
            <Slider label="Net Worth" value={activeParams.netWorth} min={0} max={2000000} step={5000} onChange={(v) => setParam("netWorth", v)} format={fmt} color={t.accent} t={t} />
            <Slider label="Annual Spending" value={activeParams.spending} min={20000} max={300000} step={1000} onChange={(v) => setParam("spending", v)} format={fmt} color={t.accent} t={t} />
            <NumberInput key={`${appData.activeUser}-${activeUser.activeScenario}`} label="Annual Contributions" value={activeParams.annualContributions} onChange={(v) => setParam("annualContributions", v)} color={t.teal} t={t} />

            {isCoast && <Slider label="Target Retirement Age" value={activeParams.retirementAge} min={40} max={80} step={1} onChange={(v) => setParam("retirementAge", v)} format={(v) => `${v} yrs`} color={t.purple} t={t} />}

            <div style={{ height: 1, background: t.divider, margin: "20px 0" }} />

            <Slider label="Portfolio Growth" value={activeParams.growth} min={1} max={15} step={0.1} onChange={(v) => setParam("growth", v)} format={pct} color={t.green} t={t} />
            {!isCoast && <Slider label="Inflation Rate" value={activeParams.inflation} min={0} max={10} step={0.1} onChange={(v) => setParam("inflation", v)} format={pct} color={t.orange} t={t} />}
            <Slider label="Safe Withdrawal Rate" value={activeParams.swr} min={2} max={8} step={0.1} onChange={(v) => setParam("swr", v)} format={pct} color={t.purple} t={t} />
          </div>

          {/* Right — Chart + Stats */}
          <div style={{ flex: 1, minWidth: 300, display: "flex", flexDirection: "column", gap: 20 }}>

            {isCoast ? (
              <>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <StatCard label="Coast Age" value={coastAge ? `${coastAge}` : "—"} sub={yearsToCoast != null ? (yearsToCoast <= 0 ? "Already coasting!" : `${yearsToCoast} years away`) : "Not reached"} accent={t.blue} t={t} tooltip="The age at which you can stop making contributions entirely. After this point, investment growth alone is projected to carry your portfolio to your full FIRE Number by your retirement age." />
                  <StatCard label="Coast Number (Today)" value={fmt(todayCoastNumber)} sub={`to retire at ${activeParams.retirementAge}`} accent={t.accent} t={t} tooltip={`The lump sum you need invested right now so that, with zero future contributions, it grows to your FIRE Number by retirement. Formula: FIRE Number ÷ (1 + growth)^years to retirement.`} />
                  <StatCard label="FIRE Number" value={fmt(coastFireNumber)} sub={`at ${activeParams.swr}% SWR`} accent={t.green} t={t} tooltip={`The total portfolio size needed to retire. Formula: Annual Spending ÷ Safe Withdrawal Rate. At a ${activeParams.swr}% SWR, your portfolio can sustain withdrawals indefinitely if it grows faster than you spend.`} />
                  <StatCard label="Progress" value={todayCoastNumber > 0 ? `${Math.min(100, Math.round((activeParams.netWorth / todayCoastNumber) * 100))}%` : "—"} sub="of coast number" accent={activeParams.netWorth >= todayCoastNumber ? t.green : t.purple} t={t} tooltip="Your current net worth as a percentage of your Coast Number. At 100% you've hit your coast target — you can stop contributing and let compound growth do the rest." />
                </div>

                <div style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: 16, padding: "24px 16px 12px", flex: 1 }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: t.textVeryFaint, marginBottom: 20, paddingLeft: 8 }}>Coast FI Trajectory</div>
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={coastChartData} margin={{ top: 30, right: 16, bottom: 0, left: 10 }}>
                      <defs>
                        {allCoastResults.map(({ name, color }) => (
                          <linearGradient key={name} id={`cgrad-${name.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                          </linearGradient>
                        ))}
                        <linearGradient id="coastLineGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={t.purple} stopOpacity={0.08} />
                          <stop offset="95%" stopColor={t.purple} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={t.divider} vertical={false} />
                      <XAxis dataKey="age" tick={{ fill: t.textVeryFaint, fontSize: 11, fontFamily: "'DM Mono', monospace" }} axisLine={{ stroke: t.border }} tickLine={false} label={{ value: "Age", position: "insideBottomRight", offset: -8, fill: t.textVeryFaint, fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => fmt(v)} tick={{ fill: t.textVeryFaint, fontSize: 10, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} width={70} />
                      <Tooltip content={<ChartTooltip t={t} />} />
                      {coastAge && <ReferenceLine x={coastAge} stroke={t.blue} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `Coast ${coastAge}`, fill: t.blue, fontSize: 10, fontFamily: "'DM Mono', monospace", position: "top" }} />}
                      <ReferenceLine x={activeParams.retirementAge} stroke={t.green} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `Retire ${activeParams.retirementAge}`, fill: t.green, fontSize: 10, fontFamily: "'DM Mono', monospace", position: "top" }} />
                      <Area type="monotone" dataKey="Coast Number" stroke={t.purple} strokeWidth={1.5} strokeDasharray="6 4" fill="url(#coastLineGrad)" dot={false} />
                      {allCoastResults.map(({ name, color }) => (
                        <Area key={name} type="monotone" dataKey={`${name} Net Worth`} stroke={color} strokeWidth={name === activeUser.activeScenario ? 2.5 : 1.5} strokeOpacity={name === activeUser.activeScenario ? 1 : 0.45} fill={`url(#cgrad-${name.replace(/\s+/g, "")})`} dot={false} name={`${name} Net Worth`} />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", gap: 16, paddingLeft: 16, marginTop: 8, flexWrap: "wrap" }}>
                    {allCoastResults.map(({ name, color }) => (
                      <div key={name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 20, height: 2, background: color, borderRadius: 1, opacity: name === activeUser.activeScenario ? 1 : 0.4 }} />
                        <span style={{ fontSize: 10, color: name === activeUser.activeScenario ? t.textMuted : t.textVeryFaint, letterSpacing: "0.05em" }}>{name}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 20, height: 2, background: `repeating-linear-gradient(to right, ${t.purple} 0, ${t.purple} 4px, transparent 4px, transparent 8px)`, borderRadius: 1 }} />
                      <span style={{ fontSize: 10, color: t.textFaint, letterSpacing: "0.05em" }}>Coast Number</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 20px", fontSize: 13, color: t.textFaint, fontStyle: "italic", lineHeight: 1.7 }}>
                  {activeParams.netWorth >= todayCoastNumber ? (
                    <>You've already reached your Coast FI number of <span style={{ color: t.accent, fontStyle: "normal", fontWeight: 700 }}>{fmt(todayCoastNumber)}</span>. You can stop contributing and your portfolio is projected to grow to <span style={{ color: t.green, fontStyle: "normal", fontWeight: 700 }}>{fmt(coastFireNumber)}</span> by age {activeParams.retirementAge}.</>
                  ) : coastAge ? (
                    <>At your current contribution rate, you'll reach Coast FI at age <span style={{ color: t.blue, fontStyle: "normal", fontWeight: 700 }}>{coastAge}</span> — {yearsToCoast} years from now. After that, your portfolio can grow to <span style={{ color: t.green, fontStyle: "normal", fontWeight: 700 }}>{fmt(coastFireNumber)}</span> by age {activeParams.retirementAge} without further contributions.</>
                  ) : (
                    <>Based on these inputs, Coast FI is not reached before retirement age {activeParams.retirementAge}. Try increasing contributions or growth rate.</>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* FIRE stat cards */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <StatCard label="FIRE Age" value={fireAge ? `${fireAge}` : "—"} sub={yearsToFire ? `${yearsToFire} years away` : "Not reached"} accent={activeColor} t={t} tooltip={`The age when your projected net worth first reaches your FIRE Number. Calculated by growing your current portfolio at ${activeParams.growth}% per year (with annual contributions) until it crosses the FIRE threshold.`} />
                  <StatCard label="FIRE Number" value={fmt(fireNumber)} sub={`at ${activeParams.swr}% SWR`} accent={t.green} t={t} tooltip={`How much you need invested to retire. Formula: Annual Spending ÷ Safe Withdrawal Rate. At ${activeParams.swr}% SWR: $${(activeParams.spending / 1000).toFixed(0)}K ÷ ${activeParams.swr}% = ${fmt(fireNumber)}. A lower SWR is more conservative and requires a larger portfolio.`} />
                  <StatCard label="Portfolio Runway" value={runway !== null ? (runway === "∞" ? "∞" : `${runway} yrs`) : "—"} sub={ruinAge ? `Depleted at age ${ruinAge}` : runway === "∞" ? "Never depleted" : ""} accent={ruinAge ? t.orange : t.blue} t={t} tooltip={`How long your portfolio lasts after reaching FIRE before being drawn down to zero. "∞" means your real portfolio growth rate exceeds your withdrawal rate — it never depletes. Affected by spending, growth rate, and inflation.`} />
                  {showMC && mcResults ? (
                    <StatCard
                      label="MC Success Rate"
                      value={`${Math.round(mcResults.successRate * 100)}%`}
                      sub={`${mcSimCount.toLocaleString()} simulations · historical returns`}
                      accent={successRateColor(mcResults.successRate)}
                      t={t}
                      tooltip={`The percentage of simulated historical market sequences where your portfolio survived the full projection window. Uses bootstrap resampling of real S&P 500 annual returns from 1928–2024. Higher is better; 90%+ is generally considered safe.`}
                    />
                  ) : (
                    <StatCard label="Real Spending" value={fmt(activeParams.spending * Math.pow(1 + activeParams.inflation / 100, yearsToFire || 0))} sub="at retirement (inflation adj.)" accent={t.purple} t={t} tooltip={`Your current annual spending adjusted for ${activeParams.inflation}% inflation by the time you reach FIRE. Formula: $${(activeParams.spending / 1000).toFixed(0)}K × (1 + ${activeParams.inflation}%)^${yearsToFire || 0} years. This is the actual annual amount you'll need to withdraw in retirement.`} />
                  )}
                </div>

                {/* FIRE chart */}
                <div style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: 16, padding: "24px 16px 12px", flex: 1 }}>
                  {/* Chart header with MC toggle */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: 8, marginBottom: 20 }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: t.textVeryFaint }}>
                      Net Worth Forecast
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {showMC && (
                        <div style={{ display: "flex", background: t.panelAlt, border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden" }}>
                          {[500, 1000, 5000].map((n) => (
                            <button key={n} className="tab-btn" onClick={() => setMcSimCount(n)}
                              style={{ padding: "4px 10px", fontSize: 10, fontFamily: "'DM Mono', monospace",
                                color: mcSimCount === n ? t.tabActiveTextDark : t.textVeryFaint,
                                background: mcSimCount === n ? t.accent : "transparent",
                                borderRight: n !== 5000 ? `1px solid ${t.border}` : "none" }}>
                              {n.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      )}
                      <button className="tab-btn" onClick={() => setShowMC(!showMC)}
                        style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
                          color: showMC ? t.tabActiveTextDark : t.textFaint,
                          background: showMC ? t.green : "transparent",
                          border: `1px solid ${showMC ? t.green : t.borderAlt}` }}>
                        Monte Carlo
                      </button>
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={320}>
                    {showMC && mcResults ? (
                      <AreaChart data={mcResults.percentileData} margin={{ top: 30, right: 16, bottom: 0, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={t.divider} vertical={false} />
                        <XAxis dataKey="age" tick={{ fill: t.textVeryFaint, fontSize: 11, fontFamily: "'DM Mono', monospace" }} axisLine={{ stroke: t.border }} tickLine={false} label={{ value: "Age", position: "insideBottomRight", offset: -8, fill: t.textVeryFaint, fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => fmt(v)} tick={{ fill: t.textVeryFaint, fontSize: 10, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} width={70} />
                        <Tooltip content={<ChartTooltip t={t} mcMode={true} mcData={mcResults.percentileData} mcPercentiles={mcPercentiles} />} />
                        {fireAge && <ReferenceLine x={fireAge} stroke={activeColor} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `FIRE ${fireAge}`, fill: activeColor, fontSize: 10, fontFamily: "'DM Mono', monospace", position: "top" }} />}
                        {[5, 10, 25, 50, 75, 95].filter((p) => mcPercentiles.includes(p)).map((p) => (
                          <Area
                            key={p}
                            type="monotone"
                            dataKey={`p${p}`}
                            fill="none"
                            stroke={activeColor}
                            strokeWidth={p === 50 ? 2.5 : 1}
                            strokeOpacity={p === 50 ? 1 : p === 25 || p === 75 ? 0.55 : 0.3}
                            strokeDasharray={p === 50 ? undefined : "4 3"}
                            dot={false}
                            name={p === 50 ? "Median (p50)" : `p${p}`}
                          />
                        ))}
                      </AreaChart>
                    ) : (
                      <AreaChart data={fireChartData} margin={{ top: 30, right: 16, bottom: 0, left: 10 }}>
                        <defs>
                          {allFireResults.map(({ name, color }) => (
                            <linearGradient key={name} id={`fgrad-${name.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                              <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={t.divider} vertical={false} />
                        <XAxis dataKey="age" tick={{ fill: t.textVeryFaint, fontSize: 11, fontFamily: "'DM Mono', monospace" }} axisLine={{ stroke: t.border }} tickLine={false} label={{ value: "Age", position: "insideBottomRight", offset: -8, fill: t.textVeryFaint, fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => fmt(v)} tick={{ fill: t.textVeryFaint, fontSize: 10, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} width={70} />
                        <Tooltip content={<ChartTooltip t={t} />} />
                        {fireAge && <ReferenceLine x={fireAge} stroke={activeColor} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `FIRE ${fireAge}`, fill: activeColor, fontSize: 10, fontFamily: "'DM Mono', monospace", position: "top" }} />}
                        {ruinAge && <ReferenceLine x={ruinAge} stroke={t.orange} strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `Depleted ${ruinAge}`, fill: t.orange, fontSize: 10, fontFamily: "'DM Mono', monospace", position: "top" }} />}
                        {allFireResults.map(({ name, color }) => (
                          <Area key={name} type="monotone" dataKey={name} stroke={color} strokeWidth={name === activeUser.activeScenario ? 2.5 : 1.5} strokeOpacity={name === activeUser.activeScenario ? 1 : 0.45} fill={`url(#fgrad-${name.replace(/\s+/g, "")})`} dot={false} name={name} />
                        ))}
                      </AreaChart>
                    )}
                  </ResponsiveContainer>

                  {/* Legend */}
                  <div style={{ display: "flex", gap: 16, paddingLeft: 16, marginTop: 8, flexWrap: "wrap" }}>
                    {showMC && mcResults ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, color: t.textVeryFaint, letterSpacing: "0.1em", textTransform: "uppercase", marginRight: 4 }}>Percentiles</span>
                        {[5, 10, 25, 50, 75, 95].map((p) => {
                          const active = mcPercentiles.includes(p);
                          const toggle = () => setMcPercentiles((prev) =>
                            active && prev.length > 1 ? prev.filter((x) => x !== p) : active ? prev : [...prev, p]
                          );
                          return (
                            <button key={p} onClick={toggle} style={{
                              padding: "2px 8px", borderRadius: 20, border: `1px solid ${active ? activeColor : t.border}`,
                              background: active ? `${activeColor}22` : "transparent",
                              color: active ? activeColor : t.textVeryFaint,
                              fontSize: 10, cursor: "pointer", fontFamily: "'DM Mono', monospace",
                              letterSpacing: "0.05em", transition: "all 0.15s",
                            }}>
                              {p === 50 ? "50% (med)" : `${p}%`}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      allFireResults.map(({ name, color }) => (
                        <div key={name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 20, height: 2, background: color, borderRadius: 1, opacity: name === activeUser.activeScenario ? 1 : 0.4 }} />
                          <span style={{ fontSize: 10, color: name === activeUser.activeScenario ? t.textMuted : t.textVeryFaint, letterSpacing: "0.05em" }}>{name}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <div style={{ paddingLeft: 16, paddingRight: 16, marginTop: 16 }}>
                    <Slider label="Max Age" value={maxAge} min={55} max={100} step={1} onChange={setMaxAge} format={(v) => `${v} yrs`} color={t.textMuted} t={t} />
                  </div>
                </div>

                {/* Insight banner */}
                <div style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: 12, padding: "16px 20px", fontSize: 13, color: t.textFaint, fontStyle: "italic", lineHeight: 1.7 }}>
                  {showMC && mcResults ? (
                    <>
                      Based on {mcSimCount.toLocaleString()} simulations using historical S&P 500 returns (1928–2024),{" "}
                      <span style={{ color: successRateColor(mcResults.successRate), fontStyle: "normal", fontWeight: 700 }}>{Math.round(mcResults.successRate * 100)}%</span>{" "}
                      of retirement paths succeeded without depleting the portfolio.{" "}
                      {mcResults.successRate >= 0.9 ? "Your plan is historically robust." : mcResults.successRate >= 0.75 ? "Consider increasing savings or reducing spending to improve resilience." : "Your plan may be underfunded — consider a higher savings rate or later retirement age."}
                      {" "}The shaded bands show the 5th–95th percentile range across all simulations. The{" "}
                      <span style={{ color: t.accent, fontStyle: "normal" }}>Portfolio Growth</span> slider is not used in Monte Carlo mode — historical returns replace it.
                    </>
                  ) : fireAge ? (
                    <>At your current trajectory, you'll reach your FIRE number of <span style={{ color: t.accent, fontStyle: "normal", fontWeight: 700 }}>{fmt(fireNumber)}</span> at age <span style={{ color: t.accent, fontStyle: "normal", fontWeight: 700 }}>{fireAge}</span>{yearsToFire > 0 ? ` — ${yearsToFire} years from now` : " (you're already there!)"}{runway === "∞" ? ". Your portfolio is projected to last indefinitely." : ruinAge ? `. Your portfolio would be depleted around age ${ruinAge} — consider reducing spending or increasing your savings rate.` : "."}</>
                  ) : (
                    <>Based on these inputs, your FIRE number of <span style={{ color: t.accent, fontStyle: "normal", fontWeight: 700 }}>{fmt(fireNumber)}</span> is not reached within this forecast window. Try increasing your growth rate or reducing annual spending.</>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
