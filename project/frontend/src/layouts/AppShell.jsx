import React, { useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useAuth } from "../services/AuthContext";
import { useTheme } from "../services/ThemeContext";
import Button from "../components/ui/Button";

function roleLabel(role) {
  if (role === "admin") return "Platform Admin";
  if (role === "org_admin") return "Organization Admin";
  return "";
}

function pageMeta(pathname, user) {
  if (pathname.startsWith("/dashboard")) {
    return {
      title: user?.role === "org_admin" ? "Organization Atelier" : user?.role === "admin" ? "Civic Command" : "Donation Ledger",
      description: "A composed workspace for campaigns, payments, and trust signals across Phantom and eSewa.",
    };
  }
  if (pathname.startsWith("/campaigns")) {
    return {
      title: "Campaign Library",
      description: "Read the causes, compare the rails, and step into a donation flow without losing context.",
    };
  }
  if (pathname.startsWith("/history")) {
    return {
      title: "Donation History",
      description: "Review every proof, reference, and payment trail in one clear record.",
    };
  }
  if (pathname.startsWith("/profile")) {
    return {
      title: "Profile",
      description: "Manage your identity, wallet posture, and the account details behind every donation.",
    };
  }
  if (pathname.startsWith("/admin")) {
    return {
      title: "Admin",
      description: "Moderate organizations, watch fundraising health, and keep the platform disciplined.",
    };
  }
  if (pathname.includes("/donate")) {
    return {
      title: "Donate",
      description: "Choose the rail, confirm the amount, and complete a verified contribution.",
    };
  }
  return {
    title: "NepalDaan",
    description: "An editorial transparency layer for charitable giving in Nepal.",
  };
}

export default function AppShell() {
  const { user, loading, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const meta = useMemo(() => pageMeta(location.pathname, user), [location.pathname, user]);
  const items = useMemo(() => {
    if (loading) {
      return [{ to: "/campaigns", label: "Campaigns", show: true }];
    }

    const dashboardTarget = user?.role === "admin" ? "/admin" : "/dashboard";
    const base = [
      { to: dashboardTarget, label: "Dashboard", show: Boolean(user) },
      { to: "/campaigns", label: "Campaigns", show: true },
      { to: "/history", label: "My Donations", show: Boolean(user) },
      { to: "/profile", label: "Profile", show: Boolean(user) },
      { to: "/admin", label: "Admin", show: user?.role === "admin" },
    ];
    return base.filter((item) => item.show);
  }, [loading, user]);

  const indexedItems = items.map((item, index) => ({
    ...item,
    index: String(index + 1).padStart(2, "0"),
  }));

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-shell">
      <aside className={["shell-sidebar", sidebarOpen ? "is-open" : ""].join(" ")}>
        <div className="shell-brand">
          <Link to="/" className="shell-logo" onClick={closeSidebar}>
            <span className="shell-logo-mark">N</span>
            <span>
              <strong>NepalDaan</strong>
              <small>Blockchain Charity</small>
            </span>
          </Link>
          <Button variant="ghost" size="sm" className="shell-close" onClick={closeSidebar}>
            Close
          </Button>
        </div>

        <nav className="shell-nav" aria-label="Primary">
          {indexedItems.map((item) => (
            <NavLink
              key={`${item.to}-${item.label}`}
              to={item.to}
              onClick={closeSidebar}
              className={({ isActive }) => ["shell-nav-link", isActive ? "active" : ""].join(" ")}
              end={item.to === "/dashboard"}
            >
              <span className="shell-nav-label">
                <span className="shell-nav-index" aria-hidden="true">
                  {item.index}
                </span>
                <span>{item.label}</span>
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="shell-sidebar-foot">
          <div className="shell-panel">
            <span className="shell-panel-label">Transparency</span>
            <p>Every donation flow is linked to verifiable records across your backend and Solana devnet.</p>
          </div>
        </div>
      </aside>

      {sidebarOpen ? <button className="shell-overlay" onClick={closeSidebar} aria-label="Close sidebar" /> : null}

      <div className="shell-main">
        <header className="shell-topbar">
          <div className="shell-topbar-left">
            <Button variant="ghost" size="sm" className="shell-menu" onClick={() => setSidebarOpen(true)}>
              Menu
            </Button>
            <div>
              <div className="shell-eyebrow">Workspace</div>
              <h1 className="shell-title">{meta.title}</h1>
              <p className="shell-subtitle">{meta.description}</p>
            </div>
          </div>

          <div className="shell-topbar-actions">
            <Button variant="ghost" size="sm" onClick={toggle}>
              {dark ? "Light" : "Dark"}
            </Button>
            <WalletMultiButton />
            {user ? (
              <>
                <div className="shell-user">
                  <strong>{user.username}</strong>
                  {roleLabel(user.role) ? <span>{roleLabel(user.role)}</span> : null}
                </div>
                <Button variant="secondary" size="sm" onClick={logout}>
                  Sign out
                </Button>
              </>
            ) : (
              <Button as={Link} to="/login" variant="secondary" size="sm">
                Sign in
              </Button>
            )}
          </div>
        </header>

        <div className="shell-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
