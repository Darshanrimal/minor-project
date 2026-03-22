// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./services/AuthContext";
import Navbar          from "./components/Navbar";
import Login           from "./pages/Login";
import Register        from "./pages/Register";
import Dashboard       from "./pages/Dashboard";
import Campaigns       from "./pages/Campaigns";
import CampaignDetail  from "./pages/CampaignDetail";
import Donate          from "./pages/Donate";
import OrgRegister     from "./pages/OrgRegister";
import AdminPanel      from "./pages/AdminPanel";
import Home            from "./pages/Home";
import DonationHistory from "./pages/DonationHistory";
import UserProfile     from "./pages/UserProfile";
import OrgProfile      from "./pages/OrgProfile";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"100vh" }}>
      <div className="pulse" style={{ width:48, height:48, borderRadius:"50%", background:"var(--crimson)" }} />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <main style={{ minHeight:"calc(100vh - var(--nav-h))", paddingTop:"var(--nav-h)" }}>
        <Routes>
          <Route path="/"               element={<Home />} />
          <Route path="/login"          element={<Login />} />
          <Route path="/register"       element={<Register />} />
          <Route path="/campaigns"      element={<Campaigns />} />
          <Route path="/campaigns/:id"  element={<CampaignDetail />} />
          <Route path="/org/register"   element={
            <ProtectedRoute roles={["org_admin"]}><OrgRegister /></ProtectedRoute>
          } />
          <Route path="/org/:id"        element={<OrgProfile />} />

          <Route path="/campaigns/:id/donate" element={
            <ProtectedRoute><Donate /></ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute><DonationHistory /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><UserProfile /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute roles={["admin"]}><AdminPanel /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
