import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import toast from "react-hot-toast";
import { campaignAPI, donationAPI } from "../services/api";
import { useTheme } from "../services/ThemeContext";
import { useAuth } from "../services/AuthContext";
import { generateReceipt } from "../utils/generateReceipt";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

function parsePositiveNumber(value) {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function readPendingEsewa() {
  try {
    return JSON.parse(sessionStorage.getItem("nepaldann:pending-esewa") || "null");
  } catch (_) {
    return null;
  }
}

function decodeEsewaData(encoded) {
  if (!encoded) {
    return {};
  }

  try {
    return JSON.parse(window.atob(encoded));
  } catch (_) {
    return {};
  }
}

function isTreasuryFundingError(message) {
  const text = String(message || "").toLowerCase();
  return text.includes("treasury wallet") && text.includes("no sol");
}

export default function EsewaSuccess() {
  const [searchParams] = useSearchParams();
  const { dark } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const { connection } = useConnection();
  const { connected, publicKey, sendTransaction } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();

  const [status, setStatus] = useState("recording");
  const [summary, setSummary] = useState(null);
  const [errMsg, setErrMsg] = useState("");
  const [fallbackReady, setFallbackReady] = useState(false);
  const [recordingOnChain, setRecordingOnChain] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState("");
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const hasRecorded = useRef(false);

  const bg = dark ? "#0F1117" : "var(--cream)";
  const cardBg = dark ? "#1E2028" : "#FFFFFF";
  const border = dark ? "rgba(255,255,255,.08)" : "#EDE8E3";
  const muted = dark ? "rgba(240,240,245,.45)" : "var(--stone)";

  const donationPayload = useMemo(() => {
    const callbackData = decodeEsewaData(searchParams.get("data"));
    const pending = readPendingEsewa();

    const campaignId = parseInt(
      searchParams.get("campaign_id") ||
        callbackData.campaign_id ||
        pending?.campaign_id,
      10
    );
    const amountNpr = parsePositiveNumber(
      callbackData.total_amount ||
        callbackData.amount ||
        searchParams.get("amount") ||
        pending?.amount_npr
    );
    const transactionUuid =
      callbackData.transaction_uuid ||
      callbackData.transaction_code ||
      searchParams.get("transaction_uuid") ||
      pending?.transaction_uuid ||
      "";
    const esewaRefId =
      searchParams.get("refId") ||
      callbackData.transaction_code ||
      callbackData.ref_id ||
      transactionUuid;
    const paymentStatus = String(
      callbackData.status || searchParams.get("status") || "COMPLETE"
    ).toUpperCase();
    const message = searchParams.get("message") || pending?.message || "";
    const paymentSource = (() => {
      const explicitSource = String(
        searchParams.get("source") || callbackData.payment_source || pending?.payment_source || ""
      ).toLowerCase();
      if (explicitSource === "demo" || explicitSource === "real") return explicitSource;
      if (String(esewaRefId || "").startsWith("DEMO-")) return "demo";
      return "real";
    })();

    return {
      callbackData,
      campaignId: Number.isNaN(campaignId) ? null : campaignId,
      amountNpr,
      transactionUuid,
      esewaRefId,
      paymentStatus,
      paymentSource,
      message,
    };
  }, [searchParams]);

  async function submitDonation(extra = {}) {
    const response = await donationAPI.recordEsewa({
      campaign_id: donationPayload.campaignId,
      amount_npr: donationPayload.amountNpr,
      esewa_ref_id: donationPayload.esewaRefId,
      transaction_uuid: donationPayload.transactionUuid || undefined,
      message: donationPayload.message || undefined,
      callback_payload: donationPayload.callbackData,
      ...extra,
    });

    const donation = response.data?.donation;
    setSummary({
      amount_npr: donation?.amount_npr || donationPayload.amountNpr,
      campaign_id: donation?.campaign_id || donationPayload.campaignId,
      esewa_ref_id: donation?.esewa_ref_id || donationPayload.esewaRefId,
      blockchain_ref: donation?.blockchain_ref || extra.blockchain_ref || null,
      payment_source: donationPayload.paymentSource,
    });
    sessionStorage.removeItem("nepaldann:pending-esewa");
    setFallbackReady(false);
    setStatus("success");
    toast.success("eSewa donation recorded.");
  }

  async function writeMemoWithWallet() {
    if (!connected || !publicKey) {
      throw new Error("Connect Phantom to record the donation on Solana.");
    }

    const memo = JSON.stringify({
      type: "esewa_donation",
      ref: donationPayload.esewaRefId,
      amount_npr: donationPayload.amountNpr,
      campaign_id: donationPayload.campaignId,
      user_id: user?.id || null,
      transaction_uuid: donationPayload.transactionUuid || null,
      ts: new Date().toISOString(),
    });

    const transaction = new Transaction().add(
      new TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: new TextEncoder().encode(memo),
      })
    );

    const signature = await sendTransaction(transaction, connection, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction(
      {
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      "confirmed"
    );

    return signature;
  }

  async function handleWalletFallback() {
    setRecordingOnChain(true);
    setErrMsg("");

    try {
      const signature = await writeMemoWithWallet();
      await submitDonation({
        blockchain_ref: signature,
        donor_wallet: publicKey?.toBase58() || "esewa",
      });
    } catch (error) {
      setStatus("error");
      setFallbackReady(true);
      setErrMsg(error?.message || "Could not write the Solana reference from Phantom.");
    } finally {
      setRecordingOnChain(false);
    }
  }

  function handleWalletAction() {
    if (recordingOnChain) return;
    if (!connected) {
      setWalletModalVisible(true);
      return;
    }
    handleWalletFallback();
  }

  async function handleDownloadReceipt() {
    if (!summary) return;

    setDownloadingReceipt(true);
    try {
      const filename = await generateReceipt({
        donorWallet: publicKey?.toBase58() || "eSewa donor",
        donorName: user?.username || "NepalDaan Donor",
        campaignTitle: campaignTitle || `Campaign #${summary.campaign_id}`,
        amountLabel: `Rs. ${parseFloat(summary.amount_npr || 0).toLocaleString("en-NP", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        txSignature: summary.blockchain_ref || "",
        transactionLabel: "Solana Transaction Reference",
        campaignId: summary.campaign_id,
        paymentMethod: "esewa",
        referenceId: summary.esewa_ref_id,
      });
      toast.success(`Receipt downloaded: ${filename}`);
    } catch (error) {
      toast.error(error?.message || "Could not generate the receipt PDF.");
    } finally {
      setDownloadingReceipt(false);
    }
  }

  useEffect(() => {
    if (authLoading || hasRecorded.current) {
      return;
    }

    if (!user) {
      setStatus("auth_error");
      return;
    }

    hasRecorded.current = true;

    if (!donationPayload.campaignId || !donationPayload.amountNpr || !donationPayload.esewaRefId) {
      setStatus("error");
      setErrMsg("Missing payment details in the eSewa callback.");
      return;
    }

    if (!["COMPLETE", "SUCCESS", "SUCCESSFUL"].includes(donationPayload.paymentStatus)) {
      setStatus("error");
      setErrMsg(`eSewa returned status "${donationPayload.paymentStatus}".`);
      return;
    }

    submitDonation().catch((error) => {
      if (error?.response?.status === 409) {
        setSummary({
          amount_npr: donationPayload.amountNpr,
          campaign_id: donationPayload.campaignId,
          esewa_ref_id: donationPayload.esewaRefId,
          blockchain_ref: null,
          payment_source: donationPayload.paymentSource,
        });
        setStatus("success");
        sessionStorage.removeItem("nepaldann:pending-esewa");
        toast.success("Donation already recorded.");
        return;
      }

      const serverMessage = error?.response?.data?.message || error?.message || "Recording failed";
      if (isTreasuryFundingError(serverMessage)) {
        setStatus("wallet_required");
        setFallbackReady(true);
        setErrMsg(serverMessage);
        return;
      }

      setStatus("error");
      setErrMsg(serverMessage);
    });
  }, [authLoading, donationPayload, user]);

  useEffect(() => {
    if (status === "wallet_required" && fallbackReady && connected && publicKey && !recordingOnChain) {
      handleWalletFallback();
    }
  }, [connected, fallbackReady, publicKey, recordingOnChain, status]);

  useEffect(() => {
    if (!donationPayload.campaignId) return;

    campaignAPI
      .get(donationPayload.campaignId)
      .then((response) => setCampaignTitle(response.data?.title || ""))
      .catch(() => setCampaignTitle(""));
  }, [donationPayload.campaignId]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: bg,
        padding: 24,
      }}
    >
      <div
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
        {(status === "recording" || authLoading || recordingOnChain) && (
          <>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: "4px solid rgba(96,187,70,.2)",
                borderTopColor: "#60BB46",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 20px",
              }}
            />
            <h2 style={{ fontSize: 22, fontWeight: 800, color: muted }}>
              {recordingOnChain ? "Recording on Solana..." : "Recording donation..."}
            </h2>
            <p style={{ fontSize: 13, color: muted, marginTop: 8 }}>
              Please wait and keep this page open.
            </p>
          </>
        )}

        {status === "auth_error" && (
          <>
            <div style={{ fontSize: 56, marginBottom: 16 }}>Login</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--crimson)", marginBottom: 12 }}>
              Session Expired
            </h2>
            <p style={{ color: muted, marginBottom: 20, lineHeight: 1.7 }}>
              eSewa returned successfully, but we could not finish recording because your login session expired.
            </p>
            <Link to="/login" style={btnStyle("#60BB46")}>Log In Again</Link>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{ fontSize: 64, marginBottom: 8, color: "var(--ink)" }}>Success</div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 999,
                background: summary?.payment_source === "demo" ? (dark ? "rgba(96,187,70,.12)" : "#F0FBF0") : (dark ? "rgba(44,132,201,.14)" : "#EAF4FD"),
                color: summary?.payment_source === "demo" ? "#2D7A1F" : "#2C84C9",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: ".04em",
                textTransform: "uppercase",
                marginBottom: 18,
              }}
            >
              {summary?.payment_source === "demo" ? "Demo eSewa" : "Real eSewa EPAYTEST"}
            </div>
            <h2
              style={{
                fontSize: 34,
                fontWeight: 800,
                color: "#6B8F71",
                marginBottom: 18,
                lineHeight: 1.18,
                letterSpacing: "-0.03em",
              }}
            >
              Donation
              <br />
              Successful
            </h2>
            <p style={{ color: muted, marginBottom: 28, lineHeight: 1.8, fontSize: 15 }}>
              <strong>Rs. {parseFloat(summary?.amount_npr || 0).toLocaleString("en-NP", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</strong>{" "}
              donated to <strong>{campaignTitle || `Campaign #${summary?.campaign_id || ""}`}</strong>. {summary?.payment_source === "demo" ? "Completed through the in-app eSewa demo gateway" : "Returned from the official eSewa EPAYTEST sandbox"} and verified on
              Solana with donation metadata.
            </p>


            {summary?.esewa_ref_id && <RefBox refId={summary.esewa_ref_id} dark={dark} muted={muted} />}

            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
              {summary?.blockchain_ref ? (
                <a
                  href={`https://explorer.solana.com/tx/${summary.blockchain_ref}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={actionBtnStyle("#D9ECFA", "#2C84C9")}
                >
                  View on Solana Explorer
                </a>
              ) : null}

              <button
                type="button"
                onClick={handleDownloadReceipt}
                disabled={downloadingReceipt}
                style={actionBtnStyle("linear-gradient(135deg, #C97A5A, #D8B38A)", "#FFFFFF")}
              >
                {downloadingReceipt ? "Preparing PDF..." : "Download PDF Receipt"}
              </button>
            </div>

            <div>
              <Link to={`/campaigns/${summary?.campaign_id || ""}`} style={{ fontSize: 13, color: muted, textDecoration: "underline" }}>
                Back to Campaign
              </Link>
            </div>
          </>
        )}

        {status === "wallet_required" && (
          <>
            <div style={{ fontSize: 56, marginBottom: 16 }}>Wallet</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#60BB46", marginBottom: 12 }}>
              Finish Solana Recording
            </h2>
            <p style={{ color: muted, marginBottom: 12, lineHeight: 1.7 }}>
              eSewa payment succeeded, but the backend treasury wallet has no devnet SOL. Connect Phantom and we will write the Solana reference from your wallet instead.
            </p>
            {errMsg && (
              <p
                style={{
                  fontSize: 12,
                  color: "var(--crimson)",
                  marginBottom: 16,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "rgba(232,64,64,.08)",
                }}
              >
                {errMsg}
              </p>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleWalletAction}
              disabled={recordingOnChain}
            >
              {connected ? "Record on Solana with Phantom" : "Connect Phantom first"}
            </button>
            <div style={{ marginTop: 16 }}>
              <Link to="/campaigns" style={{ fontSize: 13, color: muted, textDecoration: "underline" }}>
                Back to Campaigns
              </Link>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ fontSize: 64, marginBottom: 16 }}>Error</div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "var(--crimson)", marginBottom: 12 }}>
              Recording Failed
            </h2>
            <p style={{ color: muted, marginBottom: 12, lineHeight: 1.7 }}>
              eSewa returned successfully, but the platform could not finish writing the donation record.
            </p>
            {errMsg && (
              <p
                style={{
                  fontSize: 12,
                  color: "var(--crimson)",
                  marginBottom: 16,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "rgba(232,64,64,.08)",
                }}
              >
                {errMsg}
              </p>
            )}
            <Link to="/campaigns" style={{ fontSize: 13, color: muted, textDecoration: "underline" }}>
              Back to Campaigns
            </Link>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function RefBox({ refId, dark, muted }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        marginBottom: 20,
        background: dark ? "rgba(96,187,70,.08)" : "#F0FBF0",
        border: "1px solid rgba(96,187,70,.2)",
      }}
    >
      <div style={{ fontSize: 11, color: muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>
        eSewa Reference ID
      </div>
      <code style={{ fontSize: 13, color: "#60BB46", fontWeight: 700 }}>{refId}</code>
    </div>
  );
}

function btnStyle(color) {
  return {
    display: "inline-block",
    padding: "10px 28px",
    borderRadius: 12,
    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    textDecoration: "none",
  };
}

function actionBtnStyle(background, color) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 230,
    padding: "14px 24px",
    borderRadius: 18,
    border: "none",
    background,
    color,
    fontWeight: 700,
    fontSize: 14,
    textDecoration: "none",
    boxShadow: "0 14px 28px rgba(31,41,51,.08)",
  };
}

