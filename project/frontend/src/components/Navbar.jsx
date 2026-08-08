import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useAuth } from "../services/AuthContext";
import { useTheme } from "../services/ThemeContext";
import { authAPI } from "../services/api";
import toast from "react-hot-toast";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    if (!user || !publicKey) return;
    const walletStr = publicKey.toBase58();
    if (user.wallet_address === walletStr) return;
    authAPI.linkWallet(walletStr).catch(() => {});
  }, [publicKey, user]);

  useEffect(() => {
    if (!publicKey || !connection || !connected) {
      setBalance(null);
      return;
    }

    const fetchBalance = () =>
      connection
        .getBalance(publicKey)
        .then((lamports) => setBalance(lamports / LAMPORTS_PER_SOL))
        .catch(() => setBalance(null));

    fetchBalance();
    const id = connection.onAccountChange(publicKey, fetchBalance);
    return () => connection.removeAccountChangeListener(id);
  }, [publicKey, connection, connected]);

  const handleLogout = () => {
    logout();
    navigate("/");
    toast.success("Logged out");
  };

  const navLinks = [
    { to: "/campaigns", label: "Campaigns" },
    ...(user
      ? [
          { to: "/dashboard", label: "Dashboard" },
          { to: "/history", label: "My Donations" },
          { to: "/profile", label: "Profile" },
        ]
      : []),
    ...(user?.role === "admin" ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  const shortWallet = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : null;

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        height: "var(--nav-h)",
        display: "flex",
        alignItems: "center",
        background: dark ? "rgba(17,22,28,.84)" : "rgba(247,243,236,.82)",
        backdropFilter: "blur(18px)",
        borderBottom: dark ? "1px solid rgba(255,255,255,.06)" : "1px solid rgba(31,41,51,.08)",
      }}
    >
      <div className="container" style={{ display: "flex", alignItems: "center", gap: 18, width: "100%" }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              background: "linear-gradient(135deg,var(--obsidian),var(--terracotta))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 16,
              boxShadow: "0 12px 24px rgba(31,41,51,.14)",
            }}
          >
            N
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: "var(--ink)" }}>
              NepalDaan
            </span>
            <span style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--stone)" }}>
              Charity Platform
            </span>
          </div>
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
            minWidth: 0,
            padding: "6px",
            borderRadius: 999,
            background: dark ? "rgba(255,255,255,.04)" : "rgba(255,253,249,.66)",
            border: dark ? "1px solid rgba(255,255,255,.06)" : "1px solid rgba(31,41,51,.06)",
          }}
        >
          {navLinks.map((link) => {
            const active = pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  padding: "9px 14px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  color: active ? (dark ? "#182029" : "#fff") : "var(--ink-soft)",
                  background: active ? (dark ? "var(--sand)" : "var(--obsidian)") : "transparent",
                  boxShadow: active ? "0 8px 18px rgba(31,41,51,.12)" : "none",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {connected && publicKey && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 999,
                background: dark ? "rgba(107,143,113,.14)" : "rgba(107,143,113,.10)",
                border: "1px solid rgba(107,143,113,.18)",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--success)",
              }}
            >
              <span style={{ fontFamily: "monospace" }}>{shortWallet}</span>
              <span style={{ width: 1, height: 12, background: "rgba(107,143,113,.25)" }} />
              <span>{balance !== null ? `${balance.toFixed(3)} SOL` : "-- SOL"}</span>
            </div>
          )}

          <WalletMultiButton />

          <button
            onClick={toggle}
            title={dark ? "Light mode" : "Dark mode"}
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              border: dark ? "1px solid rgba(255,255,255,.08)" : "1px solid rgba(31,41,51,.08)",
              background: dark ? "rgba(255,255,255,.04)" : "rgba(255,253,249,.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              color: "var(--ink)",
            }}
          >
            {dark ? "L" : "D"}
          </button>

          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{user.username}</div>
                <div style={{ fontSize: 11, textTransform: "capitalize", color: "var(--stone)" }}>
                  {(user.role || "").replace("_", " ")}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
