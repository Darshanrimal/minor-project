// src/pages/Donate.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { campaignAPI } from "../services/api";
import toast from "react-hot-toast";

// Devnet treasury — receives donations.
// Replace with your deployed Anchor program vault PDA in production.
const DEVNET_TREASURY = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";

export default function Donate() {
  const { id }          = useParams();
  const navigate        = useNavigate();
  const { connection }  = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  const [campaign, setCampaign]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [amount, setAmount]       = useState("");
  const [message, setMessage]     = useState("");
  const [donating, setDonating]   = useState(false);
  const [txSig, setTxSig]         = useState(null);
  const [balance, setBalance]     = useState(null);

  // Load campaign data
  useEffect(() => {
    campaignAPI.get(id)
      .then(r => setCampaign(r.data))
      .catch(() => navigate("/campaigns", { replace: true }))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  // Refresh wallet balance when publicKey changes
  useEffect(() => {
    if (!publicKey || !connection) { setBalance(null); return; }
    connection.getBalance(publicKey)
      .then(bal => setBalance(bal / LAMPORTS_PER_SOL))
      .catch(() => setBalance(null));
  }, [publicKey, connection]);

  const handleDonate = async () => {
    if (!connected || !publicKey) return toast.error("Connect your Phantom wallet first");

    const sol = parseFloat(amount);
    if (isNaN(sol) || sol <= 0)         return toast.error("Enter a valid amount");
    if (sol < 0.001)                    return toast.error("Minimum donation is 0.001 SOL");
    if (balance !== null && sol > balance)
      return toast.error(`Insufficient balance — you have ${balance.toFixed(4)} SOL`);

    setDonating(true);
    try {
      // Determine recipient wallet
      let recipientPubkey;
      try {
        const addr = campaign?.on_chain_address || DEVNET_TREASURY;
        recipientPubkey = new PublicKey(addr);
      } catch {
        recipientPubkey = new PublicKey(DEVNET_TREASURY);
      }

      const lamports = Math.floor(sol * LAMPORTS_PER_SOL);

      // Build the transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey:   recipientPubkey,
          lamports,
        })
      );

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer        = publicKey;

      // Request Phantom signature
      toast.loading("Waiting for wallet signature…", { id: "tx" });
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight:       false,
        preflightCommitment: "confirmed",
      });

      toast.loading("Confirming on Solana…", { id: "tx" });

      // Wait for on-chain confirmation
      const result = await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      if (result.value.err) {
        throw new Error("Transaction failed on-chain: " + JSON.stringify(result.value.err));
      }

      toast.success("Transaction confirmed! ⚡", { id: "tx" });

      // Record in backend DB
      await campaignAPI.donate(id, {
        amount_sol:   sol,
        tx_signature: signature,
        donor_wallet: publicKey.toBase58(),
        message:      message.trim() || undefined,
      });

      setTxSig(signature);

      // Refresh balance
      connection.getBalance(publicKey)
        .then(b => setBalance(b / LAMPORTS_PER_SOL))
        .catch(() => {});

    } catch (err) {
      console.error("Donation error:", err);
      toast.dismiss("tx");

      const msg = err.message || "";
      if (msg.toLowerCase().includes("rejected") ||
          msg.toLowerCase().includes("user rejected") ||
          err.name === "WalletSignTransactionError") {
        toast.error("Transaction cancelled by user");
      } else if (err.response?.data?.message) {
        toast.error("Error: " + err.response.data.message);
      } else {
        toast.error("Donation failed: " + (msg || "Unknown error"));
      }
    } finally {
      setDonating(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", minHeight:"60vh" }}>
      <div className="pulse" style={{ width:40, height:40, borderRadius:"50%", background:"var(--crimson)" }} />
    </div>
  );

  if (!campaign) return null;

  // ── Success screen ────────────────────────────────────────────────────────
  if (txSig) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--cream)", padding:24 }}>
      <div className="card fade-up" style={{ maxWidth:520, width:"100%", padding:40, textAlign:"center" }}>
        <div style={{ fontSize:64, marginBottom:16 }}>🎉</div>
        <h2 style={{ fontFamily:"var(--font-display)", fontSize:28, fontWeight:800, color:"var(--success)", marginBottom:8 }}>
          Donation Successful!
        </h2>
        <p style={{ color:"var(--stone)", marginBottom:24, lineHeight:1.7 }}>
          <strong style={{ color:"var(--ink)" }}>{parseFloat(amount).toFixed(4)} SOL</strong> donated to{" "}
          <strong style={{ color:"var(--ink)" }}>{campaign.title}</strong>.<br />
          Permanently recorded on the Solana blockchain.
        </p>

        <div style={{
          padding:16, borderRadius:12,
          background:"#E8F8EE", border:"1px solid #A8DDB5",
          marginBottom:24, textAlign:"left",
        }}>
          <div style={{ fontSize:11, color:"var(--stone)", marginBottom:6, textTransform:"uppercase", letterSpacing:".05em" }}>
            Transaction Signature
          </div>
          <code style={{ fontSize:11, wordBreak:"break-all", color:"var(--ink)", lineHeight:1.6 }}>
            {txSig}
          </code>
        </div>

        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          <a
            href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
            target="_blank" rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            View on Solana Explorer ↗
          </a>
          <Link to={`/campaigns/${id}`} className="btn btn-primary">
            Back to Campaign
          </Link>
        </div>
      </div>
    </div>
  );

  const pct = campaign.goal_amount > 0
    ? Math.min(100, Math.round((campaign.raised_amount / campaign.goal_amount) * 100))
    : 0;

  // ── Donation form ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:"var(--cream)", padding:"40px 0" }}>
      <div className="container" style={{ maxWidth:640 }}>
        <Link
          to={`/campaigns/${id}`}
          style={{ color:"var(--stone)", fontSize:13, display:"inline-flex", alignItems:"center", gap:6, marginBottom:24, textDecoration:"none" }}
        >
          ← Back to Campaign
        </Link>

        <div className="fade-up">
          {/* Campaign summary */}
          <div className="card" style={{ padding:24, marginBottom:20 }}>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:17, fontWeight:700, marginBottom:4 }}>
              {campaign.title}
            </h2>
            <p style={{ fontSize:13, color:"var(--stone)", marginBottom:14 }}>
              by {campaign.organization_name}
            </p>
            <div className="progress-bar" style={{ marginBottom:8 }}>
              <div className="progress-fill" style={{ width:`${pct}%` }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"var(--stone)" }}>
              <span>
                <strong style={{ color:"var(--crimson)" }}>{(+campaign.raised_amount).toFixed(4)} SOL</strong> raised
              </span>
              <span>Goal: {campaign.goal_amount} SOL ({pct}%)</span>
            </div>
          </div>

          {/* Donation form */}
          <div className="card" style={{ padding:32 }}>
            <h1 style={{ fontFamily:"var(--font-display)", fontSize:24, fontWeight:800, marginBottom:24 }}>
              Make a Donation
            </h1>

            {/* Wallet status */}
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"var(--stone)", marginBottom:8, textTransform:"uppercase", letterSpacing:".05em" }}>
                Your Phantom Wallet
              </div>
              {connected && publicKey ? (
                <div style={{
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"14px 16px", borderRadius:12,
                  background:"#E8F8EE", border:"1px solid #A8DDB5",
                }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, fontFamily:"monospace" }}>
                      {publicKey.toBase58().slice(0, 14)}…{publicKey.toBase58().slice(-6)}
                    </div>
                    {balance !== null && (
                      <div style={{ fontSize:12, color:"var(--stone)", marginTop:3 }}>
                        Balance: <strong>{balance.toFixed(4)} SOL</strong>
                      </div>
                    )}
                  </div>
                  <span className="badge badge-green">✓ Connected</span>
                </div>
              ) : (
                <div style={{ padding:20, borderRadius:12, background:"#FEF3CD", border:"1px solid #F6D860" }}>
                  <p style={{ fontSize:13, color:"#7D5A00", marginBottom:14, fontWeight:500 }}>
                    ⚠️ Connect your Phantom wallet to donate with SOL
                  </p>
                  <WalletMultiButton />
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="form-group" style={{ marginBottom:20 }}>
              <label className="form-label">Donation Amount (SOL)</label>
              <div style={{ position:"relative" }}>
                <input
                  className="form-input"
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.1"
                  min="0.001"
                  step="0.001"
                  style={{ paddingRight:52 }}
                />
                <span style={{
                  position:"absolute", right:16, top:"50%", transform:"translateY(-50%)",
                  color:"var(--stone)", fontSize:14, fontWeight:700,
                }}>
                  SOL
                </span>
              </div>
              {/* Quick-pick amounts */}
              <div style={{ display:"flex", gap:8, marginTop:8 }}>
                {[0.1, 0.5, 1, 5].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(String(v))}
                    className="btn btn-ghost btn-sm"
                    style={{
                      flex:1,
                      border:"1.5px solid",
                      borderColor: amount === String(v) ? "var(--crimson)" : "#DDD4C8",
                      color:       amount === String(v) ? "var(--crimson)" : "var(--stone)",
                      fontWeight:  amount === String(v) ? 700 : 400,
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional message */}
            <div className="form-group" style={{ marginBottom:24 }}>
              <label className="form-label">Message (optional)</label>
              <input
                className="form-input"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Leave an encouraging message…"
                maxLength={200}
              />
            </div>

            {/* Summary box */}
            {amount && parseFloat(amount) > 0 && (
              <div style={{
                padding:16, borderRadius:12,
                background:"rgba(192,57,43,.04)", border:"1px solid rgba(192,57,43,.12)",
                marginBottom:20, fontSize:14,
              }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ color:"var(--stone)" }}>Donation</span>
                  <strong>{parseFloat(amount).toFixed(4)} SOL</strong>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ color:"var(--stone)" }}>Network fee (approx.)</span>
                  <span style={{ color:"var(--stone)" }}>~0.000005 SOL</span>
                </div>
                <hr style={{ border:"none", borderTop:"1px solid rgba(192,57,43,.12)", margin:"8px 0" }} />
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontWeight:700 }}>Total from wallet</span>
                  <strong style={{ color:"var(--crimson)" }}>
                    ≈ {parseFloat(amount).toFixed(4)} SOL
                  </strong>
                </div>
              </div>
            )}

            {/* Donate button */}
            <button
              type="button"
              className="btn btn-primary btn-full btn-lg"
              onClick={handleDonate}
              disabled={donating || !connected || !amount || parseFloat(amount) <= 0}
            >
              {donating
                ? "Processing… Check Phantom"
                : !connected
                  ? "Connect Wallet to Donate"
                  : `Donate ${amount && parseFloat(amount) > 0
                      ? parseFloat(amount).toFixed(4) + " SOL"
                      : ""} ⚡`
              }
            </button>

            <p style={{ textAlign:"center", fontSize:12, color:"var(--stone)", marginTop:12 }}>
              Signed by Phantom · Recorded on Solana{" "}
              {import.meta.env.VITE_SOLANA_NETWORK || "devnet"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
