import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../services/AuthContext";
import { useTheme } from "../services/ThemeContext";
import { campaignAPI } from "../services/api";

const EMOJI = {
  education: "School",
  health: "Health",
  disaster_relief: "Relief",
  environment: "Earth",
  community: "Community",
  animals: "Animals",
};

function parsePositiveNumber(value) {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) || parsed <= 0 ? 0 : parsed;
}

function getDonationDisplay(donation) {
  if ((donation.payment_method || "sol") === "esewa") {
    return {
      amountLabel: `Rs. ${parsePositiveNumber(donation.amount_npr).toLocaleString("en-NP")}`,
      color: "#60BB46",
      subtitle: "Paid via eSewa",
      link: donation.blockchain_ref
        ? `https://explorer.solana.com/tx/${donation.blockchain_ref}?cluster=devnet`
        : null,
      linkLabel: donation.blockchain_ref ? "View on Solana Explorer" : "Solana verification pending",
    };
  }

  return {
    amountLabel: `${parsePositiveNumber(donation.amount_sol).toFixed(4)} SOL`,
    color: "var(--crimson)",
    subtitle: "Paid via Phantom",
    link: donation.tx_signature
      ? `https://explorer.solana.com/tx/${donation.tx_signature}?cluster=devnet`
      : null,
    linkLabel: "View on Solana Explorer",
  };
}

