// src/components/TransactionHistory.jsx
import React, { useState } from "react";
import { useTransactionHistory } from "../hooks/useTransactionHistory";
import { useTheme } from "../services/ThemeContext";

const TREASURY = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";

export default function TransactionHistory({ walletAddress, campaignTitle }) {
  const { dark }                               = useTheme();
  const { txns, loading, error, fetchHistory } = useTransactionHistory();
  const [open, setOpen]                        = useState(false);
  const [fetched, setFetched]                  = useState(false);

  const address = walletAddress || TREASURY;

  const handleOpen = async () => {
    setOpen(true);
    if (!fetched) {
      const ok = await fetchHistory(address, 10);
      if (ok) setFetched(true);
    }
  };

  const handleRefresh = async () => {
    setFetched(false);
    const ok = await fetchHistory(address, 10);
    if (ok) setFetched(true);
  };

  const bg     = dark ? "#1E2028"                : "#FFFFFF";
  const border = dark ? "rgba(255,255,255,.07)"  : "#EDE8E3";
  const text   = dark ? "#F0F0F5"                : "#1A1008";
  const muted  = dark ? "rgba(240,240,245,.45)"  : "#7D6E63";
  const rowBg  = dark ? "rgba(255,255,255,.03)"  : "#FAF6F0";

  return (
    <div>
      {!open && (
        <button
          onClick={handleOpen}
          style={{
            display:"inline-flex", alignItems:"center", gap:8,
            padding:"10px 18px", borderRadius:10,
            border:`1px solid ${border}`,
            background: dark ? "rgba(255,255,255,.06)" : "rgba(26,16,8,.04)",
            color:text, fontSize:13, fontWeight:600,
            cursor:"pointer", transition:"all .2s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "#C0392B";
            e.currentTarget.style.color = "#C0392B";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = border;
            e.currentTarget.style.color = text;
          }}
        >
          🔗 View On-Chain Transactions
        </button>
      )}

      {open && (
        <div style={{
          background:bg, border:`1px solid ${border}`,
          borderRadius:16, overflow:"hidden",
          boxShadow: dark ? "0 8px 32px rgba(0,0,0,.5)" : "0 4px 24px rgba(26,16,8,.08)",
        }}>
          {/* Header */}
          <div style={{
            padding:"16px 20px", borderBottom:`1px solid ${border}`,
            display:"flex", justifyContent:"space-between", alignItems:"center",
            background: dark ? "rgba(255,255,255,.03)" : "rgba(192,57,43,.03)",
          }}>
            <div>
              <div style={{ fontWeight:700, fontSize:15, color:text }}>
                ⛓️ On-Chain Transaction History
              </div>
              <div style={{ fontSize:11, color:muted, marginTop:2 }}>
                {campaignTitle} · Solana Devnet · Last 10 txns
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={handleRefresh} disabled={loading} style={{
                padding:"6px 12px", borderRadius:8, border:`1px solid ${border}`,
                background:"transparent", color:muted, fontSize:12,
                cursor: loading ? "wait" : "pointer", opacity: loading ? 0.5 : 1,
              }}>
                {loading ? "⏳" : "↺ Refresh"}
              </button>
              <button onClick={() => setOpen(false)} style={{
                padding:"6px 12px", borderRadius:8, border:`1px solid ${border}`,
                background:"transparent", color:muted, fontSize:12, cursor:"pointer",
              }}>
                ✕ Close
              </button>
            </div>
          </div>

          {/* Address */}
          <div style={{
            padding:"8px 20px", fontSize:11, color:muted,
            fontFamily:"monospace", borderBottom:`1px solid ${border}`,
            background: dark ? "rgba(0,0,0,.2)" : "rgba(0,0,0,.02)",
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          }}>
            Address: {address}
          </div>

          {/* Content */}
          <div style={{ maxHeight:420, overflowY:"auto" }}>
            {loading && (
              <div style={{ padding:"20px 20px 24px" }}>
                <div style={{ textAlign:"center", marginBottom:16 }}>
                  <div style={{
                    width:32, height:32, borderRadius:"50%", margin:"0 auto 10px",
                    border:`2px solid ${border}`, borderTopColor:"#C0392B",
                    animation:"spin .8s linear infinite",
                  }} />
                  <div style={{ fontSize:13, color:muted }}>
                    Fetching transactions from Solana…
                  </div>
                </div>
                {[1,2,3].map(i => (
                  <div key={i} style={{
                    height:60, borderRadius:10, marginBottom:8,
                    background: dark ? "rgba(255,255,255,.04)" : "#EDE8E3",
                    animation:"pulse 1.4s ease infinite",
                    opacity: 1 - i * 0.2,
                  }} />
                ))}
              </div>
            )}

            {!loading && error && (
              <div style={{ padding:32, textAlign:"center" }}>
                <div style={{ fontSize:32, marginBottom:8 }}>⚠️</div>
                <div style={{ fontSize:13, color:"#E84040", marginBottom:14 }}>{error}</div>
                <button onClick={handleRefresh} style={{
                  padding:"8px 18px", borderRadius:9,
                  border:"1px solid #E84040",
                  background:"rgba(232,64,64,.08)",
                  color:"#E84040", fontSize:12, cursor:"pointer",
                }}>
                  ↺ Try Again
                </button>
              </div>
            )}

            {!loading && !error && fetched && txns.length === 0 && (
              <div style={{ padding:40, textAlign:"center" }}>
                <div style={{ fontSize:40, marginBottom:10 }}>📭</div>
                <div style={{ fontSize:14, fontWeight:600, color:text, marginBottom:4 }}>
                  No transactions found
                </div>
                <div style={{ fontSize:12, color:muted }}>
                  This wallet has no recent activity on Solana devnet
                </div>
              </div>
            )}

            {!loading && !error && txns.map((tx, i) => (
              <div key={tx.signature} style={{
                padding:"14px 20px",
                borderBottom: i < txns.length - 1 ? `1px solid ${border}` : "none",
                background: i % 2 === 0 ? rowBg : "transparent",
                transition:"background .15s",
              }}
                onMouseEnter={e => e.currentTarget.style.background =
                  dark ? "rgba(255,255,255,.05)" : "rgba(192,57,43,.03)"}
                onMouseLeave={e => e.currentTarget.style.background =
                  i % 2 === 0 ? rowBg : "transparent"}
              >
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"flex-start", gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center",
                      gap:8, marginBottom:5, flexWrap:"wrap" }}>
                      <span style={{
                        padding:"2px 8px", borderRadius:100, fontSize:10, fontWeight:700,
                        background: tx.err ? "rgba(232,64,64,.15)" : "rgba(46,204,113,.15)",
                        color: tx.err ? "#E84040" : "#27AE60",
                      }}>
                        {tx.err ? "✕ Failed" : "✓ Success"}
                      </span>
                      {tx.amountSol !== null && tx.amountSol > 0 && (
                        <span style={{ fontSize:14, fontWeight:800,
                          color: dark ? "#F5A623" : "#C0392B" }}>
                          {tx.amountSol.toFixed(6)} SOL
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily:"monospace", fontSize:11, color:muted,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {tx.signature.slice(0,24)}…{tx.signature.slice(-8)}
                    </div>
                    {tx.blockTime && (
                      <div style={{ fontSize:11, color:muted, marginTop:4 }}>
                        🕒 {tx.blockTime.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <a href={tx.explorerUrl} target="_blank" rel="noopener noreferrer"
                    style={{
                      padding:"6px 12px", borderRadius:8, flexShrink:0,
                      border:`1px solid ${border}`,
                      background: dark ? "rgba(59,158,255,.08)" : "rgba(41,128,185,.06)",
                      color:"#2980B9", fontSize:11, fontWeight:600,
                      textDecoration:"none", whiteSpace:"nowrap",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(59,158,255,.2)"}
                    onMouseLeave={e => e.currentTarget.style.background =
                      dark ? "rgba(59,158,255,.08)" : "rgba(41,128,185,.06)"}
                  >
                    Explorer ↗
                  </a>
                </div>
              </div>
            ))}
          </div>

          {!loading && txns.length > 0 && (
            <div style={{
              padding:"10px 20px", fontSize:11, color:muted,
              borderTop:`1px solid ${border}`, textAlign:"center",
              background: dark ? "rgba(0,0,0,.15)" : "rgba(0,0,0,.02)",
            }}>
              Showing {txns.length} most recent transactions · Solana Devnet
            </div>
          )}
        </div>
      )}
    </div>
  );
}