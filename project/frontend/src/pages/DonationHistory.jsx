// src/pages/DonationHistory.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../services/AuthContext";
import { donationAPI } from "../services/api";

export default function DonationHistory() {
  const { user, loading: authLoading } = useAuth();
  const navigate                        = useNavigate();
  const [donations, setDonations]       = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login", { replace: true }); return; }
    donationAPI.myDonations()
      .then(r => setDonations(r.data || []))
      .catch(() => setDonations([]))
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  if (authLoading || loading) return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", minHeight:"60vh" }}>
      <div className="pulse" style={{ width:40, height:40, borderRadius:"50%", background:"var(--crimson)" }} />
    </div>
  );

  const totalSol = donations.reduce((a, d) => a + parseFloat(d.amount_sol || 0), 0);

  return (
    <div style={{ padding:"40px 0", background:"var(--cream)", minHeight:"100vh" }}>
      <div className="container" style={{ maxWidth:860 }}>

        <div className="fade-up" style={{ marginBottom:28 }}>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:28, fontWeight:800 }}>
            My Donation History
          </h1>
          <p style={{ color:"var(--stone)", marginTop:4 }}>
            All your blockchain donations — every one verifiable on Solana
          </p>
        </div>

        {/* Summary */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:16, marginBottom:28 }}>
          {[
            { label:"Total Donations", value: donations.length,                 color:"var(--crimson)" },
            { label:"Total SOL Given", value: totalSol.toFixed(4) + " SOL",    color:"var(--saffron)" },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding:20 }}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:24, fontWeight:800, color:s.color }}>
                {s.value}
              </div>
              <div style={{ fontSize:12, color:"var(--stone)", marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* List */}
        {donations.length === 0 ? (
          <div className="card" style={{ padding:56, textAlign:"center" }}>
            <div style={{ fontSize:52, marginBottom:16 }}>💙</div>
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:700, marginBottom:8 }}>
              No donations yet
            </h3>
            <p style={{ color:"var(--stone)", marginBottom:24 }}>
              Browse campaigns and make your first blockchain donation
            </p>
            <Link to="/campaigns" className="btn btn-primary">Browse Campaigns →</Link>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {donations.map((d, i) => (
              <div key={d.id ?? i} className="card" style={{ padding:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
                  <div style={{ flex:1, minWidth:200 }}>
                    <Link to={`/campaigns/${d.campaign_id}`}
                      style={{ fontFamily:"var(--font-display)", fontWeight:700,
                        fontSize:15, color:"var(--ink)", textDecoration:"none" }}>
                      {d.campaign_title || "Campaign"}
                    </Link>
                    {d.organization_name && (
                      <div style={{ fontSize:12, color:"var(--stone)", marginTop:3 }}>
                        by {d.organization_name}
                      </div>
                    )}
                    {d.message && (
                      <div style={{ fontSize:13, color:"var(--stone)",
                        marginTop:6, fontStyle:"italic" }}>
                        "{d.message}"
                      </div>
                    )}
                    <div style={{ fontSize:11, color:"var(--ash)", marginTop:6 }}>
                      {new Date(d.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontFamily:"var(--font-display)", fontSize:20,
                      fontWeight:800, color:"var(--crimson)" }}>
                      {parseFloat(d.amount_sol || 0).toFixed(4)} SOL
                    </div>
                    <a
                      href={`https://explorer.solana.com/tx/${d.tx_signature}?cluster=devnet`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ fontSize:12, color:"var(--info)", display:"block", marginTop:4 }}
                    >
                      🔗 View on Explorer
                    </a>
                    <div style={{ fontSize:10, fontFamily:"monospace", color:"var(--ash)",
                      marginTop:4, maxWidth:180, overflow:"hidden",
                      textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {d.tx_signature}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
