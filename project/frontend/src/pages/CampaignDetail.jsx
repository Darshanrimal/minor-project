// src/pages/CampaignDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../services/AuthContext";
import { campaignAPI } from "../services/api";

const EMOJI = {
  education:"🏫", health:"🏥", disaster_relief:"🌊",
  environment:"🌱", community:"🤝", animals:"🐾",
};

export default function CampaignDetail() {
  const { id }           = useParams();
  const { user }         = useAuth();
  const navigate         = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("about");

  useEffect(() => {
    campaignAPI.get(id)
      .then(r => setData(r.data))
      .catch(() => navigate("/campaigns", { replace: true }))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", minHeight:"60vh" }}>
      <div className="pulse" style={{ width:40, height:40, borderRadius:"50%", background:"var(--crimson)" }} />
    </div>
  );

  if (!data) return null;

  const pct = data.goal_amount > 0
    ? Math.min(100, Math.round((data.raised_amount / data.goal_amount) * 100))
    : 0;

  const emoji = EMOJI[data.category] || "💙";
  const tabs  = ["about", "milestones", "donations"];

  return (
    <div style={{ background:"var(--cream)", minHeight:"100vh", paddingBottom:80 }}>
      {/* Hero banner */}
      <div style={{
        background:"linear-gradient(135deg,var(--ink),var(--ink-soft))",
        padding:"48px 0 120px",
      }}>
        <div className="container fade-up">
          <Link to="/campaigns" style={{
            color:"rgba(255,255,255,.5)", fontSize:13,
            display:"inline-flex", alignItems:"center", gap:6,
            marginBottom:24, textDecoration:"none",
          }}>
            ← Back to Campaigns
          </Link>

          <div style={{ display:"flex", gap:24, alignItems:"flex-start", flexWrap:"wrap" }}>
            <div style={{ fontSize:64, flexShrink:0 }}>{emoji}</div>
            <div style={{ flex:1, minWidth:260 }}>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
                <span className="badge badge-gray" style={{ textTransform:"capitalize" }}>
                  {data.category?.replace("_", " ")}
                </span>
                {data.province && <span className="badge badge-blue">{data.province}</span>}
                {data.is_active
                  ? <span className="badge badge-green">Active</span>
                  : <span className="badge badge-red">Inactive</span>}
              </div>
              <h1 style={{
                fontFamily:"var(--font-display)",
                fontSize:"clamp(22px,4vw,36px)",
                fontWeight:800, color:"#fff", lineHeight:1.2, marginBottom:12,
              }}>
                {data.title}
              </h1>
              <p style={{ color:"rgba(255,255,255,.6)", fontSize:15 }}>
                by <strong style={{ color:"rgba(255,255,255,.85)" }}>{data.organization_name}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container" style={{ marginTop:-72 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:24, alignItems:"start" }}>

          {/* Left — Tabs */}
          <div>
            <div className="card" style={{ overflow:"hidden", marginBottom:24 }}>
              {/* Tab navigation */}
              <div style={{ display:"flex", borderBottom:"1px solid #EDE8E3" }}>
                {tabs.map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      flex:1, padding:"14px 0", border:"none",
                      background:"none", cursor:"pointer",
                      fontFamily:"var(--font-display)", fontSize:14, fontWeight:600,
                      color: tab === t ? "var(--crimson)" : "var(--stone)",
                      borderBottom: tab === t ? "2px solid var(--crimson)" : "2px solid transparent",
                      transition:"all .2s", textTransform:"capitalize",
                    }}
                  >
                    {t}
                    {t === "donations" && data.recent_donations?.length > 0
                      ? ` (${data.recent_donations.length})`
                      : ""}
                  </button>
                ))}
              </div>

              <div style={{ padding:24 }}>
                {/* About tab */}
                {tab === "about" && (
                  <div>
                    <p style={{ lineHeight:1.9, color:"var(--ink-soft)", whiteSpace:"pre-wrap" }}>
                      {data.description}
                    </p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:24 }}>
                      {[
                        ["District",   data.district  || "—"],
                        ["Province",   data.province  || "—"],
                        ["Start Date", data.start_date ? new Date(data.start_date).toLocaleDateString() : "—"],
                        ["End Date",   data.end_date   ? new Date(data.end_date).toLocaleDateString()   : "—"],
                      ].map(([k, v]) => (
                        <div key={k} style={{ padding:14, borderRadius:10, background:"var(--cream)" }}>
                          <div style={{ fontSize:11, color:"var(--stone)", textTransform:"uppercase", letterSpacing:".05em", marginBottom:4 }}>{k}</div>
                          <div style={{ fontWeight:600 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Milestones tab */}
                {tab === "milestones" && (
                  <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                    {data.milestones?.length > 0 ? data.milestones.map((m, i) => (
                      <div key={i} style={{
                        padding:16, borderRadius:12,
                        border:"1.5px solid",
                        borderColor: m.is_released ? "var(--success)" : "#EDE8E3",
                        background: m.is_released ? "#E8F8EE" : "var(--white)",
                      }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                          <span style={{ fontFamily:"var(--font-display)", fontWeight:700 }}>{m.title}</span>
                          <span className={m.is_released ? "badge badge-green" : "badge badge-yellow"}>
                            {m.is_released ? "✓ Released" : "Pending"}
                          </span>
                        </div>
                        {m.description && (
                          <p style={{ fontSize:13, color:"var(--stone)", marginBottom:6 }}>{m.description}</p>
                        )}
                        <div style={{ fontSize:13, color:"var(--stone)" }}>
                          {m.percentage}% of goal
                          {m.target_date ? ` · Target: ${new Date(m.target_date).toLocaleDateString()}` : ""}
                        </div>
                        {m.tx_signature && (
                          <a
                            href={`https://explorer.solana.com/tx/${m.tx_signature}?cluster=devnet`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ fontSize:12, color:"var(--info)", marginTop:4, display:"block" }}
                          >
                            🔗 View on Solana Explorer
                          </a>
                        )}
                      </div>
                    )) : (
                      <p style={{ color:"var(--stone)" }}>No milestones defined for this campaign.</p>
                    )}
                  </div>
                )}

                {/* Donations tab */}
                {tab === "donations" && (
                  <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                    {data.recent_donations?.length > 0 ? data.recent_donations.map((d, i) => (
                      <div key={i} style={{
                        display:"flex", justifyContent:"space-between", alignItems:"center",
                        padding:"12px 0",
                        borderBottom: i < data.recent_donations.length - 1 ? "1px solid #EDE8E3" : "none",
                      }}>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, fontFamily:"monospace" }}>
                            {d.donor_wallet?.slice(0,8)}…{d.donor_wallet?.slice(-4)}
                          </div>
                          {d.message && (
                            <div style={{ fontSize:12, color:"var(--stone)", marginTop:2 }}>
                              "{d.message}"
                            </div>
                          )}
                          <div style={{ fontSize:11, color:"var(--ash)", marginTop:2 }}>
                            {new Date(d.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0, marginLeft:16 }}>
                          <div style={{ fontFamily:"var(--font-display)", fontWeight:700, color:"var(--crimson)" }}>
                            {(+d.amount_sol).toFixed(4)} SOL
                          </div>
                          <a
                            href={`https://explorer.solana.com/tx/${d.tx_signature}?cluster=devnet`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ fontSize:11, color:"var(--info)" }}
                          >
                            🔗 tx
                          </a>
                        </div>
                      </div>
                    )) : (
                      <p style={{ color:"var(--stone)" }}>No donations yet. Be the first! 🎉</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right — Donation widget */}
          <div style={{ position:"sticky", top:"calc(var(--nav-h) + 16px)" }}>
            <div className="card" style={{ padding:24 }}>
              {/* Progress */}
              <div style={{ marginBottom:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontFamily:"var(--font-display)", fontSize:22, fontWeight:800, color:"var(--crimson)" }}>
                    {(+data.raised_amount).toFixed(4)} SOL
                  </span>
                  <span style={{ fontSize:14, color:"var(--stone)", alignSelf:"flex-end" }}>{pct}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width:`${pct}%` }} />
                </div>
                <div style={{ fontSize:13, color:"var(--stone)", marginTop:8 }}>
                  raised of {data.goal_amount} SOL goal
                </div>
              </div>

              {/* Stats */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
                <div style={{ padding:12, borderRadius:10, background:"var(--cream)", textAlign:"center" }}>
                  <div style={{ fontSize:18, fontWeight:700, fontFamily:"var(--font-display)" }}>
                    {data.recent_donations?.length || 0}
                  </div>
                  <div style={{ fontSize:12, color:"var(--stone)" }}>Donors</div>
                </div>
                <div style={{ padding:12, borderRadius:10, background:"var(--cream)", textAlign:"center" }}>
                  <div style={{ fontSize:18, fontWeight:700, fontFamily:"var(--font-display)" }}>
                    {(data.milestones?.filter(m => m.is_released).length || 0)}/{data.milestones?.length || 0}
                  </div>
                  <div style={{ fontSize:12, color:"var(--stone)" }}>Milestones</div>
                </div>
              </div>

              {/* Donate button */}
              {data.is_active ? (
                <>
                  {user ? (
                    <Link to={`/campaigns/${id}/donate`} className="btn btn-primary btn-full btn-lg">
                      Donate with SOL ⚡
                    </Link>
                  ) : (
                    <Link to="/login" className="btn btn-primary btn-full btn-lg">
                      Sign in to Donate
                    </Link>
                  )}
                  <p style={{ textAlign:"center", fontSize:12, color:"var(--stone)", marginTop:12 }}>
                    Transactions recorded on Solana blockchain
                  </p>
                </>
              ) : (
                <div style={{
                  textAlign:"center", padding:16,
                  background:"#FDDBD8", borderRadius:10, color:"var(--danger)",
                  fontWeight:600,
                }}>
                  This campaign is no longer active
                </div>
              )}
            </div>

            {/* On-chain address */}
            {data.on_chain_address && (
              <div style={{
                marginTop:12, padding:12, borderRadius:10,
                background:"rgba(26,16,8,.04)", fontSize:12, color:"var(--stone)",
              }}>
                <div style={{ marginBottom:4, fontWeight:600 }}>On-chain address:</div>
                <code style={{ wordBreak:"break-all", fontSize:11 }}>{data.on_chain_address}</code>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
