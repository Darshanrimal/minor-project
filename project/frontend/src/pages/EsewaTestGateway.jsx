import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "../services/ThemeContext";

const DEMO_ESEWA_BALANCES_KEY = "nepaldann:esewa-demo-balances";
const DEFAULT_DEMO_BALANCE = 50000;

function readPendingEsewa() {
  try {
    return JSON.parse(sessionStorage.getItem("nepaldann:pending-esewa") || "null");
  } catch (_) {
    return null;
  }
}

function parsePositiveNumber(value) {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 10);
}

function maskPhone(value) {
  const phone = normalizePhone(value);
  if (phone.length < 4) return phone;
  return `${phone.slice(0, 2)}******${phone.slice(-2)}`;
}

function makeDemoOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function readDemoBalances() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_ESEWA_BALANCES_KEY) || "{}");
  } catch (_) {
    return {};
  }
}

function writeDemoBalances(nextBalances) {
  localStorage.setItem(DEMO_ESEWA_BALANCES_KEY, JSON.stringify(nextBalances));
}

function getDemoBalance(phone) {
  const normalized = normalizePhone(phone) || "9806800001";
  const balances = readDemoBalances();
  const existing = parsePositiveNumber(balances[normalized]);
  if (existing !== null) {
    return Number(existing.toFixed(2));
  }

  balances[normalized] = DEFAULT_DEMO_BALANCE;
  writeDemoBalances(balances);
  return DEFAULT_DEMO_BALANCE;
}

function deductDemoBalance(phone, amount) {
  const normalized = normalizePhone(phone) || "9806800001";
  const balances = readDemoBalances();
  const current = parsePositiveNumber(balances[normalized]) ?? DEFAULT_DEMO_BALANCE;
  const next = Number(Math.max(current - amount, 0).toFixed(2));
  balances[normalized] = next;
  writeDemoBalances(balances);
  return next;
}

