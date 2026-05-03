import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, AlertTriangle, CheckCircle2, Clock, TrendingUp,
  Eye, Zap, Lock, Users, Activity, ChevronUp, ChevronDown,
} from 'lucide-react';

/* ── Deterministic pseudo-random (no Math.random in render) ─────────────── */
function seededRand(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

/* ── Types ────────────────────────────────────────────────────────────────── */
interface FeedItem {
  id: number;
  type: 'check' | 'alert' | 'review' | 'login' | 'escalation';
  label: string;
  sub: string;
  status: 'clear' | 'alert' | 'pending' | 'info';
  ts: string;
}

const FEED_POOL: Omit<FeedItem, 'id' | 'ts'>[] = [
  { type: 'check', label: 'PEP Screen — Nguyen T.', sub: 'AUSTRAC watch list', status: 'clear' },
  { type: 'alert', label: 'Unusual Transfer Pattern', sub: 'Brisbane RE Group', status: 'alert' },
  { type: 'review', label: 'Annual CDD Review', sub: 'Pacific Legal LLC', status: 'pending' },
  { type: 'check', label: 'Sanctions Check — Smith J.', sub: 'OFAC / UN lists', status: 'clear' },
  { type: 'login', label: 'Admin login detected', sub: 'New device — Sydney', status: 'info' },
  { type: 'escalation', label: 'SMR Escalation #E-0041', sub: 'Threshold exceeded', status: 'alert' },
  { type: 'check', label: 'Identity Verify — Chen W.', sub: 'DVS + biometric', status: 'clear' },
  { type: 'review', label: 'Risk Score Updated', sub: 'Tier 2 → Tier 3', status: 'alert' },
  { type: 'check', label: 'Adverse Media — Kowalski', sub: 'Global media scan', status: 'clear' },
  { type: 'alert', label: 'Geographic Risk Flag', sub: 'High-risk jurisdiction', status: 'alert' },
];

const STATUS_ICON = {
  clear: <CheckCircle2 className="h-3 w-3 text-green-400" />,
  alert: <AlertTriangle className="h-3 w-3 text-amber-400" />,
  pending: <Clock className="h-3 w-3 text-indigo-400" />,
  info: <Eye className="h-3 w-3 text-blue-400" />,
};

const STATUS_DOT = {
  clear: 'bg-green-400',
  alert: 'bg-amber-400',
  pending: 'bg-indigo-400',
  info: 'bg-blue-400',
};

/* ── Mini Gauge ───────────────────────────────────────────────────────────── */
function RiskGauge({ value }: { value: number }) {
  const angle = -135 + (value / 100) * 270;
  const color = value < 35 ? '#22c55e' : value < 65 ? '#f59e0b' : value < 85 ? '#f97316' : '#ef4444';
  const label = value < 35 ? 'LOW' : value < 65 ? 'MEDIUM' : value < 85 ? 'HIGH' : 'CRITICAL';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-20 overflow-hidden">
        <svg viewBox="0 0 120 80" className="w-full h-full">
          <path d="M 10 70 A 50 50 0 0 1 110 70" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" strokeLinecap="round" />
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const a = (-135 + t * 270) * (Math.PI / 180);
            const r = 50, cx = 60, cy = 70;
            const x = cx + r * Math.cos(a);
            const y = cy + r * Math.sin(a);
            return <circle key={i} cx={x} cy={y} r="1.5" fill="rgba(255,255,255,0.15)" />;
          })}
          <path d="M 10 70 A 50 50 0 0 1 110 70"
            fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${(value / 100) * 157} 157`}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
          <g transform={`translate(60,70) rotate(${angle})`}>
            <line x1="0" y1="0" x2="0" y2="-38" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
            <circle cx="0" cy="0" r="4" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
          </g>
          <text x="60" y="66" textAnchor="middle" fontSize="13" fontWeight="700" fill="white">{value}</text>
        </svg>
      </div>
      <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color }}>{label} RISK</span>
    </div>
  );
}

/* ── Node Map ─────────────────────────────────────────────────────────────── */
const NODES = [
  { id: 0, x: 50,  y: 50,  label: 'Core',     color: '#6366f1', size: 16 },
  { id: 1, x: 150, y: 20,  label: 'CDD',      color: '#8b5cf6', size: 11 },
  { id: 2, x: 160, y: 80,  label: 'PEP',      color: '#22c55e', size: 11 },
  { id: 3, x: 90,  y: 105, label: 'AML',      color: '#f59e0b', size: 11 },
  { id: 4, x: 20,  y: 100, label: 'SMR',      color: '#ef4444', size: 10 },
  { id: 5, x: -10, y: 40,  label: 'Audit',    color: '#06b6d4', size: 10 },
  { id: 6, x: 195, y: 48,  label: 'Screen',   color: '#a78bfa', size: 10 },
];

const EDGES = [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,6],[2,3]];

function NodeMap() {
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPulse(p => (p + 1) % NODES.length), 1200);
    return () => clearInterval(t);
  }, []);

  return (
    <svg viewBox="-25 5 240 115" className="w-full h-full">
      {EDGES.map(([a,b],i) => (
        <line key={i}
          x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y}
          stroke="rgba(99,102,241,0.25)" strokeWidth="1"
          strokeDasharray="3 3"
        />
      ))}
      {NODES.map(n => (
        <g key={n.id}>
          {pulse === n.id && (
            <circle cx={n.x} cy={n.y} r={n.size * 1.8}
              fill="none" stroke={n.color} strokeWidth="1" opacity="0.4">
              <animate attributeName="r" from={n.size} to={n.size * 2.5} dur="1s" repeatCount="1" />
              <animate attributeName="opacity" from="0.5" to="0" dur="1s" repeatCount="1" />
            </circle>
          )}
          <circle cx={n.x} cy={n.y} r={n.size}
            fill={`${n.color}22`} stroke={n.color} strokeWidth="1.5"
            style={{ filter: pulse === n.id ? `drop-shadow(0 0 6px ${n.color})` : 'none' }}
          />
          <text x={n.x} y={n.y + 0.5} textAnchor="middle" dominantBaseline="middle"
            fontSize="6" fill={n.color} fontWeight="600">
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ── Animated Counter ─────────────────────────────────────────────────────── */
function AnimCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setVal(Math.round(p * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return <>{val}</>;
}

/* ── Main Component ───────────────────────────────────────────────────────── */
export default function ComplianceCommandCenter() {
  const [feed, setFeed] = useState<FeedItem[]>(() =>
    FEED_POOL.slice(0, 5).map((f, i) => ({
      ...f, id: i,
      ts: `${String(Math.floor(seededRand(i) * 12) + 1).padStart(2,'0')}:${String(Math.floor(seededRand(i+10)*59)).padStart(2,'0')}`,
    }))
  );
  const counterRef = useRef(0);
  const [riskVal, setRiskVal] = useState(42);

  useEffect(() => {
    const t = setInterval(() => {
      const idx = Math.floor(Date.now() / 100) % FEED_POOL.length;
      const now = new Date();
      const newItem: FeedItem = {
        ...FEED_POOL[idx],
        id: ++counterRef.current + 100,
        ts: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
      };
      setFeed(prev => [newItem, ...prev].slice(0, 7));
    }, 2800);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setRiskVal(v => {
        const delta = (Math.random() - 0.48) * 5;
        return Math.max(18, Math.min(82, Math.round(v + delta)));
      });
    }, 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none" style={{ perspective: '1200px' }}>

      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.6) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="absolute bottom-1/4 right-1/3 w-48 h-48 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      {/* ── Grid ── */}
      <motion.div
        initial={{ opacity: 0, rotateX: 12 }}
        animate={{ opacity: 1, rotateX: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="relative w-full max-w-lg"
      >

        {/* ─── Top bar ─── */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-3 flex items-center justify-between rounded-xl px-4 py-2.5"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
        >
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-semibold text-white/80 tracking-wide">Integrity Solve — Compliance Command</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-green-400 font-semibold">LIVE</span>
          </div>
        </motion.div>

        {/* ─── Row 1: Stats ─── */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { icon: Users,    label: 'Customers',  val: 847,  sub: '+12 today',   color: '#6366f1', up: true },
            { icon: Shield,   label: 'Checks/mo',  val: 3240, sub: '99.2% clear', color: '#22c55e', up: true },
            { icon: Zap,      label: 'Alerts',      val: 7,    sub: '2 critical',  color: '#f59e0b', up: false },
            { icon: Activity, label: 'Reviews',     val: 23,   sub: '4 overdue',   color: '#8b5cf6', up: false },
          ].map((s, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              className="rounded-xl p-3 flex flex-col gap-1"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <s.icon className="h-3.5 w-3.5" style={{ color: s.color }} />
              <div className="text-base font-bold text-white tabular-nums leading-none">
                <AnimCounter target={s.val} duration={900 + i * 150} />
              </div>
              <div className="text-[9px] text-white/40 leading-tight">{s.label}</div>
              <div className={`flex items-center gap-0.5 text-[9px] font-medium ${s.up ? 'text-green-400' : 'text-amber-400'}`}>
                {s.up ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                {s.sub}
              </div>
            </motion.div>
          ))}
        </div>

        {/* ─── Row 2: Feed + gauge + nodes ─── */}
        <div className="grid grid-cols-5 gap-2 mb-3">

          {/* Live feed (3 cols) */}
          <motion.div
            initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="col-span-3 rounded-xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-[10px] font-semibold text-white/60 uppercase tracking-widest">Live Feed</span>
              <span className="text-[9px] text-indigo-400 font-medium">{feed.length} events</span>
            </div>
            <div className="p-1.5 space-y-0.5" style={{ minHeight: 110 }}>
              <AnimatePresence initial={false}>
                {feed.slice(0, 5).map((item) => (
                  <motion.div key={item.id}
                    initial={{ opacity: 0, x: -8, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                    style={{ background: item.status === 'alert' ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.02)' }}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[item.status]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-medium text-white/80 truncate">{item.label}</div>
                      <div className="text-[9px] text-white/35 truncate">{item.sub}</div>
                    </div>
                    {STATUS_ICON[item.status]}
                    <span className="text-[8px] text-white/25 flex-shrink-0">{item.ts}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Right col: gauge + lock */}
          <div className="col-span-2 flex flex-col gap-2">
            {/* Gauge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="rounded-xl p-3 flex flex-col items-center justify-center flex-1"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="text-[9px] text-white/40 uppercase tracking-widest mb-1 font-semibold">Risk Score</div>
              <RiskGauge value={riskVal} />
            </motion.div>

            {/* Compliance badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="rounded-xl px-3 py-2 flex items-center gap-2"
              style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}
            >
              <Lock className="h-3 w-3 text-green-400 flex-shrink-0" />
              <div>
                <div className="text-[9px] font-bold text-green-400">AUSTRAC READY</div>
                <div className="text-[8px] text-white/30">Audit trail active</div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ─── Row 3: Node map + SMR bar ─── */}
        <div className="grid grid-cols-5 gap-2">

          {/* Node map (3 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="col-span-3 rounded-xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', height: 100 }}
          >
            <div className="px-3 pt-2 text-[9px] font-semibold text-white/40 uppercase tracking-widest">Entity Network</div>
            <div style={{ height: 80 }}>
              <NodeMap />
            </div>
          </motion.div>

          {/* SMR pipeline (2 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="col-span-2 rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="text-[9px] font-semibold text-white/40 uppercase tracking-widest mb-2">SMR Pipeline</div>
            {[
              { label: 'Detected', val: 12, max: 12, color: '#ef4444' },
              { label: 'Reviewed', val: 9,  max: 12, color: '#f59e0b' },
              { label: 'Filed',    val: 7,  max: 12, color: '#6366f1' },
            ].map((row, i) => (
              <div key={i} className="mb-1.5">
                <div className="flex justify-between text-[9px] text-white/40 mb-0.5">
                  <span>{row.label}</span><span>{row.val}</span>
                </div>
                <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <motion.div className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(row.val / row.max) * 100}%` }}
                    transition={{ delay: 0.7 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                    style={{ background: row.color, boxShadow: `0 0 6px ${row.color}` }}
                  />
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ─── Bottom bar ─── */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="mt-3 flex items-center justify-between px-4 py-2 rounded-xl text-[9px] text-white/25"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-400" />All systems operational</span>
            <span>•</span>
            <span>28 API endpoints healthy</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-2.5 w-2.5 text-indigo-400" />
            <span className="text-indigo-400">AML/CTF Act 2006 compliant</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
