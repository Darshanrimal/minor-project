// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { campaignAPI } from "../services/api";

const CATEGORIES = [
  { icon: "🏫", label: "Education",      key: "education" },
  { icon: "🏥", label: "Health",         key: "health" },
  { icon: "🌊", label: "Disaster Relief",key: "disaster_relief" },
  { icon: "🌱", label: "Environment",    key: "environment" },
  { icon: "🤝", label: "Community",      key: "community" },
  { icon: "🐾", label: "Animals",        key: "animals" },
];

export default function Home() {
  const [stats, setStats]       = useState(null);
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    campaignAPI.stats().then(r => setStats(r.data)).catch(() => {});
    campaignAPI.list().then(r => setCampaigns((r.data.campaigns || []).slice(0, 3))).catch(() => {});
  }, []);

  return (
    <div>
      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight:"88vh", display:"flex", alignItems:"center",
        background:"linear-gradient(135deg,#1A1008 0%,#3D1A0A 50%,#1A1008 100%)",
        position:"relative", overflow:"hidden", padding:"80px 0",
      }}>
        <div style={{ position:"absolute", top:"-10%", right:"-5%", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(192,57,43,.25) 0%,transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"-15%", left:"-8%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(230,126,34,.15) 0%,transparent 70%)", pointerEvents:"none" }} />

        <div className="container fade-up" style={{ position:"relative", zIndex:1 }}>
          <div style={{ maxWidth:660 }}>
            <div style={{
              display:"inline-flex", alignItems:"center", gap:8,
              padding:"6px 16px", borderRadius:100,
              background:"rgba(230,126,34,.15)", border:"1px solid rgba(230,126,34,.3)",
              marginBottom:24,
            }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:"var(--saffron)", display:"inline-block" }} />
              <span style={{ color:"var(--saffron)", fontSize:13, fontWeight:500 }}>
                Powered by Solana Blockchain
              </span>
            </div>

            <h1 style={{
              fontFamily:"var(--font-display)",
              fontSize:"clamp(42px,6vw,72px)",
              fontWeight:800, lineHeight:1.05, color:"#fff", marginBottom:24,
            }}>
              Give with <span style={{ color:"var(--saffron)" }}>trust.</span><br />
              Give with <span style={{ color:"var(--crimson-light)" }}>proof.</span>
            </h1>

            <p style={{ color:"rgba(255,255,255,.65)", fontSize:"clamp(16px,2vw,20px)", lineHeight:1.7, marginBottom:40, maxWidth:520 }}>
              NepalDaan connects donors directly to verified Nepali charities using
              blockchain transparency. Every donation is recorded on-chain — immutable,
              verifiable, and real.
            </p>

            <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
              <Link to="/campaigns" className="btn btn-primary btn-lg">
                Browse Campaigns →
              </Link>
              <Link to="/register" className="btn btn-lg" style={{
                background:"rgba(255,255,255,.1)", color:"#fff",
                border:"1px solid rgba(255,255,255,.2)",
              }}>
                Start a Campaign
              </Link>
            </div>

            {/* Platform stats */}
            {stats && (
              <div style={{ display:"flex", gap:40, marginTop:56, flexWrap:"wrap" }}>
                {[
                  { value: stats.total_campaigns,    label: "Active Campaigns" },
                  { value: `${parseFloat(stats.total_donated || 0).toFixed(2)} SOL`, label: "Total Raised" },
                  { value: stats.total_donors,       label: "Donors" },
                  { value: stats.total_organizations,label: "Verified Orgs" },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontFamily:"var(--font-display)", fontSize:28, fontWeight:800, color:"var(--saffron)" }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,.5)", marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Categories ──────────────────────────────────────────────────────── */}
      <section style={{ padding:"80px 0", background:"var(--cream)" }}>
        <div className="container">
          <div className="section-header" style={{ textAlign:"center" }}>
            <h2>Browse by Category</h2>
            <p>Find causes that matter to you</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:16 }}>
            {CATEGORIES.map(cat => (
              <Link
                key={cat.key}
                to={`/campaigns?category=${cat.key}`}
                style={{
                  display:"flex", flexDirection:"column", alignItems:"center", gap:12,
                  padding:"28px 16px", borderRadius:"var(--radius-lg)",
                  background:"var(--white)", boxShadow:"var(--shadow)",
                  transition:"all .25s", textDecoration:"none",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow="var(--shadow-lg)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="var(--shadow)"; }}
              >
                <span style={{ fontSize:32 }}>{cat.icon}</span>
                <span style={{ fontFamily:"var(--font-display)", fontWeight:600, fontSize:14, color:"var(--ink)" }}>
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Campaigns ──────────────────────────────────────────────── */}
      {campaigns.length > 0 && (
        <section style={{ padding:"80px 0", background:"#F5EFE8" }}>
          <div className="container">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:32 }}>
              <div>
                <h2 style={{ fontFamily:"var(--font-display)", fontSize:28, fontWeight:700 }}>Featured Campaigns</h2>
                <p style={{ color:"var(--stone)", marginTop:6 }}>Currently raising funds on the blockchain</p>
              </div>
              <Link to="/campaigns" className="btn btn-secondary btn-sm">View All</Link>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:24 }}>
              {campaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section style={{ padding:"80px 0", background:"var(--ink)" }}>
        <div className="container">
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:28, fontWeight:700, color:"#fff" }}>
              How NepalDaan Works
            </h2>
            <p style={{ color:"rgba(255,255,255,.5)", marginTop:6 }}>Transparent giving in 4 steps</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:32 }}>
            {[
              { step:"01", icon:"🔗", title:"Connect Wallet",   desc:"Link your Phantom wallet to your account for blockchain donations." },
              { step:"02", icon:"🔍", title:"Find Campaign",    desc:"Browse verified campaigns by cause, province, or organization." },
              { step:"03", icon:"⚡", title:"Donate On-Chain",  desc:"Send SOL directly. The transaction is recorded on Solana instantly." },
              { step:"04", icon:"📊", title:"Track Impact",     desc:"Every donation is publicly verifiable. Watch milestones get unlocked." },
            ].map(s => (
              <div key={s.step} style={{
                padding:32, borderRadius:"var(--radius-lg)",
                background:"rgba(255,255,255,.04)",
                border:"1px solid rgba(255,255,255,.08)",
              }}>
                <div style={{ fontFamily:"var(--font-display)", fontSize:13, color:"var(--saffron)", fontWeight:700, marginBottom:16 }}>
                  {s.step}
                </div>
                <div style={{ fontSize:28, marginBottom:12 }}>{s.icon}</div>
                <h3 style={{ fontFamily:"var(--font-display)", color:"#fff", fontSize:18, fontWeight:700, marginBottom:8 }}>
                  {s.title}
                </h3>
                <p style={{ color:"rgba(255,255,255,.5)", fontSize:14, lineHeight:1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{ padding:"32px 0", background:"#100A05", textAlign:"center" }}>
        <p style={{ color:"rgba(255,255,255,.3)", fontSize:13 }}>
          © 2026 NepalDaan · Tribhuvan University Minor Project [CT-654] · Built on Solana blockchain
        </p>
      </footer>
    </div>
  );
}

// ── Campaign Card ─────────────────────────────────────────────────────────────
function CampaignCard({ campaign }) {
  // Guard against goal_amount = 0 (prevents NaN/Infinity)
  const pct = (campaign.goal_amount > 0)
    ? Math.min(100, Math.round((campaign.raised_amount / campaign.goal_amount) * 100))
    : 0;

  const EMOJI = {
    education:"🏫", health:"🏥", disaster_relief:"🌊",
    environment:"🌱", community:"🤝", animals:"🐾",
  };
  const emoji = EMOJI[campaign.category] || "💙";

  return (
    <Link
      to={`/campaigns/${campaign.id}`}
      className="card"
      style={{ textDecoration:"none", transition:"transform .25s, box-shadow .25s" }}
      onMouseEnter={e => { e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow="var(--shadow-lg)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}
    >
      <div style={{
        height:160, display:"flex", alignItems:"center", justifyContent:"center",
        background:"linear-gradient(135deg,#f5ece3,#fdf4ed)", fontSize:56,
      }}>
        {emoji}
      </div>
      <div style={{ padding:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <span className="badge badge-gray" style={{ textTransform:"capitalize" }}>
            {campaign.category?.replace("_", " ")}
          </span>
          <span style={{ fontSize:12, color:"var(--stone)" }}>{campaign.province || ""}</span>
        </div>
        <h3 style={{
          fontFamily:"var(--font-display)", fontSize:16, fontWeight:700,
          color:"var(--ink)", marginBottom:6,
          display:"-webkit-box", WebkitLineClamp:2,
          WebkitBoxOrient:"vertical", overflow:"hidden",
        }}>
          {campaign.title}
        </h3>
        <p style={{
          fontSize:13, color:"var(--stone)", marginBottom:16,
          display:"-webkit-box", WebkitLineClamp:2,
          WebkitBoxOrient:"vertical", overflow:"hidden",
        }}>
          {campaign.description}
        </p>
        <div className="progress-bar" style={{ marginBottom:10 }}>
          <div className="progress-fill" style={{ width:`${pct}%` }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
          <span style={{ color:"var(--crimson)", fontWeight:700 }}>
            {(+campaign.raised_amount).toFixed(3)} SOL raised
          </span>
          <span style={{ color:"var(--stone)" }}>{pct}%</span>
        </div>
        <div style={{ marginTop:4, fontSize:12, color:"var(--stone)" }}>
          Goal: {campaign.goal_amount} SOL
        </div>
      </div>
    </Link>
  );
}
