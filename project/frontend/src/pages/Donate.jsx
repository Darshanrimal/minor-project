import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { campaignAPI, donationAPI } from "../services/api";
import { useTheme } from "../services/ThemeContext";
import { generateReceipt } from "../utils/generateReceipt";
import toast from "react-hot-toast";

const DEVNET_TREASURY = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";
const ESEWA_URL = import.meta.env.VITE_ESEWA_URL || "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
const ESEWA_PRODUCT_CODE = import.meta.env.VITE_ESEWA_PRODUCT_CODE || "EPAYTEST";
const REAL_ESEWA_URL = import.meta.env.VITE_ESEWA_URL || ESEWA_URL;
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

function parsePositiveNumber(value) {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function buildPhantomMemo({ campaignId, amountSol, donorWallet, message }) {
  return JSON.stringify({
    type: "sol_donation",
    campaign_id: campaignId,
    amount_sol: amountSol,
    donor_wallet: donorWallet,
    message: message || null,
    ts: new Date().toISOString(),
  });
}

export default function Donate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { connection } = useConnection();
  const { dark } = useTheme();
  const { publicKey, sendTransaction, connected } = useWallet();

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payMethod, setPayMethod] = useState("phantom");
  const [solAmount, setSolAmount] = useState("");
  const [nprAmount, setNprAmount] = useState("");
  const [message, setMessage] = useState("");
  const [donating, setDonating] = useState(false);
  const [solSuccess, setSolSuccess] = useState(null);
  const [balance, setBalance] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const bg = dark ? "#0F1117" : "var(--cream)";
  const cardBg = dark ? "#1E2028" : "#FFFFFF";
  const border = dark ? "rgba(255,255,255,.08)" : "#EDE8E3";
  const text = dark ? "#F0F0F5" : "var(--ink)";
  const muted = dark ? "rgba(240,240,245,.45)" : "var(--stone)";

  const fetchCampaign = async () => {
    const response = await campaignAPI.get(id);
    setCampaign(response.data);
    return response.data;
  };

  useEffect(() => {
    fetchCampaign()
      .catch(() => navigate("/campaigns", { replace: true }))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    if (!publicKey || !connection) {
      setBalance(null);
      return;
    }

    connection
      .getBalance(publicKey)
      .then((lamports) => setBalance(lamports / LAMPORTS_PER_SOL))
      .catch(() => setBalance(null));
  }, [publicKey, connection]);

  const handlePhantomDonate = async () => {
    if (!connected || !publicKey) {
      return toast.error("Connect your Phantom wallet first");
    }

    const parsedSol = parsePositiveNumber(solAmount);
    if (!parsedSol) {
      return toast.error("Enter a valid SOL amount");
    }
    if (parsedSol < 0.001) {
      return toast.error("Minimum donation is 0.001 SOL");
    }
    if (balance !== null && parsedSol > balance) {
      return toast.error(`Insufficient balance. You have ${balance.toFixed(4)} SOL`);
    }

    setDonating(true);
    try {
      let recipient;
      try {
        recipient = new PublicKey(campaign?.on_chain_address || DEVNET_TREASURY);
      } catch (_) {
        recipient = new PublicKey(DEVNET_TREASURY);
      }

      const lamports = Math.floor(parsedSol * LAMPORTS_PER_SOL);
      const memo = buildPhantomMemo({
        campaignId: id,
        amountSol: parsedSol,
        donorWallet: publicKey.toBase58(),
        message: message.trim() || null,
      });
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipient,
          lamports,
        }),
        new TransactionInstruction({
          keys: [],
          programId: MEMO_PROGRAM_ID,
          data: new TextEncoder().encode(memo),
        })
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      toast.loading("Waiting for Phantom signature...", { id: "tx" });
      const signature = await sendTransaction(tx, connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      toast.loading("Confirming on Solana...", { id: "tx" });
      const result = await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed"
      );
      if (result.value.err) {
        throw new Error("Transaction failed on-chain");
      }

      const response = await campaignAPI.donate(id, {
        amount_sol: parsedSol,
        tx_signature: signature,
        donor_wallet: publicKey.toBase58(),
        message: message.trim() || undefined,
      });

      setSolSuccess(response.data?.donation || { tx_signature: signature, amount_sol: parsedSol });
      await fetchCampaign();
      toast.success("Donation confirmed.", { id: "tx" });
    } catch (err) {
      toast.dismiss("tx");
      const messageText = err?.response?.data?.message || err?.message || "Unknown error";
      if (messageText.toLowerCase().includes("reject") || err?.name === "WalletSignTransactionError") {
        toast.error("Transaction cancelled");
      } else {
        toast.error(`Donation failed: ${messageText}`);
      }
    } finally {
      setDonating(false);
    }
  };

  const handleEsewaPay = async (mode = "demo") => {
    const parsedNpr = parsePositiveNumber(nprAmount);
    if (!parsedNpr || parsedNpr < 10) {
      return toast.error("Minimum donation is Rs. 10");
    }

    const totalAmount = parsedNpr.toFixed(2);
    const transactionUuid = `campaign-${id}-${Date.now()}`;

    if (mode === "demo") {
      const params = new URLSearchParams({
        campaign_id: String(id),
        amount: totalAmount,
        transaction_uuid: transactionUuid,
        source: "demo",
      });

      if (message.trim()) {
        params.set("message", message.trim());
      }

      try {
        sessionStorage.setItem(
          "nepaldann:pending-esewa",
          JSON.stringify({
            campaign_id: id,
            amount_npr: totalAmount,
            transaction_uuid: transactionUuid,
            payment_source: "demo",
            message: message.trim() || "",
          })
        );
      } catch (storageError) {
        console.warn("Unable to persist pending demo eSewa state:", storageError);
      }

      navigate(`/esewa/test-gateway?${params.toString()}`);
      return;
    }

    setDonating(true);
    try {
      const successUrl = new URL(`${window.location.origin}/esewa/success`);
      successUrl.searchParams.set("campaign_id", id);
      successUrl.searchParams.set("amount", totalAmount);
      successUrl.searchParams.set("source", "real");
      if (message.trim()) {
        successUrl.searchParams.set("message", message.trim());
      }

      sessionStorage.setItem(
        "nepaldann:pending-esewa",
        JSON.stringify({
          campaign_id: id,
          amount_npr: totalAmount,
          transaction_uuid: transactionUuid,
          payment_source: "real",
          message: message.trim() || "",
        })
      );

      const { data } = await donationAPI.esewaSignature({
        total_amount: totalAmount,
        transaction_uuid: transactionUuid,
        product_code: ESEWA_PRODUCT_CODE,
      });

      const params = {
        amount: totalAmount,
        tax_amount: "0",
        total_amount: totalAmount,
        transaction_uuid: transactionUuid,
        product_code: data.product_code || ESEWA_PRODUCT_CODE,
        product_service_charge: "0",
        product_delivery_charge: "0",
        success_url: successUrl.toString(),
        failure_url: `${window.location.origin}/esewa/failure?source=real`,
        signed_field_names: "total_amount,transaction_uuid,product_code",
        signature: data.signature,
      };

      const form = document.createElement("form");
      form.method = "POST";
      form.action = REAL_ESEWA_URL;

      Object.entries(params).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      toast.error("Real eSewa is unavailable right now. Use Demo eSewa for presentation.");
      console.error("eSewa init error:", err);
      setDonating(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!solSuccess || !campaign) {
      return;
    }

    setDownloading(true);
    try {
      const filename = await generateReceipt({
        donorWallet: publicKey?.toBase58() || solSuccess.donor_wallet || "Unknown",
        campaignTitle: campaign.title,
        amountSol: parsePositiveNumber(solSuccess.amount_sol) || 0,
        txSignature: solSuccess.tx_signature,
        campaignId: id,
      });
      toast.success(`Receipt downloaded: ${filename}`);
    } catch (_) {
      toast.error("Failed to generate receipt");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
          background: bg,
        }}
      >
        <div className="pulse" style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--crimson)" }} />
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  const goalAmount = parsePositiveNumber(campaign.goal_amount) || 0;
  const totalSolDirect = parsePositiveNumber(campaign.donation_summary?.total_sol_direct) || 0;
  const totalNprDirect = parsePositiveNumber(campaign.donation_summary?.total_npr_direct) || 0;

  if (solSuccess) {
    return (
      <div className="editorial-stage" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: bg, padding: 24 }}>
        <div
          className="fade-up"
          style={{
            maxWidth: 540,
            width: "100%",
            padding: 40,
            textAlign: "center",
            borderRadius: 24,
            background: cardBg,
            border: `1px solid ${border}`,
            boxShadow: dark ? "0 24px 64px rgba(0,0,0,.5)" : "var(--shadow-lg)",
          }}
        >
          <div className="editorial-kicker" style={{ marginBottom: 12 }}>Donation recorded</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--success)", marginBottom: 8 }}>
            Donation Successful
          </h2>
          <p style={{ color: muted, marginBottom: 28, lineHeight: 1.7 }}>
            <strong style={{ color: text }}>{(parsePositiveNumber(solSuccess.amount_sol) || 0).toFixed(4)} SOL</strong> donated to{" "}
            <strong style={{ color: text }}>{campaign.title}</strong>.
            Verified on Solana with donation metadata.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
            <a
              href={`https://explorer.solana.com/tx/${solSuccess.tx_signature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 20px",
                borderRadius: 12,
                background: dark ? "rgba(59,158,255,.12)" : "#D3EAF8",
                color: "#2980B9",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                border: "1px solid rgba(59,158,255,.2)",
              }}
            >
              View on Solana Explorer
            </a>
            <button
              onClick={handleDownloadReceipt}
              disabled={downloading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 20px",
                borderRadius: 12,
                border: "none",
                background: downloading ? (dark ? "rgba(255,255,255,.06)" : "#EDE8E3") : "linear-gradient(135deg,var(--crimson),var(--saffron))",
                color: downloading ? muted : "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: downloading ? "wait" : "pointer",
              }}
            >
              {downloading ? "Generating..." : "Download PDF Receipt"}
            </button>
          </div>
          <Link to={`/campaigns/${id}`} style={{ fontSize: 13, color: muted, textDecoration: "underline" }}>
            Back to Campaign
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="editorial-stage" style={{ background: bg }}>
      <div className="container" style={{ maxWidth: 760 }}>
        <Link to={`/campaigns/${id}`} className="eyebrow-link" style={{ marginBottom: 24 }}>
          Back to Campaign
        </Link>

        <div className="editorial-shell fade-up">
          <div className="editorial-card" style={{ background: cardBg, border: `1px solid ${border}` }}>
            <div className="editorial-kicker">Giving studio</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px,4vw,52px)", fontWeight: 700, marginBottom: 4, color: text, lineHeight: 0.95, letterSpacing: "-0.05em", maxWidth: "11ch" }}>{campaign.title}</h2>
            <p style={{ fontSize: 13, color: muted, marginBottom: 14 }}>by {campaign.organization_name}</p>
            <div className="dual-stat-grid">
              <div className="dual-stat-card sol">
                <div className="dual-stat-label">
                  Collected SOL
                </div>
                <div className="dual-stat-value sol">
                  {totalSolDirect.toFixed(4)} SOL
                </div>
              </div>
              <div className="dual-stat-card esewa">
                <div className="dual-stat-label">
                  Collected Rs
                </div>
                <div className="dual-stat-value esewa">
                  Rs {totalNprDirect.toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: muted, marginTop: 10 }}>Goal: {goalAmount.toFixed(4)} SOL</div>
            <div className="data-chip-row" style={{ marginTop: 12 }}>
              <div className="data-chip">Phantom {totalSolDirect.toFixed(4)} SOL</div>
              <div className="data-chip">eSewa Rs {totalNprDirect.toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
              <div style={{ fontSize: 12, color: muted, marginTop: 8 }}>
                Phantom: {totalSolDirect.toFixed(4)} SOL | eSewa: Rs {totalNprDirect.toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              {payMethod === "esewa" && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  background: dark ? "rgba(96,187,70,.08)" : "#F0FBF0",
                  border: "1px solid rgba(96,187,70,.18)",
                  color: dark ? "#9BE189" : "#2D7A1F",
                  fontSize: 12,
                }}
              >
                eSewa payments are collected in NPR and shown separately so the campaign totals stay easy to read.
              </div>
            )}
          </div>

          <div className="editorial-card" style={{ background: cardBg, border: `1px solid ${border}` }}>
            <div className="step-rail" style={{ marginBottom: 22 }}>
              <div className="step-chip active">
                <span className="step-chip-label">Step 01</span>
                <strong>Enter amount</strong>
              </div>
              <div className="step-chip active">
                <span className="step-chip-label">Step 02</span>
                <strong>Choose rail</strong>
              </div>
              <div className="step-chip">
                <span className="step-chip-label">Step 03</span>
                <strong>Confirm payment</strong>
              </div>
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,4vw,44px)", fontWeight: 700, marginBottom: 24, color: text, lineHeight: 0.95, letterSpacing: "-0.05em" }}>
              Make a Donation
            </h1>

            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".05em" }}>
                Choose Payment Method
              </div>
              <div className="payment-switch">
                <button
                  type="button"
                  onClick={() => setPayMethod("phantom")}
                  className={["payment-option", payMethod === "phantom" ? "active-phantom" : ""].join(" ")}
                  style={{ cursor: "pointer" }}
                >
                  <div className="payment-mark phantom">P</div>
                  <div className="payment-heading" style={{ color: payMethod === "phantom" ? "var(--crimson)" : text }}>Phantom</div>
                  <div className="payment-note">SOL transfer plus Solana verification record</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPayMethod("esewa")}
                  className={["payment-option", payMethod === "esewa" ? "active-esewa" : ""].join(" ")}
                  style={{ cursor: "pointer" }}
                >
                  <div className="payment-mark esewa">e-</div>
                  <div className="payment-heading" style={{ color: payMethod === "esewa" ? "#60BB46" : text }}>eSewa</div>
                  <div className="payment-note">NPR payment plus Solana verification record</div>
                </button>
              </div>
            </div>

            {payMethod === "phantom" && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>
                    Your Phantom Wallet
                  </div>
                  {connected && publicKey ? (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "14px 16px",
                        borderRadius: 14,
                        background: dark ? "rgba(39,174,96,.08)" : "#E8F8EE",
                        border: `1px solid ${dark ? "rgba(39,174,96,.2)" : "#A8DDB5"}`,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "monospace", color: text }}>
                          {publicKey.toBase58().slice(0, 14)}...{publicKey.toBase58().slice(-6)}
                        </div>
                        {balance !== null && (
                          <div style={{ fontSize: 12, color: muted, marginTop: 3 }}>
                            Balance: <strong style={{ color: "#E67E22" }}>{balance.toFixed(4)} SOL</strong>
                          </div>
                        )}
                      </div>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 100,
                          fontSize: 11,
                          fontWeight: 700,
                          background: "rgba(39,174,96,.15)",
                          color: "#27AE60",
                        }}
                      >
                        Connected
                      </span>
                    </div>
                  ) : (
                    <div style={{ padding: 20, borderRadius: 14, background: dark ? "rgba(241,196,15,.08)" : "#FEF3CD", border: `1px solid ${dark ? "rgba(241,196,15,.2)" : "#F6D860"}` }}>
                      <p style={{ fontSize: 13, color: dark ? "#F1C40F" : "#7D5A00", marginBottom: 14, fontWeight: 500 }}>
                        Connect your Phantom wallet to donate with SOL
                      </p>
                      <WalletMultiButton />
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Donation Amount (SOL)</label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="form-input"
                      type="number"
                      value={solAmount}
                      onChange={(e) => setSolAmount(e.target.value)}
                      placeholder="0.1"
                      min="0.001"
                      step="0.001"
                      style={{ paddingRight: 52 }}
                    />
                    <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: muted, fontSize: 14, fontWeight: 700 }}>
                      SOL
                    </span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label className="form-label">Message (optional)</label>
                  <input
                    className="form-input"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Leave an encouraging message..."
                    maxLength={200}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-full btn-lg"
                  onClick={handlePhantomDonate}
                  disabled={donating || !connected || !(parsePositiveNumber(solAmount) > 0)}
                  style={{ marginBottom: 12 }}
                >
                  {donating ? "Processing..." : "Donate with Phantom"}
                </button>
                <p style={{ textAlign: "center", fontSize: 12, color: muted }}>
                  Verified on Solana Devnet with transfer and memo metadata
                </p>
              </div>
            )}

            {payMethod === "esewa" && (
              <div>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Donation Amount (NPR)</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: muted, fontSize: 13, fontWeight: 700 }}>
                      Rs.
                    </span>
                    <input
                      className="form-input"
                      type="number"
                      value={nprAmount}
                      onChange={(e) => setNprAmount(e.target.value)}
                      placeholder="100"
                      min="10"
                      step="1"
                      style={{ paddingLeft: 44, paddingRight: 52 }}
                    />
                    <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: muted, fontSize: 13, fontWeight: 700 }}>
                      NPR
                    </span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label className="form-label">Message (optional)</label>
                  <input
                    className="form-input"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Leave an encouraging message..."
                    maxLength={200}
                  />
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
                    Choose eSewa Mode
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEsewaPay("demo")}
                    disabled={donating || !(parsePositiveNumber(nprAmount) >= 10)}
                    style={{
                      width: "100%",
                      padding: "15px 18px",
                      borderRadius: 14,
                      border: "none",
                      background: donating || !(parsePositiveNumber(nprAmount) >= 10)
                        ? (dark ? "rgba(255,255,255,.06)" : "#EDE8E3")
                        : "linear-gradient(135deg,#60BB46,#3D8C2A)",
                      color: donating || !(parsePositiveNumber(nprAmount) >= 10) ? muted : "#fff",
                      fontSize: 16,
                      fontWeight: 800,
                      cursor: donating || !(parsePositiveNumber(nprAmount) >= 10) ? "not-allowed" : "pointer",
                      fontFamily: "var(--font-display)",
                      marginBottom: 10,
                    }}
                  >
                    {donating ? "Opening Demo eSewa..." : "Pay with Demo eSewa"}
                  </button>
                  <p style={{ textAlign: "center", fontSize: 12, color: muted, marginTop: 0, lineHeight: 1.6, marginBottom: 16 }}>
                    Always works inside the app and is best for presentations.
                  </p>

                  <button
                    type="button"
                    onClick={() => handleEsewaPay("real")}
                    disabled={donating || !(parsePositiveNumber(nprAmount) >= 10)}
                    style={{
                      width: "100%",
                      padding: "15px 18px",
                      borderRadius: 14,
                      border: `2px solid ${dark ? "#7FD066" : "#60BB46"}`,
                      background: donating || !(parsePositiveNumber(nprAmount) >= 10)
                        ? (dark ? "rgba(255,255,255,.03)" : "#F7F7F5")
                        : (dark ? "rgba(96,187,70,.08)" : "#F3FBF0"),
                      color: donating || !(parsePositiveNumber(nprAmount) >= 10) ? muted : "#2D7A1F",
                      fontSize: 16,
                      fontWeight: 800,
                      cursor: donating || !(parsePositiveNumber(nprAmount) >= 10) ? "not-allowed" : "pointer",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {donating ? "Redirecting to Real eSewa..." : "Pay with Real eSewa"}
                  </button>
                  <p style={{ textAlign: "center", fontSize: 12, color: muted, marginTop: 10, lineHeight: 1.6, marginBottom: 0 }}>
                    Opens the official EPAYTEST sandbox when eSewa RC is available.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}






