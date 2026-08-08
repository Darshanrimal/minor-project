import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../services/AuthContext";
import { donationAPI, userAPI } from "../services/api";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

const TABS = ["info", "donations", "security"];

function getDonationAmountDisplay(donation) {
  if ((donation.payment_method || "sol") === "esewa") {
    const amountNpr = parseFloat(donation.amount_npr || 0);
    return {
      label: `Rs ${amountNpr.toLocaleString("en-NP", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      color: "var(--sage)",
      subtitle: "Paid via eSewa",
    };
  }

  const amountSol = parseFloat(donation.amount_sol || 0);
  return {
    label: `${amountSol.toFixed(4)} SOL`,
    color: "var(--terracotta)",
    subtitle: "Paid via Phantom",
  };
}

function getDonationExplorerLink(donation) {
  const reference =
    (donation.payment_method || "sol") === "esewa"
      ? donation.blockchain_ref
      : donation.blockchain_ref || donation.tx_signature;

  if (!reference || reference.startsWith("ESEWA-")) {
    return null;
  }

  return `https://explorer.solana.com/tx/${reference}?cluster=devnet`;
}

export default function UserProfile() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [donations, setDonations] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [tab, setTab] = useState("info");
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState("");
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    Promise.all([
      userAPI.getProfile().then((response) => {
        setProfile(response.data);
        setUsername(response.data?.username || "");
      }),
      donationAPI.myDonations().then((response) => setDonations(response.data || [])),
    ])
      .catch(() => {})
      .finally(() => setPageLoading(false));
  }, [authLoading, navigate, user]);

  const totalSol = useMemo(
    () =>
      donations
        .filter((donation) => (donation.payment_method || "sol") === "sol")
        .reduce((sum, donation) => sum + parseFloat(donation.amount_sol || 0), 0),
    [donations]
  );
  const totalNpr = useMemo(
    () =>
      donations
        .filter((donation) => donation.payment_method === "esewa")
        .reduce((sum, donation) => sum + parseFloat(donation.amount_npr || 0), 0),
    [donations]
  );
  const verifiedCount = useMemo(
    () => donations.filter((donation) => Boolean(getDonationExplorerLink(donation))).length,
    [donations]
  );

  const handleUpdateUsername = async () => {
    if (!username.trim() || username.trim().length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }

    setSaving(true);
    try {
      const { data } = await userAPI.updateProfile({ username: username.trim() });
      setProfile(data);
      setEditMode(false);
      toast.success("Username updated!");
      if (refreshUser) await refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    if (pwForm.next !== pwForm.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (pwForm.next.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      await userAPI.changePassword({
        current_password: pwForm.current,
        new_password: pwForm.next,
      });
      toast.success("Password changed successfully!");
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || pageLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div className="pulse" style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--crimson)" }} />
      </div>
    );
  }

  if (!profile) return null;

  const initial = (profile.username || "U")[0].toUpperCase();

  return (
    <div className="page-stack">
      <Card className="hero-card" padding="none">
        <div className="hero-copy">
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 8, flexWrap: "wrap" }}>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: "50%",
                background: "linear-gradient(135deg,var(--terracotta),var(--sand))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontFamily: "var(--font-display)",
                fontSize: 28,
                fontWeight: 800,
              }}
            >
              {initial}
            </div>
            <div>
              <h2 style={{ marginBottom: 6 }}>{profile.username}</h2>
              <p style={{ margin: 0 }}>
                {(profile.role || "donor").replace("_", " ")} • Joined {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <p>
            Keep your donation identity, wallet state, and personal settings in one calm workspace that matches the
            rest of NepalDaan.
          </p>
          <div className="hero-actions">
            <Button as={Link} to="/history">
              View my donations
            </Button>
            <Button as={Link} to="/campaigns" variant="secondary">
              Explore campaigns
            </Button>
          </div>
        </div>

        <div className="hero-panel">
          <small>Profile status</small>
          <strong>{profile.email || "No email available"}</strong>
          <p>{profile.wallet_address ? "Wallet linked and ready for Phantom donations." : "No wallet linked yet."}</p>
        </div>
      </Card>

      <div className="grid-cards">
        {[
          { label: "Total donations", value: donations.length, meta: "All recorded gifts", tone: "var(--ink)" },
          { label: "SOL donated", value: `${totalSol.toFixed(4)} SOL`, meta: "Direct Phantom donations", tone: "var(--terracotta)" },
          {
            label: "eSewa donated",
            value: `Rs ${totalNpr.toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            meta: "NPR collected through eSewa",
            tone: "var(--sage)",
          },
          { label: "Verified links", value: verifiedCount, meta: "Explorer references available", tone: "var(--info)" },
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
        title="Account workspace"
        description="Switch between profile info, donation activity, and security settings with the same clean layout."
        action={
          <div className="pill-row">
            {TABS.map((currentTab) => (
              <button
                key={currentTab}
                type="button"
                onClick={() => setTab(currentTab)}
                className={tab === currentTab ? "badge badge-blue" : "badge badge-gray"}
                style={{ border: "none", cursor: "pointer", textTransform: "capitalize" }}
              >
                {currentTab}
              </button>
            ))}
          </div>
        }
      >
        {tab === "info" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 20 }}>
            <Card padding="md">
              <div className="metric-label">Username</div>
              {editMode ? (
                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  <input
                    className="form-input"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    style={{ flex: "1 1 240px" }}
                    autoFocus
                  />
                  <Button onClick={handleUpdateUsername} disabled={saving} size="sm">
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditMode(false);
                      setUsername(profile.username || "");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="stat-inline" style={{ marginTop: 10 }}>
                  <div className="metric-value" style={{ fontSize: "2rem" }}>
                    {profile.username}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEditMode(true)}>
                    Edit
                  </Button>
                </div>
              )}

              <div style={{ marginTop: 20 }}>
                <div className="metric-label">Email</div>
                <div className="metric-meta" style={{ marginTop: 6, fontSize: 16, color: "var(--ink)" }}>
                  {profile.email || "-"}
                </div>
              </div>

              <div style={{ marginTop: 20 }}>
                <div className="metric-label">Role</div>
                <div className="metric-meta" style={{ marginTop: 6, fontSize: 16, color: "var(--ink)", textTransform: "capitalize" }}>
                  {(profile.role || "donor").replace("_", " ")}
                </div>
              </div>
            </Card>

            <Card padding="md">
              <div className="metric-label">Wallet address</div>
              {profile.wallet_address ? (
                <div
                  style={{
                    marginTop: 10,
                    padding: 14,
                    borderRadius: 16,
                    background: "rgba(247,243,236,.9)",
                    border: "1px solid var(--line)",
                    fontFamily: "monospace",
                    fontSize: 12,
                    wordBreak: "break-all",
                  }}
                >
                  {profile.wallet_address}
                </div>
              ) : (
                <div className="notice-banner" style={{ marginTop: 10 }}>
                  No wallet linked yet. Connect Phantom from the top bar when you want to donate with SOL.
                </div>
              )}
            </Card>
          </div>
        )}

        {tab === "donations" && (
          <>
            {donations.length === 0 ? (
              <div className="empty-state">
                <h3>No donations yet</h3>
                <p>Once you support a campaign, your donation record will appear here.</p>
                <div className="hero-actions" style={{ justifyContent: "center" }}>
                  <Button as={Link} to="/campaigns">
                    Browse campaigns
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {donations.map((donation, index) => {
                  const amount = getDonationAmountDisplay(donation);
                  const explorerLink = getDonationExplorerLink(donation);

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
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>
                          {donation.campaign_title || "Campaign"}
                        </div>
                        <div className="metric-meta" style={{ marginTop: 6 }}>
                          {new Date(donation.created_at).toLocaleString()}
                        </div>
                        {donation.message ? (
                          <p style={{ color: "var(--stone)", marginTop: 10, fontStyle: "italic" }}>"{donation.message}"</p>
                        ) : null}
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
          </>
        )}

        {tab === "security" && (
          <div style={{ maxWidth: 560 }}>
            <Card padding="md">
              <div className="metric-value" style={{ fontSize: "2rem", marginBottom: 6 }}>
                Update password
              </div>
              <div className="metric-meta" style={{ marginBottom: 18 }}>
                Keep your account secure with the same simple form style used throughout the app.
              </div>
              <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input
                    className="form-input"
                    type="password"
                    value={pwForm.current}
                    onChange={(event) => setPwForm((prev) => ({ ...prev, current: event.target.value }))}
                    placeholder="Enter current password"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    className="form-input"
                    type="password"
                    value={pwForm.next}
                    onChange={(event) => setPwForm((prev) => ({ ...prev, next: event.target.value }))}
                    placeholder="Minimum 6 characters"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    className="form-input"
                    type="password"
                    value={pwForm.confirm}
                    onChange={(event) => setPwForm((prev) => ({ ...prev, confirm: event.target.value }))}
                    placeholder="Repeat new password"
                    required
                  />
                </div>
                <Button type="submit" disabled={saving} style={{ width: "fit-content" }}>
                  {saving ? "Changing..." : "Change Password"}
                </Button>
              </form>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
}
