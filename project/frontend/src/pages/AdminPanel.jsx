// src/pages/AdminPanel.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../services/AuthContext";
import { adminAPI } from "../services/api";
import toast from "react-hot-toast";

// ── Colour tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:      "#0F1117",
  sidebar: "#161820",
  card:    "#1E2028",
  border:  "rgba(255,255,255,.07)",
  text:    "#F0F0F5",
  muted:   "rgba(240,240,245,.45)",
  crimson: "#E84040",
  saffron: "#F5A623",
  green:   "#2ECC71",
  blue:    "#3B9EFF",
  purple:  "#9B59B6",
};

const TABS = [
  { id:"overview",      icon:"📊", label:"Overview"      },
  { id:"organizations", icon:"🏢", label:"Organizations" },
  { id:"campaigns",     icon:"📋", label:"Campaigns"     },
  { id:"users",         icon:"👥", label:"Users"         },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab]     = useState("overview");
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    if (user.role !== "admin") { navigate("/dashboard"); return; }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    adminAPI.stats()
      .then(r => setStats(r.data))
      .catch(() => toast.error("Failed to load stats"))
      .finally(() => setStatsLoading(false));
  }, [user]);

  if (authLoading) return <Spinner />;
  if (!user || user.role !== "admin") return null;

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"system-ui,sans-serif" }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside style={{
        width:220, flexShrink:0, background:C.sidebar,
        borderRight:`1px solid ${C.border}`,
        display:"flex", flexDirection:"column",
        position:"sticky", top:0, height:"100vh",
      }}>
        {/* Logo */}
        <div style={{ padding:"24px 20px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{
              width:36, height:36, borderRadius:10, flexShrink:0,
              background:`linear-gradient(135deg,${C.crimson},${C.saffron})`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontWeight:900, fontSize:16,
            }}>N</div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, letterSpacing:"-.01em" }}>NepalDaan</div>
              <div style={{ fontSize:11, color:C.muted }}>Admin Panel</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"12px 10px" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              width:"100%", display:"flex", alignItems:"center", gap:10,
              padding:"10px 12px", borderRadius:10, border:"none",
              background: tab === t.id ? `rgba(232,64,64,.15)` : "transparent",
              color: tab === t.id ? C.crimson : C.muted,
              cursor:"pointer", fontSize:14, fontWeight: tab === t.id ? 700 : 500,
              marginBottom:2, transition:"all .2s", textAlign:"left",
            }}>
              <span style={{ fontSize:16 }}>{t.icon}</span>
              {t.label}
              {t.id === "organizations" && stats?.pending_orgs > 0 && (
                <span style={{
                  marginLeft:"auto", background:C.crimson, color:"#fff",
                  borderRadius:100, fontSize:10, fontWeight:800,
                  padding:"1px 7px", minWidth:18, textAlign:"center",
                }}>
                  {stats.pending_orgs}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User info */}
        <div style={{ padding:"16px 20px", borderTop:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{
              width:32, height:32, borderRadius:"50%", flexShrink:0,
              background:`linear-gradient(135deg,${C.purple},${C.blue})`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontWeight:800, fontSize:13,
            }}>
              {(user.username || "A")[0].toUpperCase()}
            </div>
            <div style={{ overflow:"hidden" }}>
              <div style={{ fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {user.username}
              </div>
              <div style={{ fontSize:11, color:C.muted }}>Administrator</div>
            </div>
          </div>
          <Link to="/" style={{
            display:"block", marginTop:12, padding:"7px 12px", borderRadius:8,
            background:"rgba(255,255,255,.06)", color:C.muted,
            fontSize:12, textDecoration:"none", textAlign:"center",
            border:`1px solid ${C.border}`,
          }}>
            ← Back to Site
          </Link>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main style={{ flex:1, overflow:"auto", padding:28 }}>
        {tab === "overview"      && <OverviewTab stats={stats} loading={statsLoading} />}
        {tab === "organizations" && <OrgsTab />}
        {tab === "campaigns"     && <CampsTab />}
        {tab === "users"         && <UsersTab />}
      </main>
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ stats, loading }) {
  if (loading) return (
    <div>
      <PageHeader title="Platform Overview" subtitle="Real-time platform statistics" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:16, marginBottom:28 }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{ height:90, borderRadius:14, background:C.card, animation:"pulse 1.5s infinite" }} />
        ))}
      </div>
    </div>
  );

  if (!stats) return <PageHeader title="Overview" subtitle="Failed to load stats" />;

  const statCards = [
    { label:"Total Users",      value: stats.total_users,         icon:"👤", color:C.blue,    sub:`${stats.total_donors||0} donors` },
    { label:"Organizations",    value: stats.total_organizations, icon:"🏢", color:C.saffron, sub:`${stats.verified_orgs||0} verified` },
    { label:"Campaigns",        value: stats.total_campaigns,     icon:"📋", color:C.purple,  sub:`${stats.active_campaigns||0} active` },
    { label:"Total Donations",  value: stats.total_donations,     icon:"💙", color:C.green,   sub:`avg ${parseFloat(stats.avg_donation||0).toFixed(4)} SOL` },
    { label:"SOL Raised",       value: `${parseFloat(stats.total_sol_raised||0).toFixed(4)}`, icon:"⚡", color:C.crimson, sub:"on Solana devnet" },
    { label:"Pending Reviews",  value: stats.pending_orgs,        icon:"⏳", color: stats.pending_orgs > 0 ? C.saffron : C.green, sub: stats.pending_orgs > 0 ? "needs action" : "all clear" },
  ];

  return (
    <div>
      <PageHeader title="Platform Overview" subtitle="Real-time NepalDaan statistics" />

      {/* Stat cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:16, marginBottom:32 }}>
        {statCards.map(s => (
          <div key={s.label} style={{
            background:C.card, borderRadius:16, padding:20,
            border:`1px solid ${C.border}`, transition:"transform .2s",
          }}
            onMouseEnter={e => e.currentTarget.style.transform="translateY(-2px)"}
            onMouseLeave={e => e.currentTarget.style.transform=""}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <span style={{ fontSize:24 }}>{s.icon}</span>
              <div style={{
                width:8, height:8, borderRadius:"50%",
                background:s.color, boxShadow:`0 0 8px ${s.color}`,
              }} />
            </div>
            <div style={{ fontSize:28, fontWeight:900, color:s.color, letterSpacing:"-.02em", marginBottom:4 }}>
              {s.value}
            </div>
            <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:3 }}>{s.label}</div>
            <div style={{ fontSize:11, color:C.muted }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Trend chart + Activity feed */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:20 }}>

        {/* Monthly trend chart */}
        <div style={{ background:C.card, borderRadius:16, padding:24, border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:20 }}>📈 Monthly Donation Trend</div>
          {(stats.trend || []).length === 0 ? (
            <div style={{ color:C.muted, textAlign:"center", padding:40 }}>No donation data yet</div>
          ) : (
            <div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:10, height:140 }}>
                {(stats.trend || []).map((m, i) => {
                  const maxVal = Math.max(...(stats.trend||[]).map(x => parseFloat(x.total_sol||0)));
                  const h = maxVal > 0
                    ? Math.max(12, (parseFloat(m.total_sol||0) / maxVal) * 120)
                    : 12;
                  return (
                    <div key={i} style={{ flex:1, display:"flex",
                      flexDirection:"column", alignItems:"center", gap:6 }}>
                      <div style={{ fontSize:10, color:C.saffron, fontWeight:700 }}>
                        {parseFloat(m.total_sol||0).toFixed(2)}
                      </div>
                      <div style={{
                        width:"100%", height:`${h}px`,
                        background:`linear-gradient(to top,${C.crimson},${C.saffron})`,
                        borderRadius:"6px 6px 0 0",
                        position:"relative", cursor:"default",
                      }}
                        title={`${m.month}: ${m.total_sol} SOL (${m.count} donations)`}
                      />
                      <div style={{ fontSize:10, color:C.muted, textAlign:"center" }}>
                        {(m.month||"").slice(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop:16, display:"flex", gap:20, fontSize:12, color:C.muted }}>
                <span>Total months: {(stats.trend||[]).length}</span>
                <span>Total raised: {(stats.trend||[]).reduce((a,m) => a + parseFloat(m.total_sol||0), 0).toFixed(4)} SOL</span>
              </div>
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div style={{ background:C.card, borderRadius:16, padding:24, border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>⚡ Recent Activity</div>
          {(stats.recent_activity || []).length === 0 ? (
            <div style={{ color:C.muted, textAlign:"center", padding:32 }}>No donations yet</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {(stats.recent_activity || []).map((a, i) => (
                <div key={i} style={{
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"10px 12px", borderRadius:10,
                  background:"rgba(255,255,255,.04)",
                }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, overflow:"hidden",
                      textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {a.campaign_title || "Campaign"}
                    </div>
                    <div style={{ fontSize:10, color:C.muted, marginTop:2, fontFamily:"monospace" }}>
                      {(a.donor_wallet||"").slice(0,12)}…
                    </div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0, marginLeft:10 }}>
                    <div style={{ fontSize:13, fontWeight:800, color:C.green }}>
                      +{parseFloat(a.amount_sol||0).toFixed(4)}
                    </div>
                    <div style={{ fontSize:10, color:C.muted }}>SOL</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Role distribution */}
      <div style={{ marginTop:20, background:C.card, borderRadius:16,
        padding:24, border:`1px solid ${C.border}` }}>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>👥 User Distribution</div>
        <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
          {[
            { label:"Donors",        value: stats.total_donors||0,     color:C.blue,    pct: stats.total_users > 0 ? Math.round(((stats.total_donors||0)/stats.total_users)*100) : 0 },
            { label:"Org Admins",    value: stats.total_org_admins||0, color:C.saffron, pct: stats.total_users > 0 ? Math.round(((stats.total_org_admins||0)/stats.total_users)*100) : 0 },
            { label:"Administrators",value: (stats.total_users||0) - (stats.total_donors||0) - (stats.total_org_admins||0), color:C.crimson, pct: stats.total_users > 0 ? Math.round((((stats.total_users||0)-(stats.total_donors||0)-(stats.total_org_admins||0))/stats.total_users)*100) : 0 },
          ].map(r => (
            <div key={r.label} style={{ flex:1, minWidth:160 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:8 }}>
                <span style={{ color:C.muted }}>{r.label}</span>
                <span style={{ fontWeight:700, color:r.color }}>{r.value}</span>
              </div>
              <div style={{ height:6, borderRadius:10, background:"rgba(255,255,255,.08)" }}>
                <div style={{
                  height:"100%", borderRadius:10,
                  background:`linear-gradient(to right,${r.color},${r.color}aa)`,
                  width:`${r.pct}%`, transition:"width .6s ease",
                }} />
              </div>
              <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{r.pct}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Organizations Tab ─────────────────────────────────────────────────────────
function OrgsTab() {
  const [orgs, setOrgs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("all");
  const [busy, setBusy]       = useState(false);

  useEffect(() => {
    adminAPI.organizations()
      .then(r => setOrgs(r.data || []))
      .catch(() => toast.error("Failed to load organizations"))
      .finally(() => setLoading(false));
  }, []);

  const handleVerify = async (id, status) => {
    let reason = "";
    if (status === "rejected") {
      reason = window.prompt("Enter rejection reason (optional):") || "";
    }
    setBusy(true);
    try {
      await adminAPI.verifyOrg(id, { verification_status: status, rejection_reason: reason });
      setOrgs(prev => prev.map(o => o.id === id
        ? { ...o, verification_status: status, rejection_reason: reason } : o));
      toast.success(`Organization ${status === "verified" ? "✅ verified" : "❌ rejected"}`);
    } catch {
      toast.error("Failed to update organization");
    } finally { setBusy(false); }
  };

  const filtered = orgs.filter(o => {
    const matchSearch = !search ||
      (o.name||"").toLowerCase().includes(search.toLowerCase()) ||
      (o.username||"").toLowerCase().includes(search.toLowerCase()) ||
      (o.user_email||"").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || o.verification_status === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    all: orgs.length,
    pending:  orgs.filter(o => o.verification_status === "pending").length,
    verified: orgs.filter(o => o.verification_status === "verified").length,
    rejected: orgs.filter(o => o.verification_status === "rejected").length,
  };

  return (
    <div>
      <PageHeader title="Organizations" subtitle={`${orgs.length} registered organizations`} />

      {/* Filter pills */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {[
          { id:"all",      label:`All (${counts.all})`,           color:C.muted },
          { id:"pending",  label:`Pending (${counts.pending})`,   color:C.saffron },
          { id:"verified", label:`Verified (${counts.verified})`, color:C.green },
          { id:"rejected", label:`Rejected (${counts.rejected})`, color:C.crimson },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding:"6px 14px", borderRadius:100, border:"none", cursor:"pointer",
            fontSize:12, fontWeight:600,
            background: filter === f.id ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.04)",
            color: filter === f.id ? C.text : C.muted,
            transition:"all .2s",
          }}>
            {f.label}
          </button>
        ))}
        <SearchBox value={search} onChange={setSearch} placeholder="Search organizations…" />
      </div>

      {loading ? <LoadingSkeleton rows={4} /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {filtered.length === 0 && (
            <EmptyState icon="🏢" message="No organizations found" />
          )}
          {filtered.map(org => (
            <div key={org.id} style={{
              background:C.card, borderRadius:16, padding:20,
              border:`1px solid ${org.verification_status === "pending"
                ? "rgba(245,166,35,.3)" : C.border}`,
              transition:"border-color .2s",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"flex-start", gap:16, flexWrap:"wrap" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                    <div style={{
                      width:40, height:40, borderRadius:12, flexShrink:0,
                      background:`linear-gradient(135deg,${C.crimson}33,${C.saffron}33)`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:18, fontWeight:800,
                    }}>
                      {(org.name||"O")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:16 }}>{org.name}</div>
                      <div style={{ fontSize:12, color:C.muted }}>
                        by {org.username} · {org.user_email}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:16, flexWrap:"wrap", fontSize:12, color:C.muted }}>
                    {org.district  && <span>📍 {org.district}, {org.province}</span>}
                    {org.contact_email && <span>📧 {org.contact_email}</span>}
                    <span>📋 {org.campaign_count||0} campaigns</span>
                    <span>⚡ {parseFloat(org.total_raised||0).toFixed(4)} SOL raised</span>
                  </div>
                  {org.rejection_reason && (
                    <div style={{ marginTop:8, padding:"6px 10px", borderRadius:8,
                      background:"rgba(232,64,64,.12)", color:C.crimson, fontSize:12 }}>
                      Rejection reason: {org.rejection_reason}
                    </div>
                  )}
                </div>

                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                  <StatusBadge status={org.verification_status} />
                  <div style={{ display:"flex", gap:8 }}>
                    {org.verification_status !== "verified" && (
                      <ActionButton
                        label="✓ Verify" color={C.green}
                        onClick={() => handleVerify(org.id, "verified")}
                        disabled={busy} />
                    )}
                    {org.verification_status !== "rejected" && (
                      <ActionButton
                        label="✕ Reject" color={C.crimson}
                        onClick={() => handleVerify(org.id, "rejected")}
                        disabled={busy} />
                    )}
                    {org.verification_status !== "pending" && (
                      <ActionButton
                        label="Reset" color={C.muted}
                        onClick={() => handleVerify(org.id, "pending")}
                        disabled={busy} ghost />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Campaigns Tab ─────────────────────────────────────────────────────────────
function CampsTab() {
  const [camps, setCamps]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("all");
  const [busy, setBusy]       = useState(false);

  useEffect(() => {
    adminAPI.campaigns()
      .then(r => setCamps(r.data || []))
      .catch(err => {
        console.error("Failed to load campaigns:", err.response?.status, err.response?.data || err.message || err);
        toast.error(err.response?.data?.message || "Failed to load campaigns");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (id, currentActive) => {
    setBusy(true);
    try {
      await adminAPI.toggleCampaign(id);
      setCamps(prev => prev.map(c => c.id === id
        ? { ...c, is_active: currentActive ? 0 : 1 } : c));
      toast.success(`Campaign ${currentActive ? "⏸ paused" : "▶️ activated"}`);
    } catch {
      toast.error("Failed to toggle campaign");
    } finally { setBusy(false); }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?\n\nThis will also delete all donations and milestones. This cannot be undone.`)) return;
    setBusy(true);
    try {
      await adminAPI.deleteCampaign(id);
      setCamps(prev => prev.filter(c => c.id !== id));
      toast.success("🗑️ Campaign deleted");
    } catch {
      toast.error("Failed to delete campaign");
    } finally { setBusy(false); }
  };

  const filtered = camps.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (c.title||"").toLowerCase().includes(q) ||
      (c.organization_name||"").toLowerCase().includes(q);
    const matchFilter = filter === "all" ||
      (filter === "active" && c.is_active) ||
      (filter === "paused" && !c.is_active);
    return matchSearch && matchFilter;
  });

  const EMOJI = { education:"🏫", health:"🏥", disaster_relief:"🌊", environment:"🌱", community:"🤝", animals:"🐾" };

  return (
    <div>
      <PageHeader title="Campaigns" subtitle={`${camps.length} total campaigns`} />

      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {[
          { id:"all",    label:`All (${camps.length})` },
          { id:"active", label:`Active (${camps.filter(c=>c.is_active).length})` },
          { id:"paused", label:`Paused (${camps.filter(c=>!c.is_active).length})` },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding:"6px 14px", borderRadius:100, border:"none", cursor:"pointer",
            fontSize:12, fontWeight:600,
            background: filter === f.id ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.04)",
            color: filter === f.id ? C.text : C.muted,
          }}>
            {f.label}
          </button>
        ))}
        <SearchBox value={search} onChange={setSearch} placeholder="Search campaigns…" />
      </div>

      {loading ? <LoadingSkeleton rows={4} /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {filtered.length === 0 && <EmptyState icon="📋" message="No campaigns found" />}
          {filtered.map(c => {
            const pct = c.goal_amount > 0
              ? Math.min(100, Math.round((c.raised_amount / c.goal_amount) * 100))
              : 0;
            const emoji = EMOJI[c.category] || "💙";
            return (
              <div key={c.id} style={{
                background:C.card, borderRadius:16, padding:20,
                border:`1px solid ${C.border}`,
              }}>
                <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap" }}>
                  <div style={{ fontSize:32, flexShrink:0 }}>{emoji}</div>
                  <div style={{ flex:1, minWidth:200 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6, flexWrap:"wrap" }}>
                      <span style={{ fontWeight:700, fontSize:15 }}>{c.title}</span>
                      <StatusBadge status={c.is_active ? "active" : "paused"} />
                    </div>
                    <div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>
                      🏢 {c.organization_name} ·
                      🏷️ {(c.category||"").replace("_"," ")} ·
                      💙 {c.donation_count||0} donations
                    </div>
                    {/* Progress bar */}
                    <div style={{ marginBottom:8 }}>
                      <div style={{ display:"flex", justifyContent:"space-between",
                        fontSize:12, marginBottom:6 }}>
                        <span style={{ color:C.saffron, fontWeight:700 }}>
                          {parseFloat(c.raised_amount||0).toFixed(4)} SOL raised
                        </span>
                        <span style={{ color:C.muted }}>
                          of {c.goal_amount} SOL ({pct}%)
                        </span>
                      </div>
                      <div style={{ height:6, borderRadius:10, background:"rgba(255,255,255,.08)" }}>
                        <div style={{
                          height:"100%", borderRadius:10,
                          background:`linear-gradient(to right,${C.crimson},${C.saffron})`,
                          width:`${pct}%`, transition:"width .6s ease",
                        }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, flexShrink:0, flexWrap:"wrap" }}>
                    <ActionButton
                      label={c.is_active ? "⏸ Pause" : "▶ Activate"}
                      color={c.is_active ? C.saffron : C.green}
                      onClick={() => handleToggle(c.id, c.is_active)}
                      disabled={busy} />
                    <ActionButton
                      label="🗑 Delete" color={C.crimson}
                      onClick={() => handleDelete(c.id, c.title)}
                      disabled={busy} />
                    <Link to={`/campaigns/${c.id}`}
                      style={{
                        padding:"7px 14px", borderRadius:9, fontSize:12,
                        fontWeight:600, background:"rgba(255,255,255,.06)",
                        color:C.muted, border:`1px solid ${C.border}`,
                        textDecoration:"none",
                      }}>
                      View →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("all");
  const [busy, setBusy]       = useState(false);

  useEffect(() => {
    adminAPI.users()
      .then(r => setUsers(r.data || []))
      .catch(err => {
        console.error("Failed to load users:", err.response?.status, err.response?.data || err.message || err);
        toast.error(err.response?.data?.message || "Failed to load users");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (id, role) => {
    setBusy(true);
    try {
      await adminAPI.setRole(id, role);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    } finally { setBusy(false); }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (u.username||"").toLowerCase().includes(q) ||
      (u.email||"").toLowerCase().includes(q);
    const matchFilter = filter === "all" || u.role === filter;
    return matchSearch && matchFilter;
  });

  const roleColors = { donor:"rgba(59,158,255,.2)", org_admin:"rgba(245,166,35,.2)", admin:"rgba(232,64,64,.2)" };
  const roleText   = { donor:C.blue, org_admin:C.saffron, admin:C.crimson };

  return (
    <div>
      <PageHeader title="Users" subtitle={`${users.length} registered users`} />

      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {[
          { id:"all",       label:`All (${users.length})` },
          { id:"donor",     label:`Donors (${users.filter(u=>u.role==="donor").length})` },
          { id:"org_admin", label:`Org Admins (${users.filter(u=>u.role==="org_admin").length})` },
          { id:"admin",     label:`Admins (${users.filter(u=>u.role==="admin").length})` },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding:"6px 14px", borderRadius:100, border:"none", cursor:"pointer",
            fontSize:12, fontWeight:600,
            background: filter === f.id ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.04)",
            color: filter === f.id ? C.text : C.muted,
          }}>
            {f.label}
          </button>
        ))}
        <SearchBox value={search} onChange={setSearch} placeholder="Search users…" />
      </div>

      {loading ? <LoadingSkeleton rows={4} /> : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.length === 0 && <EmptyState icon="👥" message="No users found" />}
          {filtered.map(u => (
            <div key={u.id} style={{
              background:C.card, borderRadius:14, padding:16,
              border:`1px solid ${C.border}`,
              display:"flex", alignItems:"center", gap:16, flexWrap:"wrap",
            }}>
              {/* Avatar */}
              <div style={{
                width:42, height:42, borderRadius:"50%", flexShrink:0,
                background:`linear-gradient(135deg,${roleText[u.role]||C.blue}44,${roleText[u.role]||C.blue}22)`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontWeight:800, fontSize:16, color:roleText[u.role]||C.blue,
              }}>
                {(u.username||"U")[0].toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                  <span style={{ fontWeight:700, fontSize:14 }}>{u.username}</span>
                  <span style={{
                    padding:"2px 8px", borderRadius:100, fontSize:10, fontWeight:700,
                    background: roleColors[u.role] || "rgba(255,255,255,.06)",
                    color: roleText[u.role] || C.muted,
                    textTransform:"uppercase", letterSpacing:".05em",
                  }}>
                    {(u.role||"").replace("_"," ")}
                  </span>
                </div>
                <div style={{ fontSize:12, color:C.muted }}>{u.email}</div>
                {u.wallet_address && (
                  <div style={{ fontSize:11, fontFamily:"monospace", color:C.muted, marginTop:3 }}>
                    🔗 {u.wallet_address.slice(0,16)}…
                  </div>
                )}
              </div>

              {/* Stats */}
              <div style={{ display:"flex", gap:16, fontSize:12, color:C.muted }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontWeight:800, color:C.blue, fontSize:15 }}>{u.donation_count||0}</div>
                  <div>donations</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontWeight:800, color:C.green, fontSize:15 }}>
                    {parseFloat(u.total_donated||0).toFixed(3)}
                  </div>
                  <div>SOL</div>
                </div>
              </div>

              {/* Role select */}
              <select value={u.role||"donor"}
                onChange={e => handleRoleChange(u.id, e.target.value)}
                disabled={busy}
                style={{
                  padding:"7px 12px", borderRadius:9,
                  border:`1px solid ${C.border}`,
                  background:"rgba(255,255,255,.06)", color:C.text,
                  fontSize:12, cursor:"pointer", outline:"none",
                }}>
                <option value="donor">donor</option>
                <option value="org_admin">org_admin</option>
                <option value="admin">admin</option>
              </select>

              {/* Join date */}
              <div style={{ fontSize:11, color:C.muted, flexShrink:0 }}>
                {new Date(u.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Reusable components ───────────────────────────────────────────────────────

function PageHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom:24 }}>
      <h1 style={{ fontSize:24, fontWeight:900, color:C.text,
        letterSpacing:"-.02em", marginBottom:4 }}>
        {title}
      </h1>
      <p style={{ fontSize:13, color:C.muted }}>{subtitle}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    verified: { bg:"rgba(46,204,113,.15)", color:"#2ECC71", label:"✓ Verified" },
    pending:  { bg:"rgba(245,166,35,.15)", color:"#F5A623", label:"⏳ Pending" },
    rejected: { bg:"rgba(232,64,64,.15)",  color:"#E84040", label:"✕ Rejected" },
    active:   { bg:"rgba(46,204,113,.15)", color:"#2ECC71", label:"● Active" },
    paused:   { bg:"rgba(232,64,64,.15)",  color:"#E84040", label:"⏸ Paused" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      padding:"3px 10px", borderRadius:100, fontSize:11, fontWeight:700,
      background:s.bg, color:s.color, whiteSpace:"nowrap",
    }}>
      {s.label}
    </span>
  );
}

function ActionButton({ label, color, onClick, disabled, ghost }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:"7px 14px", borderRadius:9, border: ghost ? `1px solid ${C.border}` : "none",
      background: ghost ? "transparent" : `${color}22`,
      color: ghost ? C.muted : color,
      fontSize:12, fontWeight:700, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1, transition:"all .2s",
      whiteSpace:"nowrap",
    }}>
      {label}
    </button>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div style={{ position:"relative", marginLeft:"auto" }}>
      <span style={{
        position:"absolute", left:10, top:"50%", transform:"translateY(-50%)",
        fontSize:13, pointerEvents:"none", color:C.muted,
      }}>🔍</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          padding:"6px 12px 6px 30px", borderRadius:9,
          border:`1px solid ${C.border}`,
          background:"rgba(255,255,255,.04)", color:C.text,
          fontSize:12, outline:"none", width:220,
        }}
      />
      {value && (
        <button onClick={() => onChange("")} style={{
          position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
          background:"none", border:"none", color:C.muted,
          cursor:"pointer", fontSize:14, padding:0,
        }}>✕</button>
      )}
    </div>
  );
}

function LoadingSkeleton({ rows = 3 }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {Array.from({ length:rows }).map((_, i) => (
        <div key={i} style={{
          height:80, borderRadius:16, background:C.card,
          border:`1px solid ${C.border}`,
          animation:"pulse 1.5s ease-in-out infinite",
          opacity: 1 - i * 0.15,
        }} />
      ))}
    </div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div style={{ textAlign:"center", padding:"60px 0", color:C.muted }}>
      <div style={{ fontSize:48, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:15, fontWeight:600 }}>{message}</div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center",
      minHeight:"100vh", background:C.bg }}>
      <div style={{
        width:40, height:40, borderRadius:"50%",
        border:`3px solid ${C.border}`,
        borderTopColor:C.crimson,
        animation:"spin 0.8s linear infinite",
      }} />
    </div>
  );
}
