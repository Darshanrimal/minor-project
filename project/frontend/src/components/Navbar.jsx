// src/components/Navbar.jsx
import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAuth } from "../services/AuthContext";
import { authAPI } from "../services/api";
import toast from "react-hot-toast";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { publicKey }    = useWallet();
  const navigate         = useNavigate();
  const { pathname }     = useLocation();

  React.useEffect(() => {
    if (!user || !publicKey) return;
    const walletStr = publicKey.toBase58();
    if (user.wallet_address === walletStr) return;
    authAPI.linkWallet(walletStr).catch(() => {});
  }, [publicKey, user]);

  const handleLogout = () => {
    logout();
    navigate("/");
    toast.success("Logged out successfully");
  };

  const navLinks = [
    { to: "/campaigns", label: "Campaigns" },
    ...(user ? [
      { to: "/dashboard", label: "Dashboard"    },
      { to: "/history",   label: "My Donations" },
      { to: "/profile",   label: "Profile"      },
    ] : []),
    ...(user?.role === "admin" ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  const isActive = to => pathname === to;

  return (
    <nav style={{
      position:"fixed", top:0, left:0, right:0, zIndex:1000,
      height:"var(--nav-h)", display:"flex", alignItems:"center",
      background:"rgba(250,246,240,.94)", backdropFilter:"blur(12px)",
      borderBottom:"1px solid rgba(192,57,43,.12)",
      boxShadow:"0 2px 16px rgba(26,16,8,.06)",
    }}>
      <div className="container" style={{ display:"flex", alignItems:"center", gap:20, width:"100%" }}>

        {/* Logo */}
        <Link to="/" style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0, textDecoration:"none" }}>
          <div style={{
            width:36, height:36, borderRadius:10,
            background:"linear-gradient(135deg,var(--crimson),var(--saffron))",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"#fff", fontFamily:"var(--font-display)", fontWeight:800, fontSize:16,
          }}>N</div>
          <span style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:18, color:"var(--ink)" }}>
            Nepal<span style={{ color:"var(--crimson)" }}>Daan</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display:"flex", alignItems:"center", gap:2, flex:1, flexWrap:"nowrap", overflow:"hidden" }}>
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} style={{
              padding:"6px 12px", borderRadius:8, fontSize:13,
              fontWeight: isActive(l.to) ? 600 : 500,
              color: isActive(l.to) ? "var(--crimson)" : "var(--ink-soft)",
              background: isActive(l.to) ? "rgba(192,57,43,.08)" : "transparent",
              transition:"all .2s", textDecoration:"none", whiteSpace:"nowrap",
            }}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right */}
        <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <WalletMultiButton />
          {user ? (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:13, fontWeight:600, color:"var(--ink)", lineHeight:1.2 }}>
                  {user.username}
                </div>
                <div style={{ fontSize:11, color:"var(--stone)", textTransform:"capitalize" }}>
                  {(user.role || "").replace("_"," ")}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}
                style={{ border:"1px solid #DDD4C8" }}>
                Sign out
              </button>
            </div>
          ) : (
            <div style={{ display:"flex", gap:8 }}>
              <Link to="/login"    className="btn btn-ghost btn-sm">Sign in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
