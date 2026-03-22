// src/pages/Campaigns.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { campaignAPI } from "../services/api";

const CATEGORIES = ["", "education", "health", "disaster_relief", "environment", "community", "animals", "other"];
const PROVINCES   = ["", "Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpashchim"];

const EMOJI = {
  education:"🏫", health:"🏥", disaster_relief:"🌊",
  environment:"🌱", community:"🤝", animals:"🐾",
};

export default function Campaigns() {
  const [params, setParams]       = useSearchParams();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);
  const [search, setSearch]       = useState("");

  const category = params.get("category") || "";
  const province = params.get("province") || "";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await campaignAPI.list({
        category: category || undefined,
        province: province || undefined,
      });
      setCampaigns(data.campaigns || []);
      setTotal(data.total || 0);
    } catch {
      setCampaigns([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [category, province]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key, val) => {
    const next = new URLSearchParams(params);
    if (val) next.set(key, val); else next.delete(key);
    setParams(next);
    setSearch(""); // clear search when filter changes
  };

  // Client-side search filter
  const filtered = campaigns.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.title || "").toLowerCase().includes(q) ||
      (c.organization_name || "").toLowerCase().includes(q) ||
      (c.description || "").toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ background:"var(--cream)", minHeight:"100vh", padding:"40px 0" }}>
      <div className="container">

        {/* Header */}
        <div className="fade-up" style={{ marginBottom:24 }}>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:28, fontWeight:700 }}>
            Active Campaigns
          </h2>
          <p style={{ color:"var(--stone)", marginTop:4 }}>
            {total} campaign{total !== 1 ? "s" : ""} currently raising funds
          </p>
        </div>

        {/* Search bar */}
        <div style={{ marginBottom:16 }}>
          <div style={{ position:"relative", maxWidth:420 }}>
            <span style={{
              position:"absolute", left:14, top:"50%", transform:"translateY(-50%)",
              fontSize:16, pointerEvents:"none",
            }}>🔍</span>
            <input
              className="form-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by campaign name or organization…"
              style={{ paddingLeft:40, width:"100%" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{
                position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                background:"none", border:"none", cursor:"pointer",
                color:"var(--stone)", fontSize:16, padding:0,
              }}>✕</button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:28 }}>
          <select className="form-input" value={category}
            onChange={e => setFilter("category", e.target.value)}
            style={{ width:"auto" }}>
            <option value="">All Categories</option>
            {CATEGORIES.slice(1).map(c => (
              <option key={c} value={c}>{c.replace("_"," ")}</option>
            ))}
          </select>
          <select className="form-input" value={province}
            onChange={e => setFilter("province", e.target.value)}
            style={{ width:"auto" }}>
            <option value="">All Provinces</option>
            {PROVINCES.slice(1).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {(category || province || search) && (
            <button className="btn btn-ghost btn-sm"
              onClick={() => { setParams({}); setSearch(""); }}>
              ✕ Clear all
            </button>
          )}
        </div>

        {/* Search results count */}
        {search && !loading && (
          <p style={{ color:"var(--stone)", fontSize:13, marginBottom:16 }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:24 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="card" style={{ overflow:"hidden" }}>
                <div className="skeleton" style={{ height:160 }} />
                <div style={{ padding:20, display:"flex", flexDirection:"column", gap:10 }}>
                  <div className="skeleton" style={{ height:16, width:"60%" }} />
                  <div className="skeleton" style={{ height:20 }} />
                  <div className="skeleton" style={{ height:8 }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:22 }}>
              No campaigns found
            </h3>
            <p style={{ color:"var(--stone)", marginTop:8 }}>
              {search ? `No results for "${search}"` : "Try different filters or check back later."}
            </p>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:24 }}>
            {filtered.map(c => <CampaignCard key={c.id} campaign={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function CampaignCard({ campaign }) {
  const pct = (campaign.goal_amount > 0)
    ? Math.min(100, Math.round((campaign.raised_amount / campaign.goal_amount) * 100))
    : 0;
  const emoji    = EMOJI[campaign.category] || "💙";
  const daysLeft = campaign.end_date
    ? Math.max(0, Math.ceil((new Date(campaign.end_date) - new Date()) / 86400000))
    : null;

  return (
    <Link to={`/campaigns/${campaign.id}`} className="card fade-up"
      style={{ textDecoration:"none", display:"flex", flexDirection:"column",
        transition:"transform .25s, box-shadow .25s" }}
      onMouseEnter={e => { e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow="var(--shadow-lg)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}
    >
      <div style={{ height:160, display:"flex", alignItems:"center", justifyContent:"center",
        background:"linear-gradient(135deg,#f5ece3,#fdf4ed)", fontSize:56, flexShrink:0 }}>
        {emoji}
      </div>
      <div style={{ padding:20, flex:1, display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:10 }}>
          <span className="badge badge-gray" style={{ textTransform:"capitalize" }}>
            {(campaign.category || "").replace("_"," ")}
          </span>
          {daysLeft !== null && (
            <span style={{ fontSize:12, color: daysLeft < 7 ? "var(--danger)" : "var(--stone)" }}>
              {daysLeft === 0 ? "Ends today" : `${daysLeft}d left`}
            </span>
          )}
        </div>
        <h3 style={{ fontFamily:"var(--font-display)", fontSize:16, fontWeight:700,
          color:"var(--ink)", marginBottom:6, display:"-webkit-box",
          WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
          {campaign.title}
        </h3>
        <p style={{ fontSize:13, color:"var(--stone)", flex:1, marginBottom:16,
          display:"-webkit-box", WebkitLineClamp:2,
          WebkitBoxOrient:"vertical", overflow:"hidden" }}>
          {campaign.description}
        </p>
        <div>
          <div className="progress-bar" style={{ marginBottom:8 }}>
            <div className="progress-fill" style={{ width:`${pct}%` }} />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
            <span style={{ fontWeight:700, color:"var(--crimson)" }}>
              {(+campaign.raised_amount).toFixed(3)} SOL
            </span>
            <span style={{ color:"var(--stone)" }}>
              of {campaign.goal_amount} SOL ({pct}%)
            </span>
          </div>
          <div style={{ fontSize:12, color:"var(--stone)", marginTop:4 }}>
            by <strong>{campaign.organization_name}</strong>
            {campaign.province ? ` · ${campaign.province}` : ""}
          </div>
        </div>
      </div>
      <div style={{ padding:"12px 20px", borderTop:"1px solid #EDE8E3",
        display:"flex", justifyContent:"center" }}>
        <span style={{ color:"var(--crimson)", fontFamily:"var(--font-display)",
          fontWeight:600, fontSize:14 }}>
          Donate Now →
        </span>
      </div>
    </Link>
  );
}
