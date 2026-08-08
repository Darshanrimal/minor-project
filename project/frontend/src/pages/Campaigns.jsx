import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { campaignAPI } from "../services/api";
import { useAuth } from "../services/AuthContext";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { SkeletonCard } from "../components/ui/Loader";

const CATEGORIES = ["", "education", "health", "disaster_relief", "environment", "community", "animals", "other"];
const PROVINCES = ["", "Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpashchim"];

const CATEGORY_COPY = {
  education: "Scholarships, schools, and access to learning support.",
  health: "Care access, medicine, and medical fundraising campaigns.",
  disaster_relief: "Emergency response and urgent recovery support.",
  environment: "Community cleanup, restoration, and sustainability work.",
  community: "Local initiatives that strengthen daily life and resilience.",
  animals: "Animal welfare, rescue, and care programs.",
  other: "Causes that do not fit a single category bucket.",
};

function safeNumber(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDaysLeft(endDate) {
  if (!endDate) return "Open-ended";
  const end = new Date(endDate);
  const diff = Math.ceil((end.getTime() - Date.now()) / 86400000);
  if (!Number.isFinite(diff)) return "Open-ended";
  if (diff <= 0) return "Ends today";
  return `${diff} days left`;
}

function CampaignCard({ campaign }) {
  const goal = safeNumber(campaign.goal_amount);
  const totalSolDirect = safeNumber(campaign.total_sol_direct);
  const totalNprDirect = safeNumber(campaign.total_npr_direct);

  return (
    <Card className="campaign-compact fade-up" padding="md">
      <div className="campaign-compact-head">
        <div>
          <div className="pill-row" style={{ marginBottom: 10 }}>
            <span className="badge badge-gray" style={{ textTransform: "capitalize" }}>
              {(campaign.category || "general").replace("_", " ")}
            </span>
            {campaign.province ? <span className="badge badge-blue">{campaign.province}</span> : null}
          </div>
          <h3 className="campaign-compact-title">{campaign.title}</h3>
          <p className="campaign-compact-copy">{campaign.organization_name || "Verified organization"}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="metric-meta">Collected SOL</div>
          <strong style={{ color: "var(--terracotta)", fontFamily: "var(--font-display)", fontSize: 24 }}>
            {totalSolDirect.toFixed(3)} SOL
          </strong>
        </div>
      </div>

      <p className="campaign-compact-copy">
        {campaign.description || CATEGORY_COPY[campaign.category] || "Transparent fundraising campaign on NepalDaan."}
      </p>

      <div className="stat-inline">
        <span className="metric-meta">Goal {goal.toFixed(3)} SOL</span>
        <span className="metric-meta">{formatDaysLeft(campaign.end_date)}</span>
      </div>

      <div className="stat-inline" style={{ marginTop: 4 }}>
        <span className="metric-meta">Collected Rs {totalNprDirect.toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span className="metric-meta">Direct donations only</span>
      </div>

      <div className="campaign-compact-footer">
        <Button as={Link} to={`/campaigns/${campaign.id}`} variant="ghost" size="sm">
          View details
        </Button>
        <Button as={Link} to={`/campaigns/${campaign.id}/donate`} size="sm">
          Donate now
        </Button>
      </div>
    </Card>
  );
}

export default function Campaigns() {
  const { user, loading: authLoading } = useAuth();
  const [params, setParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  const category = params.get("category") || "";
  const province = params.get("province") || "";

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await campaignAPI.list({
        category: category || undefined,
        province: province || undefined,
      });
      setCampaigns(response.data?.campaigns || []);
      setTotal(response.data?.total || 0);
    } catch (loadError) {
      setCampaigns([]);
      setTotal(0);
      setError(loadError.response?.data?.message || "Campaigns could not be loaded right now.");
    } finally {
      setLoading(false);
    }
  }, [category, province]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const filteredCampaigns = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return campaigns;
    return campaigns.filter((campaign) => {
      return [campaign.title, campaign.organization_name, campaign.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [campaigns, search]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  const highlightedCategory = category || filteredCampaigns[0]?.category || "education";

  return (
    <div className="page-stack">
      <Card className="hero-card" padding="none">
        <div className="hero-copy">
          <div className="editorial-kicker">Campaign library</div>
          <h2>Read the cause before you fund the cause.</h2>
          <p>
            Browse with an editorial lens, compare collected SOL and eSewa totals at a glance, and enter a verified
            donation flow without breaking your reading rhythm.
          </p>
          <div className="hero-actions">
            {user ? (
              <>
                <Button as={Link} to="/dashboard">
                  Open dashboard
                </Button>
                <Button as={Link} to="/history" variant="secondary">
                  View my donations
                </Button>
              </>
            ) : (
              <>
                <Button as={Link} to="/login">
                  Sign in to donate
                </Button>
                <Button as={Link} to="/register" variant="secondary">
                  Create account
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="hero-panel">
          <small>Live catalog</small>
          <strong>{total} active campaigns</strong>
          <p>{CATEGORY_COPY[highlightedCategory] || "Causes across Nepal are actively raising support."}</p>
        </div>
      </Card>

      <Card title="Find the right campaign" description="Search and filter without losing the current result set.">
        <div className="filter-bar">
          <div className="search-input">
            <Input
              label="Search"
              name="campaign_search"
              placeholder="Search by title, organization, or description"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <Input as="select" label="Category" value={category} onChange={(event) => setFilter("category", event.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.slice(1).map((item) => (
              <option key={item} value={item}>
                {item.replace("_", " ")}
              </option>
            ))}
          </Input>

          <Input as="select" label="Province" value={province} onChange={(event) => setFilter("province", event.target.value)}>
            <option value="">All provinces</option>
            {PROVINCES.slice(1).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Input>

          <Button
            variant="ghost"
            onClick={() => {
              setParams({});
              setSearch("");
            }}
          >
            Reset
          </Button>
        </div>

        <div className="stat-inline" style={{ flexWrap: "wrap" }}>
          <div className="status-line">
            <span className="status-dot" />
            <span>
              Showing {filteredCampaigns.length} of {total} campaigns
            </span>
          </div>
          <div className="pill-row">
            {category ? <span className="badge badge-blue">{category.replace("_", " ")}</span> : null}
            {province ? <span className="badge badge-gray">{province}</span> : null}
            {search ? <span className="badge badge-yellow">Search active</span> : null}
            {!authLoading && !user ? <span className="badge badge-gray">Guest view</span> : null}
          </div>
        </div>
      </Card>

      {error ? (
        <Card padding="md">
          <div className="notice-banner">{error}</div>
          <Button onClick={loadCampaigns} size="sm">
            Retry
          </Button>
        </Card>
      ) : null}

      {loading ? (
        <div className="grid-cards-dense">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : filteredCampaigns.length ? (
        <div className="grid-cards-dense">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      ) : (
        <Card padding="lg">
          <div className="empty-state">
            <h3>No campaigns matched your filters</h3>
            <p>
              Try widening your search, removing a province filter, or checking back later for newly approved campaigns.
            </p>
            <div className="hero-actions" style={{ justifyContent: "center" }}>
              <Button
                onClick={() => {
                  setParams({});
                  setSearch("");
                }}
              >
                Clear filters
              </Button>
              <Button as={Link} to="/dashboard" variant="secondary">
                Go to dashboard
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
