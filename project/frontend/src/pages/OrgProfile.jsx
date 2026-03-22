// src/pages/OrgProfile.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { userAPI } from "../services/api";

const EMOJI = {
  education:"🏫", health:"🏥", disaster_relief:"🌊",
  environment:"🌱", community:"🤝", animals:"🐾",
};

export default function OrgProfile() {
  const { id }              = useParams();
  const [org, setOrg]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    userAPI.getOrgProfile(id)
      .then(r => setOrg(r.data))
      .catch(err => {
        if (err.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", minHeight:"60vh" }}>
      <div className="pulse" style={{ width:40, height:40, borderRadius:"50%", background:"var(--crimson)" }} />
    </div>
  );

  if (notFound || !org) return (
    <div style={{ textAlign:"center", padding:"80px 24px" }}>
      <div style={{ fontSize:52, marginBottom:16 }}>🔍</div>
      <h2 style={{ fontFamily:"var(--font-display)", fontSize:24, fontWeight:700 }}>
        Organization not found
      </h2>
      <Link to="/campaigns" className="btn btn-primary" style={{ marginTop:20 }}>
        Back to Campaigns
      </Link>
    </div>
  );

  const totalRaised    = parseFloat(org.total_raised || 0);
  const totalCampaigns = parseInt(org.total_campaigns || 0, 10);
  const campaigns      = Array.isArray(org.campaigns) ? org.campaigns : [];
  const initial        = (org.name || "O")[0].toUpperCase();

  return (
    <div style={{ background:"var(--cream)", minHeight:"100vh", paddingBottom:60 }}>
      {/* Hero */}
      <div style={{
        background:"linear-gradient(135deg,var(--ink),var(--ink-soft))",
        padding:"60px 0 100px",
      }}>
        <div className="container fade-up">
          <div style={{ display:"flex", gap:24, alignItems:"center", flexWrap:"wrap" }}>
            <div style={{
              width:72, height:72, borderRadius:20, flexShrink:0,
              background:"linear-gradient(135deg,var(--crimson),var(--saffron))",
              display:"flex", alignItems:"center", justifyContent:"center",
              color:"#fff", fontFamily:"var(--font-display)", fontWeight:800, fontSize:28,
            }}>
              {initial}
            </div>
            <div>
              <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                <span style={{
                  padding:"3px 12px", borderRadius:100, fontSize:12, fontWeight:600,
                  background: org.verification_status === "verified"
                    ? "rgba(39,174,96,.2)" : "rgba(230,126,34,.2)",
                  color: org.verification_status === "verified" ? "#27AE60" : "#E67E22",
                }}>
                  {org.verification_status === "verified" ? "✓ Verified" : org.verification_status || "Pending"}
                </span>
              </div>
              <h1 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(22px,4vw,32px)",
                fontWeight:800, color:"#fff", marginBottom:8 }}>
                {org.name}
              </h1>
              {(org.district || org.province) && (
                <p style={{ color:"rgba(255,255,255,.6)", fontSize:14 }}>
                  {[org.district, org.province].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop:-60 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:24, alignItems:"start" }}>

          {/* Left */}
          <div>
            {/* About */}
            <div className="card" style={{ padding:28, marginBottom:20 }}>
              <h2 style={{ fontFamily:"var(--font-display)", fontWeight:700,
                fontSize:18, marginBottom:14 }}>About</h2>
              <p style={{ lineHeight:1.8, color:"var(--ink-soft)" }}>
                {org.description || "No description provided."}
              </p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                gap:12, marginTop:20 }}>
                {[
                  ["Contact Email", org.contact_email],
                  ["Website",       org.website],
                  ["District",      org.district],
                  ["Province",      org.province],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} style={{ padding:12, borderRadius:10, background:"var(--cream)" }}>
                    <div style={{ fontSize:11, color:"var(--stone)", textTransform:"uppercase",
                      letterSpacing:".05em", marginBottom:4 }}>{k}</div>
                    <div style={{ fontWeight:600, fontSize:13, wordBreak:"break-word" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Campaigns */}
            <div className="card" style={{ padding:28 }}>
              <h2 style={{ fontFamily:"var(--font-display)", fontWeight:700,
                fontSize:18, marginBottom:14 }}>
                Campaigns ({campaigns.length})
              </h2>
              {campaigns.length === 0 ? (
                <p style={{ color:"var(--stone)" }}>No campaigns yet.</p>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {campaigns.map(c => {
                    const pct = (c.goal_amount > 0)
                      ? Math.min(100, Math.round((c.raised_amount / c.goal_amount) * 100))
                      : 0;
                    const emoji = EMOJI[c.category] || "💙";
                    return (
                      <Link key={c.id} to={`/campaigns/${c.id}`} style={{
                        textDecoration:"none", display:"block", padding:16,
                        borderRadius:12, background:"var(--cream)",
                        border:"1.5px solid #EDE8E3", transition:"border-color .2s",
                      }}
                        onMouseEnter={e => e.currentTarget.style.borderColor="var(--crimson)"}
                        onMouseLeave={e => e.currentTarget.style.borderColor="#EDE8E3"}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                          alignItems:"flex-start", marginBottom:10 }}>
                          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                            <span style={{ fontSize:24 }}>{emoji}</span>
                            <span style={{ fontFamily:"var(--font-display)",
                              fontWeight:700, color:"var(--ink)", fontSize:14 }}>
                              {c.title}
                            </span>
                          </div>
                          <span style={{
                            padding:"2px 10px", borderRadius:100, fontSize:11,
                            fontWeight:600, flexShrink:0, marginLeft:8,
                            background: c.is_active ? "#D5F0E0" : "#FDDBD8",
                            color: c.is_active ? "#1A7A3C" : "#96281B",
                          }}>
                            {c.is_active ? "Active" : "Ended"}
                          </span>
                        </div>
                        <div className="progress-bar" style={{ marginBottom:6 }}>
                          <div className="progress-fill" style={{ width:`${pct}%` }} />
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between",
                          fontSize:12, color:"var(--stone)" }}>
                          <span style={{ color:"var(--crimson)", fontWeight:700 }}>
                            {parseFloat(c.raised_amount || 0).toFixed(4)} SOL
                          </span>
                          <span>{pct}% of {c.goal_amount} SOL</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{ position:"sticky", top:"calc(var(--nav-h) + 16px)" }}>
            <div className="card" style={{ padding:24 }}>
              <h3 style={{ fontFamily:"var(--font-display)", fontWeight:700,
                fontSize:15, marginBottom:16 }}>Stats</h3>
              {[
                { label:"Total Campaigns", value: totalCampaigns },
                { label:"Total Raised",    value: `${totalRaised.toFixed(4)} SOL` },
                { label:"Member Since",
                  value: new Date(org.created_at).toLocaleDateString() },
              ].map(s => (
                <div key={s.label} style={{
                  display:"flex", justifyContent:"space-between",
                  padding:"10px 0", borderBottom:"1px solid #EDE8E3",
                }}>
                  <span style={{ fontSize:13, color:"var(--stone)" }}>{s.label}</span>
                  <span style={{ fontSize:13, fontWeight:700 }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
