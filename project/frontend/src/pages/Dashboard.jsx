// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../services/AuthContext";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { campaignAPI, orgAPI, donationAPI } from "../services/api";
import toast from "react-hot-toast";

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "admin")     return <AdminDash user={user} />;
  if (user.role === "org_admin") return <OrgDash   user={user} />;
  return <DonorDash user={user} />;
}

/* ─── Donor Dashboard ─────────────────────────────────────────────────────── */
function DonorDash({ user }) {
  const { publicKey, connected } = useWallet();
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats]         = useState(null);
  const [topDonors, setTopDonors] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    campaignAPI.list().then(r => setCampaigns((r.data.campaigns || []).slice(0, 6))).catch(() => {});
    campaignAPI.stats().then(r => setStats(r.data)).catch(() => {});
    donationAPI.topDonors().then(r => setTopDonors(r.data || [])).catch(() => {});
    donationAPI.chart().then(r => setChartData(r.data || [])).catch(() => {});
  }, []);

  return (
    <div style={{ padding:"40px 0", background:"var(--cream)", minHeight:"100vh" }}>
      <div className="container">

        <div className="fade-up" style={{ marginBottom:32 }}>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:28, fontWeight:800 }}>
            Welcome back, {user.username} 👋
          </h1>
          <p style={{ color:"var(--stone)", marginTop:4 }}>
            Make a difference today with transparent blockchain donations.
          </p>
        </div>

        {/* Wallet card */}
        <div className="card" style={{
          padding:24, marginBottom:28,
          background:"linear-gradient(135deg,var(--ink),var(--ink-soft))",
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
            <div>
              <div style={{ color:"rgba(255,255,255,.6)", fontSize:13, marginBottom:4 }}>Phantom Wallet</div>
              {connected && publicKey ? (
                <div style={{ color:"#fff", fontFamily:"monospace", fontSize:14, fontWeight:600 }}>
                  {publicKey.toBase58().slice(0, 16)}…
                </div>
              ) : (
                <div style={{ color:"rgba(255,255,255,.5)", fontSize:14 }}>Not connected</div>
              )}
            </div>
            <WalletMultiButton />
          </div>
        </div>

        {/* Platform stats */}
        {stats && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:16, marginBottom:32 }}>
            {[
              { v: stats.total_campaigns,                              l: "Campaigns",     c:"var(--crimson)" },
              { v: `${parseFloat(stats.total_donated||0).toFixed(2)}`, l: "SOL Raised",   c:"var(--saffron)" },
              { v: stats.total_donors,                                 l: "Donors",        c:"var(--info)" },
              { v: stats.total_organizations,                          l: "Verified Orgs", c:"var(--success)" },
            ].map(s => (
              <div key={s.l} className="card" style={{ padding:20 }}>
                <div style={{ fontFamily:"var(--font-display)", fontSize:26, fontWeight:800, color:s.c }}>
                  {s.v}
                </div>
                <div style={{ fontSize:12, color:"var(--stone)", marginTop:4 }}>{s.l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Quick links */}
        <div style={{ display:"flex", gap:10, marginBottom:28, flexWrap:"wrap" }}>
          <Link to="/history" className="btn btn-secondary btn-sm">📋 My Donations</Link>
          <Link to="/profile" className="btn btn-secondary btn-sm">👤 My Profile</Link>
          <Link to="/campaigns" className="btn btn-secondary btn-sm">🔍 All Campaigns</Link>
        </div>

        {/* Campaigns */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:700 }}>Open Campaigns</h2>
          <Link to="/campaigns" className="btn btn-secondary btn-sm">View All</Link>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:20, marginBottom:40 }}>
          {campaigns.map(c => {
            const pct = (c.goal_amount > 0)
              ? Math.min(100, Math.round((c.raised_amount / c.goal_amount) * 100))
              : 0;
            return (
              <div key={c.id} className="card" style={{ overflow:"hidden" }}>
                <div style={{ padding:20 }}>
                  <div style={{ fontSize:13, color:"var(--stone)", marginBottom:4 }}>{c.organization_name}</div>
                  <h3 style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:15, marginBottom:12,
                    display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                    {c.title}
                  </h3>
                  <div className="progress-bar" style={{ marginBottom:8 }}>
                    <div className="progress-fill" style={{ width:`${pct}%` }} />
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--stone)" }}>
                    <span style={{ color:"var(--crimson)", fontWeight:700 }}>
                      {(+c.raised_amount).toFixed(3)} SOL
                    </span>
                    <span>{pct}% of {c.goal_amount} SOL</span>
                  </div>
                </div>
                <div style={{ padding:"12px 20px", borderTop:"1px solid #EDE8E3", display:"flex", gap:8 }}>
                  <Link to={`/campaigns/${c.id}`}        className="btn btn-ghost btn-sm"   style={{ flex:1, justifyContent:"center" }}>Details</Link>
                  <Link to={`/campaigns/${c.id}/donate`} className="btn btn-primary btn-sm" style={{ flex:1, justifyContent:"center" }}>Donate</Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top Donors */}
        {topDonors.length > 0 && (
          <div style={{ marginBottom:40 }}>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:700, marginBottom:16 }}>
              🏆 Top Donors
            </h2>
            <div className="card" style={{ overflow:"hidden" }}>
              {topDonors.map((d, i) => (
                <div key={i} style={{
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"14px 20px",
                  borderBottom: i < topDonors.length - 1 ? "1px solid #EDE8E3" : "none",
                  background: i === 0 ? "rgba(241,196,15,.06)" : "var(--white)",
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{
                      width:32, height:32, borderRadius:"50%", flexShrink:0,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontFamily:"var(--font-display)", fontWeight:800, fontSize:14,
                      background: i === 0 ? "#F1C40F" : i === 1 ? "#BDC3C7" : i === 2 ? "#CD7F32" : "var(--cream)",
                      color: i < 3 ? "#fff" : "var(--stone)",
                    }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, fontFamily:"monospace" }}>
                        {(d.donor_wallet || "").slice(0, 12)}…
                      </div>
                      <div style={{ fontSize:11, color:"var(--stone)" }}>
                        {d.total_donations} donation{d.total_donations !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontFamily:"var(--font-display)", fontWeight:800,
                    color:"var(--crimson)", fontSize:16 }}>
                    {parseFloat(d.total_sol || 0).toFixed(4)} SOL
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Donations Chart */}
        {chartData.length > 0 && (
          <div>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:700, marginBottom:16 }}>
              📊 Donations — Last 7 Days
            </h2>
            <div className="card" style={{ padding:24 }}>
              {(() => {
                const maxSol = Math.max(...chartData.map(x => parseFloat(x.total_sol || 0)));
                return (
                  <div style={{ display:"flex", alignItems:"flex-end",
                    gap:8, height:120 }}>
                    {chartData.map((d, i) => {
                      const h = maxSol > 0
                        ? Math.max(8, (parseFloat(d.total_sol || 0) / maxSol) * 100)
                        : 8;
                      return (
                        <div key={i} style={{ flex:1, display:"flex",
                          flexDirection:"column", alignItems:"center", gap:4 }}>
                          <div style={{ fontSize:11, color:"var(--crimson)", fontWeight:700 }}>
                            {parseFloat(d.total_sol || 0).toFixed(3)}
                          </div>
                          <div style={{
                            width:"100%", height:`${h}px`,
                            background:"linear-gradient(to top,var(--crimson),var(--saffron))",
                            borderRadius:"4px 4px 0 0",
                            transition:"height .4s ease",
                          }} />
                          <div style={{ fontSize:10, color:"var(--stone)", textAlign:"center" }}>
                            {new Date(d.date + "T00:00:00").toLocaleDateString("en",
                              { month:"short", day:"numeric" })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ─── Org Admin Dashboard ─────────────────────────────────────────────────── */
function OrgDash({ user }) {
  const navigate = useNavigate();
  const [org, setOrg]             = useState(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [showForm, setShowForm]   = useState(false);

  useEffect(() => {
    orgAPI.mine()
      .then(r => setOrg(r.data))
      .catch(err => { if (err.response?.status !== 404) console.error(err); })
      .finally(() => setOrgLoading(false));
    campaignAPI.list({ mine: "true" })
      .then(r => setCampaigns(r.data.campaigns || []))
      .catch(() => {});
  }, []);

  if (orgLoading) return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", minHeight:"60vh" }}>
      <div className="pulse" style={{ width:40, height:40, borderRadius:"50%", background:"var(--crimson)" }} />
    </div>
  );

  return (
    <div style={{ padding:"40px 0", background:"var(--cream)", minHeight:"100vh" }}>
      <div className="container">
        <div className="fade-up" style={{ marginBottom:32 }}>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:28, fontWeight:800 }}>
            Organization Dashboard
          </h1>
          <p style={{ color:"var(--stone)", marginTop:4 }}>{user.username}</p>
        </div>

        {!org ? (
          <div className="card" style={{ padding:40, textAlign:"center", marginBottom:28 }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🏢</div>
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:700, marginBottom:8 }}>
              Register Your Organization
            </h3>
            <p style={{ color:"var(--stone)", marginBottom:20 }}>
              You need a verified organization profile before you can create campaigns.
            </p>
            <button className="btn btn-primary" onClick={() => navigate("/org/register")}>
              Register Organization →
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding:24, marginBottom:28 }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"flex-start", flexWrap:"wrap", gap:16 }}>
              <div>
                <h3 style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:18 }}>
                  {org.name}
                </h3>
                <p style={{ fontSize:13, color:"var(--stone)", marginTop:4 }}>
                  {[org.district, org.province].filter(Boolean).join(", ")}
                </p>
              </div>
              <span className={{
                verified:"badge badge-green",
                pending:"badge badge-yellow",
                rejected:"badge badge-red",
              }[org.verification_status] || "badge badge-gray"}>
                {org.verification_status}
              </span>
            </div>
            {org.verification_status === "pending" && (
              <div style={{ marginTop:12, padding:12, borderRadius:10,
                background:"#FEF3CD", fontSize:13, color:"#7D5A00" }}>
                ⏳ Awaiting admin verification. You can create campaigns once approved.
              </div>
            )}
            {org.verification_status === "rejected" && org.rejection_reason && (
              <div style={{ marginTop:12, padding:12, borderRadius:10,
                background:"#FDDBD8", fontSize:13, color:"var(--danger)" }}>
                ❌ Rejected: {org.rejection_reason}
              </div>
            )}
          </div>
        )}

        {org?.verification_status === "verified" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:700 }}>
                My Campaigns
              </h2>
              <button className="btn btn-primary btn-sm"
                onClick={() => setShowForm(v => !v)}>
                {showForm ? "✕ Cancel" : "+ New Campaign"}
              </button>
            </div>

            {showForm && (
              <CreateCampaignForm
                org={org}
                onCreated={c => {
                  setCampaigns(prev => [c, ...prev]);
                  setShowForm(false);
                  toast.success("Campaign created!");
                }}
              />
            )}

            {campaigns.length === 0 && !showForm ? (
              <div style={{ textAlign:"center", padding:48, color:"var(--stone)" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
                <p>No campaigns yet. Create your first one!</p>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {campaigns.map(c => {
                  const pct = (c.goal_amount > 0)
                    ? Math.min(100, Math.round((c.raised_amount / c.goal_amount) * 100))
                    : 0;
                  return (
                    <div key={c.id} className="card" style={{ padding:20 }}>
                      <div style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"flex-start", gap:16, flexWrap:"wrap" }}>
                        <div style={{ flex:1 }}>
                          <h3 style={{ fontFamily:"var(--font-display)", fontWeight:700, marginBottom:6 }}>
                            {c.title}
                          </h3>
                          <div style={{ display:"flex", gap:8 }}>
                            <span className="badge badge-gray" style={{ textTransform:"capitalize" }}>
                              {c.category}
                            </span>
                            <span className={c.is_active ? "badge badge-green" : "badge badge-red"}>
                              {c.is_active ? "Active" : "Paused"}
                            </span>
                          </div>
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          <div style={{ fontFamily:"var(--font-display)", fontSize:20,
                            fontWeight:800, color:"var(--crimson)" }}>
                            {(+c.raised_amount).toFixed(3)} SOL
                          </div>
                          <div style={{ fontSize:12, color:"var(--stone)" }}>
                            {pct}% of {c.goal_amount} SOL
                          </div>
                        </div>
                      </div>
                      <div className="progress-bar" style={{ marginTop:12, marginBottom:12 }}>
                        <div className="progress-fill" style={{ width:`${Math.min(100,pct)}%` }} />
                      </div>
                      <Link to={`/campaigns/${c.id}`} className="btn btn-ghost btn-sm">
                        View Campaign →
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Create Campaign Form ────────────────────────────────────────────────── */
function CreateCampaignForm({ org, onCreated }) {
  const [form, setForm] = useState({
    title:"", description:"", category:"education",
    goal_amount:"", start_date:"", end_date:"",
    district:"", province:"",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    const goal = parseFloat(form.goal_amount);
    if (isNaN(goal) || goal <= 0) { toast.error("Goal must be a positive number"); return; }
    setSaving(true);
    try {
      const { data } = await campaignAPI.create({
        ...form, organization_id: org.id, goal_amount: goal,
      });
      onCreated(data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create campaign");
    } finally { setSaving(false); }
  };

  return (
    <div className="card" style={{ padding:28, marginBottom:24 }}>
      <h3 style={{ fontFamily:"var(--font-display)", fontWeight:700, marginBottom:20 }}>New Campaign</h3>
      <form onSubmit={handleSubmit} style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div className="form-group" style={{ gridColumn:"1/-1" }}>
          <label className="form-label">Campaign Title *</label>
          <input className="form-input" name="title" value={form.title} onChange={handleChange} required />
        </div>
        <div className="form-group" style={{ gridColumn:"1/-1" }}>
          <label className="form-label">Description *</label>
          <textarea className="form-input" name="description" value={form.description}
            onChange={handleChange} required rows={3} />
        </div>
        <div className="form-group">
          <label className="form-label">Category *</label>
          <select className="form-input" name="category" value={form.category} onChange={handleChange}>
            {["education","health","disaster_relief","environment","community","animals","other"].map(c => (
              <option key={c} value={c}>{c.replace("_"," ")}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Goal (SOL) *</label>
          <input className="form-input" type="number" name="goal_amount"
            value={form.goal_amount} onChange={handleChange} min="0.1" step="0.1" required />
        </div>
        <div className="form-group">
          <label className="form-label">Start Date *</label>
          <input className="form-input" type="date" name="start_date"
            value={form.start_date} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label className="form-label">End Date *</label>
          <input className="form-input" type="date" name="end_date"
            value={form.end_date} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label className="form-label">District</label>
          <input className="form-input" name="district" value={form.district} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label className="form-label">Province</label>
          <select className="form-input" name="province" value={form.province} onChange={handleChange}>
            <option value="">Select province</option>
            {["Koshi","Madhesh","Bagmati","Gandaki","Lumbini","Karnali","Sudurpashchim"].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div style={{ gridColumn:"1/-1" }}>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create Campaign"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── Admin Dashboard ─────────────────────────────────────────────────────── */
function AdminDash({ user }) {
  return (
    <div style={{ padding:"40px 0", background:"var(--cream)", minHeight:"100vh" }}>
      <div className="container">
        <div className="fade-up" style={{ marginBottom:32 }}>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:28, fontWeight:800 }}>
            Admin Dashboard
          </h1>
          <p style={{ color:"var(--stone)" }}>Welcome, {user.username}. Manage the NepalDaan platform.</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16 }}>
          {[
            { label:"Full Admin Panel", link:"/admin",     icon:"🛠️", desc:"Verify orgs, manage campaigns" },
            { label:"View Campaigns",   link:"/campaigns", icon:"📋", desc:"Browse all campaigns" },
          ].map(c => (
            <Link key={c.label} to={c.link} className="card"
              style={{ padding:28, textDecoration:"none", transition:"transform .2s, box-shadow .2s" }}
              onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="var(--shadow-lg)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}>
              <div style={{ fontSize:36, marginBottom:12 }}>{c.icon}</div>
              <div style={{ fontFamily:"var(--font-display)", fontWeight:700, marginBottom:4 }}>{c.label}</div>
              <div style={{ fontSize:13, color:"var(--stone)" }}>{c.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
