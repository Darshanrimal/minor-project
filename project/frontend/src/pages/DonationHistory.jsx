import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../services/AuthContext";
import { donationAPI } from "../services/api";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

function getAmountDisplay(donation) {
  if ((donation.payment_method || "sol") === "esewa") {
    const amount = parseFloat(donation.amount_npr || 0);
    return {
      label: `Rs ${amount.toLocaleString("en-NP", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      color: "#6B8F71",
      subtitle: "Paid via eSewa",
    };
  }

  const amount = parseFloat(donation.amount_sol || 0);
  return {
    label: `${amount.toFixed(4)} SOL`,
    color: "var(--terracotta)",
    subtitle: "Paid via Phantom",
  };
}

function getBlockchainLink(donation) {
  const reference =
    (donation.payment_method || "sol") === "esewa"
      ? donation.blockchain_ref
      : donation.blockchain_ref || donation.tx_signature;
  if (!reference) return null;
  if (reference.startsWith("ESEWA-") || reference.startsWith("PAYPAL-")) return null;
  return `https://explorer.solana.com/tx/${reference}?cluster=devnet`;
}

function getTxId(donation) {
  if ((donation.payment_method || "sol") === "esewa") {
    return donation.esewa_ref_id || donation.tx_signature || "-";
  }
  return donation.tx_signature || "-";
}

export default function DonationHistory() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    donationAPI
      .myDonations()
      .then((response) => setDonations(response.data || []))
      .catch(() => setDonations([]))
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  const solDonations = useMemo(
    () => donations.filter((donation) => (donation.payment_method || "sol") === "sol"),
    [donations]
  );
  const esewaDonations = useMemo(
    () => donations.filter((donation) => donation.payment_method === "esewa"),
    [donations]
  );
  const filtered = useMemo(() => {
    if (filter === "all") return donations;
    return donations.filter((donation) => (donation.payment_method || "sol") === filter);
  }, [donations, filter]);

  const totalSol = solDonations.reduce((sum, donation) => sum + parseFloat(donation.amount_sol || 0), 0);
  const totalNpr = esewaDonations.reduce((sum, donation) => sum + parseFloat(donation.amount_npr || 0), 0);
  const verifiedCount = donations.filter((donation) => Boolean(getBlockchainLink(donation))).length;

  if (authLoading || loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div className="pulse" style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--crimson)" }} />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <Card className="hero-card" padding="none">
        <div className="hero-copy">
          <h2>Track every donation in one clean record stream.</h2>
          <p>
            Review Phantom and eSewa donations side by side, open Solana references quickly, and keep your giving
            history easy to understand.
          </p>
          <div className="hero-actions">
            <Button as={Link} to="/campaigns">
              Explore campaigns
            </Button>
            <Button as={Link} to="/profile" variant="secondary">
              Open profile
            </Button>
          </div>
        </div>

        <div className="hero-panel">
          <small>Donation record</small>
          <strong>{donations.length} total donations</strong>
          <p>{verifiedCount} donations already include a Solana explorer link.</p>
        </div>
      </Card>

      <div className="grid-cards">
        {[
          {
            label: "Total donations",
            value: donations.length,
            meta: "All recorded gifts in your history",
            tone: "var(--ink)",
          },
          {
            label: "SOL donated",
            value: `${totalSol.toFixed(4)} SOL`,
            meta: "Direct Phantom donations",
            tone: "var(--terracotta)",
          },
          {
            label: "eSewa donated",
            value: `Rs ${totalNpr.toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            meta: "NPR collected through eSewa",
            tone: "var(--sage)",
          },
          {
            label: "Verified on Solana",
            value: verifiedCount,
            meta: "Donations with explorer references",
            tone: "var(--info)",
          },
        ].map((item) => (
          <Card key={item.label} padding="md">
            <div className="metric-label">{item.label}</div>
            <div className="metric-value" style={{ color: item.tone }}>
              {item.value}
            </div>
            <div className="metric-meta">{item.meta}</div>
          </Card>
        ))}
      </div>

      <Card
        title="Donation stream"
        description="Filter by payment method and open each donation record with the same clean layout."
        action={
          <div className="pill-row">
            {[
              { id: "all", label: `All (${donations.length})` },
              { id: "sol", label: `Phantom (${solDonations.length})` },
              { id: "esewa", label: `eSewa (${esewaDonations.length})` },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={filter === item.id ? "badge badge-blue" : "badge badge-gray"}
                style={{ border: "none", cursor: "pointer" }}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
      >
        {filtered.length === 0 ? (
          <div className="empty-state">
            <h3>No donations in this view</h3>
            <p>Switch the filter or open campaigns to make a new donation.</p>
            <div className="hero-actions" style={{ justifyContent: "center" }}>
              <Button as={Link} to="/campaigns">
                Browse campaigns
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filtered.map((donation, index) => {
              const amount = getAmountDisplay(donation);
              const explorerLink = getBlockchainLink(donation);
              const txId = getTxId(donation);

              return (
                <div
                  key={donation.id ?? index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1.4fr) minmax(220px, 0.8fr)",
                    gap: 16,
                    padding: 18,
                    borderRadius: 18,
                    border: "1px solid var(--line)",
                    background: "rgba(255,255,255,.55)",
                  }}
                >
                  <div>
                    <div className="pill-row" style={{ marginBottom: 8 }}>
                      <span className="badge badge-gray">Verified donation</span>
                      <span className={(donation.payment_method || "sol") === "esewa" ? "badge badge-green" : "badge badge-blue"}>
                        {amount.subtitle}
                      </span>
                    </div>
                    <Link
                      to={`/campaigns/${donation.campaign_id}`}
                      style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--ink)" }}
                    >
                      {donation.campaign_title || "Campaign"}
                    </Link>
                    {donation.organization_name ? (
                      <p className="metric-meta" style={{ marginTop: 4 }}>
                        by {donation.organization_name}
                      </p>
                    ) : null}
                    {donation.message ? (
                      <p style={{ color: "var(--stone)", marginTop: 10, fontStyle: "italic" }}>"{donation.message}"</p>
                    ) : null}
                    <div className="stat-inline" style={{ marginTop: 12, flexWrap: "wrap" }}>
                      <span className="metric-meta">{new Date(donation.created_at).toLocaleString()}</span>
                      <span className="metric-meta" style={{ fontFamily: "monospace" }}>
                        {txId}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: 16,
                      borderRadius: 16,
                      background:
                        (donation.payment_method || "sol") === "esewa"
                          ? "rgba(107,143,113,.08)"
                          : "rgba(192,108,82,.08)",
                    }}
                  >
                    <div>
                      <div className="metric-label">Amount</div>
                      <div className="metric-value" style={{ color: amount.color, fontSize: "clamp(24px, 4vw, 34px)" }}>
                        {amount.label}
                      </div>
                    </div>
                    {explorerLink ? (
                      <Button as="a" href={explorerLink} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm">
                        View on Solana Explorer
                      </Button>
                    ) : (
                      <div className="metric-meta">Solana verification pending</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