function formatNpr(value) {
  return Number(value || 0).toLocaleString("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function inputStyle(dark, border, text) {
  return {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: dark ? "rgba(255,255,255,.02)" : "#fff",
    color: text,
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
  };
}

function greenButtonStyle(disabled) {
  return {
    width: "100%",
    padding: "14px 18px",
    borderRadius: 6,
    border: "none",
    background: disabled ? "#BFD9B5" : "#60BB46",
    color: "#fff",
    fontSize: 15,
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    letterSpacing: ".02em",
  };
}

function whiteCard(border) {
  return {
    background: "#fff",
    border: `1px solid ${border}`,
    borderRadius: 12,
    boxShadow: "0 10px 28px rgba(52, 72, 61, .06)",
  };
}

function iconBubble() {
  return {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: "#F4FAF1",
    border: "1px solid #D8EBD2",
    display: "grid",
    placeItems: "center",
    color: "#60BB46",
    fontWeight: 800,
  };
}

export default function EsewaTestGateway() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { dark } = useTheme();

  const pending = useMemo(() => readPendingEsewa(), []);

  const campaignId = searchParams.get("campaign_id") || pending?.campaign_id || "";
  const amount = parsePositiveNumber(searchParams.get("amount") || pending?.amount_npr) || 0;
  const transactionUuid =
    searchParams.get("transaction_uuid") || pending?.transaction_uuid || `campaign-${campaignId}-${Date.now()}`;

  const [step, setStep] = useState("login");
  const [phone, setPhone] = useState("9806800001");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpNotice, setOtpNotice] = useState("");
  const [error, setError] = useState("");
  const [balance, setBalance] = useState(null);
  const [promoCode, setPromoCode] = useState("GEN");
  const [paying, setPaying] = useState(false);

  const pageBg = dark ? "#0F1117" : "#EEF4ED";
  const shellBg = dark ? "#171A22" : "#F4F7F2";
  const panelBg = dark ? "#1A1E26" : "#F9FBF7";
  const rightBg = dark ? "#181C23" : "#F6F8F4";
  const border = dark ? "rgba(255,255,255,.08)" : "#E3E9DE";
  const subtleBorder = dark ? "rgba(255,255,255,.06)" : "#E7EEE4";
  const text = dark ? "#F0F0F5" : "#27332B";
  const muted = dark ? "rgba(240,240,245,.55)" : "#7B877F";

  const successPayload = {
    status: "COMPLETE",
    transaction_uuid: transactionUuid,
    transaction_code: `DEMO-${transactionUuid}`,
    total_amount: amount.toFixed(2),
    campaign_id: campaignId,
  };

  function handleFailure() {
    navigate(`/esewa/failure?campaign_id=${encodeURIComponent(campaignId)}&transaction_uuid=${encodeURIComponent(transactionUuid)}`);
  }

  function handleGenerateOtp() {
    const normalized = normalizePhone(phone);
    if (normalized.length !== 10) {
      setError("Enter a valid 10-digit eSewa mobile number.");
      return;
    }

    const nextOtp = makeDemoOtp();
    setGeneratedOtp(nextOtp);
    setOtpNotice(`Demo OTP for ${maskPhone(normalized)}: ${nextOtp}`);
    setOtp("");
    setError("");
    setStep("otp");
  }

  function handleVerifyOtp() {
    if (!generatedOtp) {
      setError("Generate an OTP first.");
      setStep("login");
      return;
    }

    if (otp.trim() !== generatedOtp) {
      setError("Invalid OTP. Please try again.");
      return;
    }

    const nextBalance = getDemoBalance(phone);
    setBalance(nextBalance);
    setError("");
    setStep("wallet");
  }

  function handlePayNow() {
    if (balance === null) {
      setError("Verify your OTP first.");
      return;
    }

    if (balance < amount) {
      setError("Insufficient eSewa balance in this demo account.");
      return;
    }

    const remainingBalance = deductDemoBalance(phone, amount);
    setBalance(remainingBalance);
    setPaying(true);

    const encoded = window.btoa(JSON.stringify({
      ...successPayload,
      remaining_balance: remainingBalance.toFixed(2),
      promo_code: promoCode,
    }));
    const successUrl = new URL(`${window.location.origin}/esewa/success`);
    successUrl.searchParams.set("data", encoded);
    successUrl.searchParams.set("campaign_id", String(campaignId));
    successUrl.searchParams.set("amount", amount.toFixed(2));
    successUrl.searchParams.set("transaction_uuid", transactionUuid);
    successUrl.searchParams.set("status", "COMPLETE");
    successUrl.searchParams.set("source", "demo");
    successUrl.searchParams.set("refId", successPayload.transaction_code);
    successUrl.searchParams.set("phone", normalizePhone(phone));
    successUrl.searchParams.set("remaining_balance", remainingBalance.toFixed(2));

    window.setTimeout(() => {
      navigate(`${successUrl.pathname}${successUrl.search}`);
    }, 700);
  }

  function renderActionArea() {
    if (step === "login") {
      return (
        <div style={{ ...whiteCard(subtleBorder), padding: 28 }}>
          <h2 style={{ margin: 0, marginBottom: 12, fontSize: 18, fontWeight: 800, color: text }}>Sign in to your account</h2>
          <p style={{ margin: 0, marginBottom: 18, color: muted, lineHeight: 1.6, fontSize: 13 }}>
            Enter your eSewa mobile number to receive a one-time password.
          </p>
          <input
            value={phone}
            onChange={(event) => setPhone(normalizePhone(event.target.value))}
            placeholder="9806800001"
            style={{ ...inputStyle(dark, subtleBorder, text), marginBottom: 14 }}
          />
          <button type="button" onClick={handleGenerateOtp} style={{ ...greenButtonStyle(false), marginBottom: 10 }}>
            LOGIN & CONTINUE
          </button>
          <button type="button" onClick={handleFailure} style={{ width: "100%", background: "transparent", border: "none", color: muted, fontWeight: 700, cursor: "pointer", paddingTop: 10 }}>
            CANCEL PAYMENT
          </button>
        </div>
      );
    }

    if (step === "otp") {
      return (
        <div style={{ ...whiteCard(subtleBorder), padding: 28 }}>
          <h2 style={{ margin: 0, marginBottom: 12, fontSize: 18, fontWeight: 800, color: text }}>Enter a verification code</h2>
          <p style={{ margin: 0, marginBottom: 10, color: muted, lineHeight: 1.6, fontSize: 13 }}>
            Please type the 6-digit verification code sent to {maskPhone(phone)}.
          </p>
          {otpNotice ? (
            <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: "#F1FAEE", color: "#3B7E2B", border: "1px solid #D7EACF", fontSize: 13 }}>
              {otpNotice}
            </div>
          ) : null}
          <input
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            style={{ ...inputStyle(dark, subtleBorder, text), marginBottom: 14, letterSpacing: ".25em", fontSize: 18 }}
          />
          <button type="button" onClick={handleVerifyOtp} style={{ ...greenButtonStyle(false), marginBottom: 10 }}>
            VERIFY
          </button>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <button type="button" onClick={() => { setStep("login"); setError(""); }} style={{ flex: 1, padding: "12px 14px", borderRadius: 8, border: `1px solid ${subtleBorder}`, background: "#fff", color: text, cursor: "pointer", fontWeight: 700 }}>
              Back
            </button>
            <button type="button" onClick={handleGenerateOtp} style={{ flex: 1, padding: "12px 14px", borderRadius: 8, border: `1px solid ${subtleBorder}`, background: "#fff", color: text, cursor: "pointer", fontWeight: 700 }}>
              Resend OTP
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div style={{ ...whiteCard(subtleBorder), padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={iconBubble()}>?</div>
          <div>
            <div style={{ color: "#9AA3B1", fontSize: 12, fontWeight: 700, letterSpacing: ".04em" }}>MY BALANCE</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: text }}>
              <span style={{ color: "#60BB46" }}>NPR.</span> {formatNpr(balance)}
            </div>
          </div>
        </div>

        <div style={{ ...whiteCard(subtleBorder), padding: 28 }}>
          <h2 style={{ margin: 0, marginBottom: 18, fontSize: 18, fontWeight: 800, color: text }}>User Details</h2>
          <div style={{ color: "#60BB46", fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{phone}</div>
          <div style={{ color: muted, fontSize: 14, marginBottom: 18 }}>Esewa Esewa Esewa</div>

          <div style={{ display: "grid", gap: 14, marginBottom: 18, color: muted, fontSize: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#60BB46" }}>?</span>
              <span>{phone}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#60BB46" }}>¦</span>
              <span>KTM, Baneswor-10, Kathmandu, Bagmati</span>
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${subtleBorder}`, paddingTop: 16 }}>
            <div style={{ color: "#60BB46", fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Available Promocodes</div>
            <div style={{ border: "1px solid #CFE5C8", borderRadius: 12, padding: 12, marginBottom: 12, background: "#FBFEFA" }}>
              <div style={{ fontWeight: 800, color: text, marginBottom: 4 }}>Get Flat Rs.1.00 off & 1 reward point.</div>
              <div style={{ color: "#A1A8A4", fontSize: 12, marginBottom: 10 }}>Expires on: Apr 30, 2026</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button type="button" style={{ border: "none", background: "transparent", color: "#60BB46", fontWeight: 700, cursor: "pointer", padding: 0 }}>View Details</button>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ background: "#EEF4EB", color: muted, fontWeight: 700, fontSize: 11, padding: "4px 10px", borderRadius: 6 }}>{promoCode}</span>
                  <span style={{ background: "#DDF0D6", color: "#60BB46", fontWeight: 800, fontSize: 11, padding: "4px 10px", borderRadius: 6 }}>COPIED</span>
                </div>
              </div>
            </div>
            <input
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value.toUpperCase().slice(0, 12))}
              style={{ ...inputStyle(dark, subtleBorder, text), marginBottom: 16, background: "#F7F8F7" }}
            />
            <button type="button" onClick={handlePayNow} disabled={paying} style={{ ...greenButtonStyle(paying), marginBottom: 10 }}>
              {paying ? "PROCESSING PAYMENT..." : "APPLY & CONTINUE"}
            </button>
            <button type="button" onClick={handleFailure} style={{ width: "100%", background: "transparent", border: "none", color: muted, fontWeight: 700, cursor: "pointer", paddingTop: 10 }}>
              CANCEL PAYMENT
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: pageBg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 1360, borderRadius: 18, border: `1px solid ${border}`, background: shellBg, boxShadow: dark ? "0 28px 80px rgba(0,0,0,.45)" : "0 28px 80px rgba(24,46,32,.12)" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative", padding: "10px 24px 0" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1B2430" }}>
            <span style={{ color: "#60BB46" }}>e</span>Sewa
          </div>
          <div style={{ position: "absolute", right: 24, top: 10, fontSize: 12, color: muted, background: "#fff", border: `1px solid ${subtleBorder}`, borderRadius: 8, padding: "6px 10px" }}>English ?</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 0, padding: 28 }}>
          <div style={{ background: panelBg, borderRight: `1px solid ${border}`, padding: 34, minHeight: 580 }}>
            <div style={{ maxWidth: 420 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#E7F6E2", color: "#60BB46", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 26 }}>e</div>
                <div style={{ fontWeight: 800, color: text, fontSize: 18 }}>EPAYTEST</div>
              </div>

              <div style={{ color: muted, fontSize: 13, marginBottom: 8 }}>Total Amount</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 28, color: text }}>
                <span style={{ color: "#60BB46" }}>NPR.</span> {formatNpr(amount)}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26, color: text }}>
                <span style={{ color: muted, fontSize: 13 }}>Total Amount</span>
                <strong style={{ fontSize: 16 }}>{amount.toFixed(1)}</strong>
              </div>

              <div style={{ width: "100%", height: 128, borderRadius: 12, background: "linear-gradient(135deg,#FFF1E7,#FFD8B2 46%,#FF5F2E 46%,#FF5F2E 60%,#FFB000 60%,#FFE25E 100%)", position: "relative", overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.4)" }}>
                <div style={{ position: "absolute", left: 18, top: 16, color: "#D23C2C", fontWeight: 800, fontSize: 14 }}>Khaaspin</div>
                <div style={{ position: "absolute", left: 18, bottom: 18, color: "#D9291C", fontWeight: 900, fontSize: 22, lineHeight: 1.05 }}>FEEL GOOD</div>
                <div style={{ position: "absolute", left: 18, bottom: 4, color: "#5F614F", fontWeight: 600, fontSize: 12 }}>with Great Food</div>
                <div style={{ position: "absolute", right: 18, top: 18, color: "#2D6C1F", fontWeight: 800, fontSize: 16 }}>eSewa</div>
                <div style={{ position: "absolute", right: 24, bottom: 18, background: "#FF4D4D", color: "#fff", fontWeight: 900, fontSize: 18, padding: "10px 14px", borderRadius: 12, transform: "rotate(-8deg)" }}>Flat 15% Off</div>
              </div>
            </div>
          </div>

          <div style={{ background: rightBg, padding: 26, minHeight: 580 }}>
            {renderActionArea()}
            {error ? (
              <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: dark ? "rgba(232,64,64,.12)" : "#FFF1F1", border: "1px solid rgba(232,64,64,.22)", color: "#C0392B", fontSize: 13, lineHeight: 1.6 }}>
                {error}
              </div>
            ) : null}
            {(step === "login" || step === "otp") ? (
              <div style={{ marginTop: 16, textAlign: "center" }}>
                <Link to={`/campaigns/${campaignId}/donate`} style={{ color: muted, fontSize: 13, textDecoration: "none" }}>
                  Back to donation form
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