export default function CampaignDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("about");

  useEffect(() => {
    campaignAPI
      .get(id)
      .then((response) => setData(response.data))
      .catch(() => navigate("/campaigns", { replace: true }))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const bg = dark ? "#0F1117" : "var(--cream)";
  const cardBg = dark ? "#1E2028" : "#FFFFFF";
  const border = dark ? "rgba(255,255,255,.08)" : "#EDE8E3";
  const text = dark ? "#F0F0F5" : "var(--ink)";
  const muted = dark ? "rgba(240,240,245,.45)" : "var(--stone)";

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", background: bg }}>
        <div className="pulse" style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--crimson)" }} />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const goalAmount = parsePositiveNumber(data.goal_amount);
  const totalSolDirect = parsePositiveNumber(data.donation_summary?.total_sol_direct);
  const totalNprDirect = parsePositiveNumber(data.donation_summary?.total_npr_direct);
  const emoji = EMOJI[data.category] || "Campaign";
  const tabs = ["about", "milestones", "donations"];

  return (
    <div className="editorial-stage" style={{ background: bg, paddingBottom: 80 }}>
      <div
        style={{
          background: dark
            ? "linear-gradient(135deg,#0F1117,#1E2028)"
            : "linear-gradient(135deg,var(--ink),var(--ink-soft))",
          padding: "48px 0 120px",
        }}
      >
        <div className="container fade-up">
          <Link to="/campaigns" className="eyebrow-link" style={{ color: "rgba(255,255,255,.56)", marginBottom: 24 }}>
            Back to Campaigns
          </Link>

          <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ fontSize: 40, color: "#fff", minWidth: 72 }}>{emoji}</div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <span className="badge badge-gray" style={{ textTransform: "capitalize" }}>
                  {data.category?.replace("_", " ")}
                </span>
                {data.province && <span className="badge badge-blue">{data.province}</span>}
                <span className={data.is_active ? "badge badge-green" : "badge badge-red"}>
                  {data.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="editorial-kicker" style={{ color: "rgba(255,255,255,.56)", marginBottom: 10 }}>
                Campaign dossier
              </div>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(36px,5vw,64px)",
                  fontWeight: 700,
                  color: "#fff",
                  lineHeight: 0.95,
                  letterSpacing: "-0.06em",
                  marginBottom: 12,
                  maxWidth: "10ch",
                }}
              >
                {data.title}
              </h1>
              <p style={{ color: "rgba(255,255,255,.6)", fontSize: 15 }}>
                by <strong style={{ color: "rgba(255,255,255,.85)" }}>{data.organization_name}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: -72 }}>
        <div className="detail-grid">
          <div>
            <div className="detail-panel" style={{ marginBottom: 24, background: cardBg, border: `1px solid ${border}` }}>
              <div className="detail-tabs">
                {tabs.map((currentTab) => (
                  <button
                    key={currentTab}
                    onClick={() => setTab(currentTab)}
                    className={["detail-tab", tab === currentTab ? "active" : ""].join(" ")}
                    style={{ cursor: "pointer", border: "none" }}
                  >
                    {currentTab}
                    {currentTab === "donations" && (data.recent_donations?.length || 0) > 0
                      ? ` (${data.recent_donations.length})`
                      : ""}
                  </button>
                ))}
              </div>

              <div style={{ padding: 24 }}>
                {tab === "about" && (
                  <div>
                    <p style={{ lineHeight: 1.9, whiteSpace: "pre-wrap", color: dark ? "#D0D0E0" : "var(--ink-soft)" }}>
                      {data.description}
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
                      {[
                        ["District", data.district || "-"],
                        ["Province", data.province || "-"],
                        ["Start Date", data.start_date ? new Date(data.start_date).toLocaleDateString() : "-"],
                        ["End Date", data.end_date ? new Date(data.end_date).toLocaleDateString() : "-"],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          style={{
                            padding: 14,
                            borderRadius: 12,
                            background: dark ? "rgba(255,255,255,.04)" : "var(--cream)",
                            border: `1px solid ${border}`,
                          }}
                        >
                          <div style={{ fontSize: 11, color: muted, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>
                            {label}
                          </div>
                          <div style={{ fontWeight: 600, color: text }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tab === "milestones" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {(data.milestones?.length || 0) > 0 ? (
                      data.milestones.map((milestone, index) => (
                        <div
                          key={index}
                          style={{
                            padding: 16,
                            borderRadius: 14,
                            border: `1.5px solid ${
                              milestone.is_released
                                ? dark
                                  ? "rgba(39,174,96,.3)"
                                  : "var(--success)"
                                : border
                            }`,
                            background: milestone.is_released
                              ? dark
                                ? "rgba(39,174,96,.06)"
                                : "#E8F8EE"
                              : dark
                              ? "rgba(255,255,255,.02)"
                              : "var(--white)",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: text }}>
                              {milestone.title}
                            </span>
                            <span className={milestone.is_released ? "badge badge-green" : "badge badge-yellow"}>
                              {milestone.is_released ? "Released" : "Pending"}
                            </span>
                          </div>
                          {milestone.description && <p style={{ fontSize: 13, color: muted, marginBottom: 6 }}>{milestone.description}</p>}
                          <div style={{ fontSize: 13, color: muted }}>{milestone.percentage}% of goal</div>
                          {milestone.tx_signature && (
                            <a
                              href={`https://explorer.solana.com/tx/${milestone.tx_signature}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: 12, color: "#3B9EFF", marginTop: 4, display: "block" }}
                            >
                              View on Explorer
                            </a>
                          )}
                        </div>
                      ))
                    ) : (
                      <p style={{ color: muted }}>No milestones defined.</p>
                    )}
                  </div>
                )}

                {tab === "donations" && (
                  <div>
                    {(data.recent_donations?.length || 0) > 0 ? (
                      data.recent_donations.map((donation, index) => {
                        const display = getDonationDisplay(donation);
                        return (
                          <div key={index} className="donation-row" style={{
                            borderBottom: index < data.recent_donations.length - 1 ? `1px solid ${border}` : "none",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: "50%",
                                  flexShrink: 0,
                                  background: "linear-gradient(135deg,var(--crimson),var(--saffron))",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#fff",
                                  fontWeight: 800,
                                  fontSize: 15,
                                }}
                              >
                                {(donation.donor_name || donation.donor_wallet || "A")[0].toUpperCase()}
                              </div>

                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: text }}>
                                  {donation.donor_name || "Anonymous"}
                                </div>
                                <div style={{ fontSize: 11, fontFamily: "monospace", color: muted, marginTop: 1 }}>
                                  {(donation.donor_wallet || "donor").slice(0, 8)}...
                                  {(donation.donor_wallet || "donor").slice(-4)}
                                </div>
                                {donation.message && (
                                  <div style={{ fontSize: 12, color: muted, marginTop: 3, fontStyle: "italic" }}>
                                    "{donation.message}"
                                  </div>
                                )}
                                <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                                  {new Date(donation.created_at).toLocaleString()}
                                </div>
                              </div>
                            </div>

                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: display.color, fontSize: 16 }}>
                                {display.amountLabel}
                              </div>
                              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                                {display.subtitle}
                              </div>
                              {display.link ? (
                                <a
                                  href={display.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ fontSize: 11, color: "#3B9EFF", marginTop: 4, display: "inline-block" }}
                                >
                                  {display.linkLabel}
                                </a>
                              ) : (
                                <div style={{ fontSize: 11, color: display.color, marginTop: 4 }}>{display.linkLabel}</div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ textAlign: "center", padding: "40px 0" }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>Donate</div>
                        <p style={{ color: muted, fontWeight: 500 }}>No donations yet. Be the first.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="detail-sidebar">
            <div className="detail-panel" style={{ background: cardBg, border: `1px solid ${border}` }}>
              <div style={{ marginBottom: 20 }}>
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
                <div style={{ fontSize: 12, color: muted, marginTop: 8 }}>
                  Goal: {goalAmount.toFixed(4)} SOL
                </div>
                <div style={{ fontSize: 12, color: muted, marginTop: 8 }}>
                  Donations are shown directly in SOL and NPR so the campaign economics stay legible.
                </div>
                <div className="data-chip-row" style={{ marginTop: 12 }}>
                  <div className="data-chip">Phantom {totalSolDirect.toFixed(4)} SOL</div>
                  <div className="data-chip">eSewa Rs {totalNprDirect.toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div style={{ fontSize: 12, color: muted, marginTop: 8 }}>
                  Phantom: {totalSolDirect.toFixed(4)} SOL · eSewa: Rs {totalNprDirect.toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                {[
                  { value: data.recent_donations?.length || 0, label: "Donors" },
                  {
                    value: `${data.milestones?.filter((milestone) => milestone.is_released).length || 0}/${data.milestones?.length || 0}`,
                    label: "Milestones",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      textAlign: "center",
                      background: dark ? "rgba(255,255,255,.04)" : "var(--cream)",
                    }}
                  >
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-display)", color: text }}>
                      {item.value}
                    </div>
                    <div style={{ fontSize: 12, color: muted }}>{item.label}</div>
                  </div>
                ))}
              </div>

              {data.is_active ? (
                <div>
                  {user ? (
                    <Link to={`/campaigns/${id}/donate`} className="btn btn-primary btn-full btn-lg">
                      Donate with Phantom or eSewa
                    </Link>
                  ) : (
                    <Link to="/login" className="btn btn-primary btn-full btn-lg">
                      Sign in to Donate
                    </Link>
                  )}
                  <p style={{ textAlign: "center", fontSize: 12, color: muted, marginTop: 12 }}>
                    Supports SOL and eSewa donation flows
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: 16,
                    borderRadius: 12,
                    background: dark ? "rgba(231,76,60,.1)" : "#FDDBD8",
                    color: "var(--danger)",
                    fontWeight: 600,
                  }}
                >
                  Campaign no longer active
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
