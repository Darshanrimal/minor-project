import React from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./services/AuthContext";
import AppShell from "./layouts/AppShell";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import Donate from "./pages/Donate";
import OrgRegister from "./pages/OrgRegister";
import AdminPanel from "./pages/AdminPanel";
import Home from "./pages/Home";
import DonationHistory from "./pages/DonationHistory";
import UserProfile from "./pages/UserProfile";
import OrgProfile from "./pages/OrgProfile";
import EsewaSuccess from "./pages/EsewaSuccess";
import EsewaFailure from "./pages/EsewaFailure";
import EsewaTestGateway from "./pages/EsewaTestGateway";

function FullScreenLoader() {
  return (
    <div className="loader-wrap" style={{ minHeight: "100vh" }}>
      <div className="spinner" aria-hidden="true" />
      <span className="loader-label">Loading your workspace...</span>
    </div>
  );
}

function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;
  // Preserve the full original destination so login can return users to the page they requested.
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function ShellLayout() {
  return <AppShell />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ShellLayout />}>
        <Route path="/donate" element={<Navigate to="/campaigns" replace />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/org/:id" element={<OrgProfile />} />
        <Route path="/esewa/success" element={<EsewaSuccess />} />
        <Route path="/esewa/failure" element={<EsewaFailure />} />
        <Route path="/esewa/test-gateway" element={<EsewaTestGateway />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/campaigns/:id/donate" element={<Donate />} />
          <Route path="/history" element={<DonationHistory />} />
          <Route path="/profile" element={<UserProfile />} />
        </Route>

        <Route element={<ProtectedRoute roles={["org_admin"]} />}>
          <Route path="/org/register" element={<OrgRegister />} />
        </Route>

        <Route element={<ProtectedRoute roles={["admin"]} />}>
          <Route path="/admin" element={<AdminPanel />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

