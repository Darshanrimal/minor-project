import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import toast from "react-hot-toast";
import { useAuth } from "../services/AuthContext";
import { campaignAPI, donationAPI, orgAPI } from "../services/api";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Loader from "../components/ui/Loader";
import Modal from "../components/ui/Modal";
import Table from "../components/ui/Table";

const CATEGORY_OPTIONS = [
  "education",
  "health",
  "disaster_relief",
  "environment",
  "community",
  "animals",
  "other",
];

const PROVINCES = ["Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpashchim"];

function safeNumber(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNpr(value) {
  return `Rs ${safeNumber(value).toLocaleString("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-NP", { month: "short", day: "numeric", year: "numeric" });
}

function formatCompactWallet(address) {
  if (!address) return "Not connected";
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function DashboardMetric({ label, value, meta, tone = "var(--ink)" }) {
  return (
    <Card className="metric-card" padding="md">
      <span className="metric-label">{label}</span>
      <strong className="metric-value" style={{ color: tone }}>
        {value}
      </strong>
      <span className="metric-meta">{meta}</span>
    </Card>
  );
}

function CampaignProgressCard({ campaign, actionLabel = "Open campaign", actionTo }) {
  const goal = safeNumber(campaign.goal_amount);
  const totalSolDirect = safeNumber(campaign.total_sol_direct);
  const totalNprDirect = safeNumber(campaign.total_npr_direct);

  return (
    <Card className="campaign-compact" padding="md">
      <div className="campaign-compact-head">
        <div>
          <div className="pill-row" style={{ marginBottom: 10 }}>
            <span className="badge badge-gray" style={{ textTransform: "capitalize" }}>
              {(campaign.category || "general").replace("_", " ")}
            </span>
            <span className={campaign.is_active ? "badge badge-green" : "badge badge-red"}>
              {campaign.is_active ? "Active" : "Paused"}
            </span>
          </div>
          <h3 className="campaign-compact-title">{campaign.title}</h3>
          <p className="campaign-compact-copy">
            {campaign.organization_name || "NepalDaan"}{campaign.province ? ` in ${campaign.province}` : ""}
          </p>
        </div>
      </div>

      <div className="stat-inline">
        <span className="metric-meta">Goal: {goal.toFixed(3)} SOL</span>
        <span className="metric-meta">Ends {formatDate(campaign.end_date)}</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <div
          style={{
            padding: 14,
            borderRadius: 16,
            background: "rgba(192, 108, 82, 0.08)",
            border: "1px solid rgba(192, 108, 82, 0.12)",
          }}
        >
          <div className="metric-label" style={{ marginBottom: 6 }}>
            Collected SOL
          </div>
          <strong style={{ color: "var(--terracotta)", fontFamily: "var(--font-display)", fontSize: 22 }}>
            {totalSolDirect.toFixed(3)}
          </strong>
        </div>
        <div
          style={{
            padding: 14,
            borderRadius: 16,
            background: "rgba(107, 143, 113, 0.08)",
            border: "1px solid rgba(107, 143, 113, 0.14)",
          }}
        >
          <div className="metric-label" style={{ marginBottom: 6 }}>
            Collected Rs
          </div>
          <strong style={{ color: "var(--sage)", fontFamily: "var(--font-display)", fontSize: 22 }}>
            {safeNumber(totalNprDirect).toLocaleString("en-NP", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </strong>
        </div>
      </div>

      <div className="campaign-compact-footer">
        <Button as={Link} to={`/campaigns/${campaign.id}`} variant="ghost" size="sm">
          View details
        </Button>
        <Button as={Link} to={actionTo || `/campaigns/${campaign.id}/donate`} size="sm">
          {actionLabel}
        </Button>
      </div>
    </Card>
  );
}

function DonationChart({ data }) {
  if (!data.length) {
    return <div className="empty-inline">No donation activity has been recorded for the last 7 days yet.</div>;
  }

  const maxValue = Math.max(...data.map((item) => safeNumber(item.total_sol)), 0);
  const maxNpr = Math.max(...data.map((item) => safeNumber(item.total_npr)), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="pill-row">
        <span className="badge badge-gray">Phantom donations</span>
        <span className="badge badge-green">eSewa donations</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {data.map((item) => {
          const amountSol = safeNumber(item.total_sol);
          const amountNpr = safeNumber(item.total_npr);
          const solWidth = maxValue > 0 ? Math.max(4, (amountSol / maxValue) * 100) : 0;
          const nprWidth = maxNpr > 0 ? Math.max(4, (amountNpr / maxNpr) * 100) : 0;

          return (
            <div
              key={item.date}
              style={{
                padding: 16,
                borderRadius: 18,
                background: "rgba(31, 41, 51, 0.03)",
                border: "1px solid rgba(31, 41, 51, 0.06)",
              }}
            >
              <div className="stat-inline" style={{ marginBottom: 12, alignItems: "baseline" }}>
                <strong style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>
                  {new Date(`${item.date}T00:00:00`).toLocaleDateString("en-NP", { month: "short", day: "numeric" })}
                </strong>
                <span className="metric-meta">{safeNumber(item.count)} donations</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "110px minmax(0, 1fr) 120px", gap: 12, alignItems: "center" }}>
                  <span className="metric-meta">Phantom</span>
                  <div className="progress-bar" style={{ height: 12 }}>
                    <div className="progress-fill" style={{ width: `${solWidth}%`, background: "linear-gradient(90deg, var(--sand), var(--terracotta))" }} />
                  </div>
                  <strong style={{ color: "var(--terracotta)", textAlign: "right" }}>{amountSol.toFixed(3)} SOL</strong>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "110px minmax(0, 1fr) 120px", gap: 12, alignItems: "center" }}>
                  <span className="metric-meta">eSewa</span>
                  <div className="progress-bar" style={{ height: 12 }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${nprWidth}%`,
                        background: "linear-gradient(90deg, rgba(107, 143, 113, 0.45), var(--sage))",
                      }}
                    />
                  </div>
                  <strong style={{ color: "var(--sage)", textAlign: "right" }}>{formatNpr(amountNpr)}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DonorDashboard({ user }) {
  const { publicKey, connected } = useWallet();
  const [state, setState] = useState({
    loading: true,
    error: "",
    campaigns: [],
    stats: null,
    topDonors: [],
    chartData: [],
  });

  const loadData = async () => {
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const [campaignsResponse, statsResponse, donorsResponse, chartResponse] = await Promise.all([
        campaignAPI.list(),
        campaignAPI.stats(),
        donationAPI.topDonors(),
        donationAPI.chart(),
      ]);

      const campaigns = (campaignsResponse.data?.campaigns || []).filter(
        (campaign) => campaign.is_active === 1 || campaign.is_active === true
      );

      setState({
        loading: false,
        error: "",
        campaigns: campaigns.slice(0, 6),
        stats: statsResponse.data || null,
        topDonors: donorsResponse.data || [],
        chartData: chartResponse.data || [],
      });
    } catch (error) {
      setState({
        loading: false,
        error: error.response?.data?.message || "We could not load the latest dashboard data.",
        campaigns: [],
        stats: null,
        topDonors: [],
        chartData: [],
      });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (state.loading) return <Loader rows={4} label="Loading donor dashboard..." />;

  return (
    <div className="page-stack">
      <Card className="hero-card" padding="none">
        <div className="hero-copy">
          <div className="editorial-kicker">Donor workspace</div>
          <h2>Give with conviction. Track every proof.</h2>
          <p>
            Welcome back, {user.username}. This ledger keeps high-signal campaigns, wallet posture, and the latest
            Phantom and eSewa movement in one deliberate view.
          </p>
          <div className="hero-actions">
            <Button as={Link} to="/campaigns">
              Explore campaigns
            </Button>
            <Button as={Link} to="/history" variant="secondary">
              View my donations
            </Button>
          </div>
        </div>

        <div className="hero-panel">
          <small>Wallet posture</small>
          <strong>{connected && publicKey ? formatCompactWallet(publicKey.toBase58()) : "Wallet not connected"}</strong>
          <p>
            Connect Phantom before donating with SOL. eSewa donations can still be recorded and mirrored with a Solana
            reference flow.
          </p>
          <div style={{ marginTop: 18 }}>
            <WalletMultiButton />
          </div>
        </div>
      </Card>

      {state.error ? (
        <Card padding="md">
          <div className="notice-banner">{state.error}</div>
          <Button onClick={loadData} size="sm">
            Retry
          </Button>
        </Card>
      ) : null}

      {state.stats ? (
        <div className="grid-cards">
          <DashboardMetric
            label="Active Campaigns"
            value={state.stats.total_campaigns || 0}
            meta="Live campaigns currently accepting donations"
            tone="var(--terracotta)"
          />
          <DashboardMetric
            label="SOL Donations"
            value={`${safeNumber(state.stats.total_sol_donated).toFixed(3)} SOL`}
            meta="Direct Phantom donations recorded on-chain"
            tone="var(--terracotta)"
          />
          <DashboardMetric
            label="eSewa Donations"
            value={formatNpr(state.stats.total_npr_donated)}
            meta="NPR collected through eSewa payments"
            tone="var(--info)"
          />
          <DashboardMetric
            label="Total Donors"
            value={state.stats.total_donors || 0}
            meta="Unique donors participating on the platform"
            tone="var(--ink)"
          />
          <DashboardMetric
            label="Verified Orgs"
            value={state.stats.total_organizations || 0}
            meta="Organizations approved for transparent fundraising"
            tone="var(--ink-soft)"
          />
        </div>
      ) : null}

      <div className="split-grid">
        <Card
          title="Open campaigns"
          description="Start from the highest-signal causes without leaving the dashboard."
          action={
            <Button as={Link} to="/campaigns" variant="ghost" size="sm">
              View all
            </Button>
          }
        >
          {state.campaigns.length ? (
            <div className="section-grid">
              {state.campaigns.map((campaign) => (
                <CampaignProgressCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          ) : (
            <div className="empty-inline">No active campaigns are available right now.</div>
          )}
        </Card>

        <div className="page-stack">
          <Card title="Top donors" description="Highest total donations across Phantom and eSewa.">
            <Table
              columns={[
                {
                  key: "wallet",
                  label: "Donor",
                  render: (row) => (
                    <div>
                      <strong>{row.donor_label || "Donor"}</strong>
                      <div style={{ fontFamily: "monospace", fontSize: 12, color: "var(--stone)" }}>
                        {formatCompactWallet(row.donor_wallet || "")}
                      </div>
                    </div>
                  ),
                },
                { key: "total_donations", label: "Donations" },
                {
                  key: "total_sol",
                  label: "Phantom",
                  render: (row) => <strong>{safeNumber(row.total_sol).toFixed(4)} SOL</strong>,
                },
                {
                  key: "total_npr",
                  label: "eSewa",
                  render: (row) => <strong>{formatNpr(row.total_npr)}</strong>,
                },
              ]}
              rows={state.topDonors}
              emptyLabel="Top donor data will appear after successful Phantom or eSewa donations."
            />
          </Card>

          <Card title="Recent momentum" description="Phantom and eSewa donation activity over the last 7 days.">
            <DonationChart data={state.chartData} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function CampaignFormModal({ org, open, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "education",
    goal_amount: "",
    goal_amount_npr: "",
    start_date: "",
    end_date: "",
    district: "",
    province: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm({
        title: "",
        description: "",
        category: "education",
        goal_amount: "",
        goal_amount_npr: "",
        start_date: "",
        end_date: "",
        district: "",
        province: "",
      });
      setSaving(false);
    }
  }, [open]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const goalAmount = parseFloat(form.goal_amount);
    const goalAmountNpr = form.goal_amount_npr === "" ? null : parseFloat(form.goal_amount_npr);

    if (!Number.isFinite(goalAmount) || goalAmount <= 0) {
      toast.error("Goal amount must be a positive number.");
      return;
    }

    if (goalAmountNpr !== null && (!Number.isFinite(goalAmountNpr) || goalAmountNpr <= 0)) {
      toast.error("eSewa goal amount must be a positive number.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        organization_id: org.id,
        goal_amount: goalAmount,
        goal_amount_npr: goalAmountNpr,
      };
      const response = await campaignAPI.create(payload);
      onCreated(response.data);
      toast.success("Campaign created successfully.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create campaign.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title="Create a new campaign"
      description="Launch a fundraising campaign without leaving the dashboard."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Creating..." : "Create campaign"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="section-grid">
        <Input label="Campaign title" name="title" value={form.title} onChange={handleChange} required />
        <Input
          label="Goal amount (SOL)"
          type="number"
          name="goal_amount"
          min="0.1"
          step="0.1"
          value={form.goal_amount}
          onChange={handleChange}
          required
        />
        <Input
          label="Goal amount (NPR / eSewa)"
          type="number"
          name="goal_amount_npr"
          min="10"
          step="1"
          value={form.goal_amount_npr}
          onChange={handleChange}
          placeholder="Optional eSewa target in rupees"
        />
        <Input
          label="Description"
          as="textarea"
          name="description"
          value={form.description}
          onChange={handleChange}
          required
          style={{ gridColumn: "1 / -1" }}
        />
        <Input as="select" label="Category" name="category" value={form.category} onChange={handleChange}>
          {CATEGORY_OPTIONS.map((category) => (
            <option key={category} value={category}>
              {category.replace("_", " ")}
            </option>
          ))}
        </Input>
        <Input label="District" name="district" value={form.district} onChange={handleChange} />
        <Input label="Start date" type="date" name="start_date" value={form.start_date} onChange={handleChange} required />
        <Input label="End date" type="date" name="end_date" value={form.end_date} onChange={handleChange} required />
        <Input as="select" label="Province" name="province" value={form.province} onChange={handleChange}>
          <option value="">Select province</option>
          {PROVINCES.map((province) => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </Input>
      </form>
    </Modal>
  );
}

function OrgDashboard({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [org, setOrg] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [orgResponse, campaignsResponse] = await Promise.allSettled([orgAPI.mine(), campaignAPI.list({ mine: "true" })]);

      if (orgResponse.status === "fulfilled") {
        setOrg(orgResponse.value.data || null);
      } else if (orgResponse.reason?.response?.status === 404) {
        setOrg(null);
      } else {
        throw orgResponse.reason;
      }

      if (campaignsResponse.status === "fulfilled") {
        setCampaigns(campaignsResponse.value.data?.campaigns || []);
      } else {
        throw campaignsResponse.reason;
      }
    } catch (loadError) {
      setError(loadError.response?.data?.message || "We could not load your organization workspace.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totals = useMemo(() => {
    const totalRaised = campaigns.reduce((sum, item) => sum + safeNumber(item.raised_amount), 0);
    const activeCount = campaigns.filter((item) => item.is_active).length;
    return { totalRaised, activeCount };
  }, [campaigns]);

  if (loading) return <Loader rows={3} label="Loading organization dashboard..." />;

  return (
    <div className="page-stack">
      <Card className="hero-card" padding="none">
        <div className="hero-copy">
          <h2>Build trust with every campaign you launch.</h2>
          <p>
            This workspace keeps your verification status, campaign portfolio, and fundraising performance in one
            organized place for day-to-day operations.
          </p>
          <div className="hero-actions">
            {org?.verification_status === "verified" ? (
              <Button onClick={() => setShowCreate(true)}>Create campaign</Button>
            ) : (
              <Button onClick={() => navigate("/org/register")}>Register organization</Button>
            )}
            <Button as={Link} to="/campaigns" variant="secondary">
              Browse platform campaigns
            </Button>
          </div>
        </div>

        <div className="hero-panel">
          <small>Workspace owner</small>
          <strong>{user.username}</strong>
          <p>
            {org
              ? `${org.name} is currently ${org.verification_status}.`
              : "Create and submit an organization profile before launching campaigns."}
          </p>
        </div>
      </Card>

      {error ? (
        <Card padding="md">
          <div className="notice-banner">{error}</div>
          <Button onClick={loadData} size="sm">
            Retry
          </Button>
        </Card>
      ) : null}

      <div className="grid-cards">
        <DashboardMetric
          label="Campaigns"
          value={campaigns.length}
          meta="All campaigns created by your organization"
          tone="var(--ink)"
        />
        <DashboardMetric
          label="Active campaigns"
          value={totals.activeCount}
          meta="Currently visible and accepting donations"
          tone="var(--sage)"
        />
        <DashboardMetric
          label="Total raised"
          value={`${totals.totalRaised.toFixed(3)} SOL`}
          meta="Combined direct SOL collected across all campaigns"
          tone="var(--terracotta)"
        />
      </div>

      {!org ? (
        <Card title="Register your organization" description="A verified organization profile is required before campaign creation.">
          <div className="notice-banner">
            Your account is ready, but it still needs an organization profile with verification details.
          </div>
          <Button onClick={() => navigate("/org/register")}>Start organization registration</Button>
        </Card>
      ) : (
        <Card
          title={org.name}
          description={[org.district, org.province].filter(Boolean).join(", ") || "Location not specified"}
          action={
            <span
              className={
                org.verification_status === "verified"
                  ? "badge badge-green"
                  : org.verification_status === "pending"
                    ? "badge badge-yellow"
                    : "badge badge-red"
              }
            >
              {org.verification_status}
            </span>
          }
        >
          <div className="notice-banner">
            {org.verification_status === "verified"
              ? "Your organization is verified. You can create and manage campaigns from this dashboard."
              : org.verification_status === "pending"
                ? "Verification is still pending. Campaign creation will unlock after approval."
                : "Verification was rejected. Please review your submitted details and contact the admin team if needed."}
          </div>
        </Card>
      )}

      {org?.verification_status === "verified" ? (
        <Card
          title="My campaigns"
          description="A cleaner operational view of collected funds, activity, and actions."
          action={
            <Button size="sm" onClick={() => setShowCreate(true)}>
              New campaign
            </Button>
          }
        >
          {campaigns.length ? (
            <div className="section-grid">
              {campaigns.map((campaign) => (
                <CampaignProgressCard
                  key={campaign.id}
                  campaign={campaign}
                  actionLabel="Manage details"
                  actionTo={`/campaigns/${campaign.id}`}
                />
              ))}
            </div>
          ) : (
            <div className="empty-inline">No campaigns yet. Create your first campaign to start raising funds.</div>
          )}
        </Card>
      ) : null}

      <CampaignFormModal
        org={org}
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(campaign) => {
          setCampaigns((prev) => [campaign, ...prev]);
          setShowCreate(false);
        }}
      />
    </div>
  );
}

function AdminDashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    campaignAPI
      .stats()
      .then((response) => setStats(response.data || null))
      .catch((loadError) => setError(loadError.response?.data?.message || "Admin metrics could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader rows={3} label="Loading admin workspace..." />;

  return (
    <div className="page-stack">
      <Card className="hero-card" padding="none">
        <div className="hero-copy">
          <h2>Operate the platform with a clearer control surface.</h2>
          <p>
            Welcome, {user.username}. Use this dashboard to monitor moderation, campaign visibility, and platform
            growth from one place without switching to a separate admin page.
          </p>
          <div className="hero-actions">
            <Button as={Link} to="/campaigns">
              Review campaigns
            </Button>
            <Button as={Link} to="/campaigns" variant="secondary">
              View public catalog
            </Button>
          </div>
        </div>

        <div className="hero-panel">
          <small>Admin access</small>
          <strong>Platform-wide oversight</strong>
          <p>Verification queues, campaign health, and donor visibility now live directly inside this dashboard flow.</p>
        </div>
      </Card>

      {error ? <div className="notice-banner">{error}</div> : null}

      {stats ? (
        <div className="grid-cards">
          <DashboardMetric label="Active campaigns" value={stats.total_campaigns || 0} meta="Currently listed campaigns" tone="var(--terracotta)" />
          <DashboardMetric label="eSewa donated" value={formatNpr(stats.total_npr_donated)} meta="NPR collected through eSewa" tone="var(--info)" />
          <DashboardMetric label="Donors" value={stats.total_donors || 0} meta="Tracked donor participation" tone="var(--ink)" />
          <DashboardMetric label="Organizations" value={stats.total_organizations || 0} meta="Verified and pending organizations" tone="var(--info)" />
        </div>
      ) : null}

      <div className="grid-cards-dense">
        <Card title="Moderation workspace" description="Monitor approvals and campaign oversight directly from the dashboard.">
          <p className="metric-meta">The separate admin page has been removed so this dashboard stays the single admin workspace.</p>
          <Button as={Link} to="/campaigns">
            Review campaigns
          </Button>
        </Card>
        <Card title="Live fundraising surface" description="Review campaign presentation exactly as donors will see it.">
          <p className="metric-meta">Open the campaigns catalog to inspect progress bars, categories, and card-level details.</p>
          <Button as={Link} to="/campaigns" variant="secondary">
            View campaigns
          </Button>
        </Card>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "org_admin") return <OrgDashboard user={user} />;
  return <DonorDashboard user={user} />;
}
