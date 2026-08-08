// src/pages/EsewaFailure.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../services/ThemeContext";

export default function EsewaFailure() {
  const { dark }   = useTheme();
  const navigate   = useNavigate();

  const bg     = dark ? "#0F1117" : "var(--cream)";
  const cardBg = dark ? "#1E2028" : "#FFFFFF";
  const border = dark ? "rgba(255,255,255,.08)" : "#EDE8E3";
  const muted  = dark ? "rgba(240,240,245,.45)" : "var(--stone)";

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:bg, padding:24 }}>
      <div style={{
        maxWidth:480, width:"100%", padding:40, textAlign:"center",
        borderRadius:24, background:cardBg, border:`1px solid ${border}`,
        boxShadow: dark ? "0 24px 64px rgba(0,0,0,.5)" : "var(--shadow-lg)",
      }}>
        <div style={{ fontSize:64, marginBottom:16 }}>❌</div>
        <h2 style={{ fontFamily:"var(--font-display)", fontSize:26, fontWeight:800, color:"var(--crimson)", marginBottom:12 }}>
          Payment Cancelled
        </h2>
        <p style={{ color:muted, marginBottom:12, lineHeight:1.7 }}>Your eSewa payment was not completed.</p>
        <p style={{ color:muted, marginBottom:28, fontSize:13 }}>No amount was charged from your account.</p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          <button onClick={() => navigate(-1)} style={{
            padding:"10px 24px", borderRadius:12, border:"2px solid var(--crimson)",
            background:"transparent", color:"var(--crimson)",
            fontWeight:700, fontSize:14, cursor:"pointer",
          }}>
            Try Again
          </button>
          <Link to="/campaigns" style={{
            display:"inline-block", padding:"10px 24px", borderRadius:12,
            background:"linear-gradient(135deg,var(--crimson),var(--saffron))",
            color:"#fff", fontWeight:700, fontSize:14, textDecoration:"none",
          }}>
            Back to Campaigns
          </Link>
        </div>
      </div>
    </div>
  );
}
