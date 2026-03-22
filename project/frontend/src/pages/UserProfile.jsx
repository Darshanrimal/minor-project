// src/pages/UserProfile.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../services/AuthContext";
import { userAPI, donationAPI } from "../services/api";
import toast from "react-hot-toast";

const TABS = ["info", "donations", "security"];

export default function UserProfile() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile]     = useState(null);
  const [donations, setDonations] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [tab, setTab]             = useState("info");
  const [editMode, setEditMode]   = useState(false);
  const [username, setUsername]   = useState("");
  const [pwForm, setPwForm]       = useState({ current:"", next:"", confirm:"" });
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login", { replace: true }); return; }
    Promise.all([
      userAPI.getProfile().then(r => {
        setProfile(r.data);
        setUsername(r.data?.username || "");
      }),
      donationAPI.myDonations().then(r => setDonations(r.data || [])),
    ]).catch(() => {}).finally(() => setPageLoading(false));
  }, [user, authLoading, navigate]);

  const handleUpdateUsername = async () => {
    if (!username.trim() || username.trim().length < 3)
      return toast.error("Username must be at least 3 characters");
    setSaving(true);
    try {
      const { data } = await userAPI.updateProfile({ username: username.trim() });
      setProfile(data);
      setEditMode(false);
      toast.success("Username updated!");
      if (refreshUser) await refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update");
    } finally { setSaving(false); }
  };

  const handleChangePassword = async e => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) return toast.error("Passwords do not match");
    if (pwForm.next.length < 6)         return toast.error("Password must be at least 6 characters");
    setSaving(true);
    try {
      await userAPI.changePassword({ current_password: pwForm.current, new_password: pwForm.next });
      toast.success("Password changed successfully!");
      setPwForm({ current:"", next:"", confirm:"" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally { setSaving(false); }
  };

  if (authLoading || pageLoading) return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", minHeight:"60vh" }}>
      <div className="pulse" style={{ width:40, height:40, borderRadius:"50%", background:"var(--crimson)" }} />
    </div>
  );

  if (!profile) return null;

  const totalSol = donations.reduce((a, d) => a + parseFloat(d.amount_sol || 0), 0);
  const initial  = (profile.username || "U")[0].toUpperCase();

  return (
    <div style={{ padding:"40px 0", background:"var(--cream)", minHeight:"100vh" }}>
      <div className="container" style={{ maxWidth:720 }}>

        {/* Header */}
        <div className="fade-up" style={{ display:"flex", alignItems:"center", gap:20, marginBottom:28 }}>
          <div style={{
            width:64, height:64, borderRadius:"50%", flexShrink:0,
            background:"linear-gradient(135deg,var(--crimson),var(--saffron))",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"#fff", fontFamily:"var(--font-display)", fontWeight:800, fontSize:24,
          }}>
            {initial}
          </div>
          <div>
            <h1 style={{ fontFamily:"var(--font-display)", fontSize:24, fontWeight:800 }}>
              {profile.username}
            </h1>
            <p style={{ color:"var(--stone)", marginTop:2, textTransform:"capitalize" }}>
              {(profile.role || "donor").replace("_"," ")} ·
              Joined {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:24 }}>
          {[
            { label:"Donations",    value: donations.length,        color:"var(--crimson)" },
            { label:"SOL Donated",  value: totalSol.toFixed(4),     color:"var(--saffron)" },
            { label:"Role",         value: (profile.role||"donor").replace("_"," "), color:"var(--info)" },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding:18, textAlign:"center" }}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:18,
                fontWeight:800, color:s.color, textTransform:"capitalize" }}>
                {s.value}
              </div>
              <div style={{ fontSize:11, color:"var(--stone)", marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:4, marginBottom:20,
          background:"var(--white)", padding:4, borderRadius:12,
          width:"fit-content", boxShadow:"var(--shadow)" }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding:"8px 18px", border:"none", borderRadius:10,
              cursor:"pointer", fontFamily:"var(--font-display)",
              fontSize:13, fontWeight:600, textTransform:"capitalize",
              background: tab === t ? "var(--crimson)" : "transparent",
              color:      tab === t ? "#fff" : "var(--stone)",
              transition:"all .2s",
            }}>
              {t}
            </button>
          ))}
        </div>

        {/* Info tab */}
        {tab === "info" && (
          <div className="card" style={{ padding:28 }}>
            <h3 style={{ fontFamily:"var(--font-display)", fontWeight:700, marginBottom:20 }}>
              Profile Information
            </h3>
            <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

              {/* Username */}
              <div>
                <div style={{ fontSize:12, color:"var(--stone)", marginBottom:6,
                  textTransform:"uppercase", letterSpacing:".05em" }}>Username</div>
                {editMode ? (
                  <div style={{ display:"flex", gap:8 }}>
                    <input className="form-input" value={username}
                      onChange={e => setUsername(e.target.value)}
                      style={{ flex:1 }} autoFocus />
                    <button className="btn btn-primary btn-sm"
                      onClick={handleUpdateUsername} disabled={saving}>
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button className="btn btn-ghost btn-sm"
                      onClick={() => { setEditMode(false); setUsername(profile.username || ""); }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontWeight:600 }}>{profile.username}</span>
                    <button className="btn btn-ghost btn-sm"
                      onClick={() => setEditMode(true)}
                      style={{ border:"1px solid #DDD4C8" }}>
                      Edit
                    </button>
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <div style={{ fontSize:12, color:"var(--stone)", marginBottom:4,
                  textTransform:"uppercase", letterSpacing:".05em" }}>Email</div>
                <div style={{ fontWeight:600 }}>{profile.email || "—"}</div>
              </div>

              {/* Role */}
              <div>
                <div style={{ fontSize:12, color:"var(--stone)", marginBottom:4,
                  textTransform:"uppercase", letterSpacing:".05em" }}>Role</div>
                <div style={{ fontWeight:600, textTransform:"capitalize" }}>
                  {(profile.role || "donor").replace("_"," ")}
                </div>
              </div>

              {/* Wallet */}
              <div>
                <div style={{ fontSize:12, color:"var(--stone)", marginBottom:4,
                  textTransform:"uppercase", letterSpacing:".05em" }}>Wallet Address</div>
                {profile.wallet_address ? (
                  <div style={{ fontFamily:"monospace", fontSize:12,
                    wordBreak:"break-all", padding:10,
                    background:"var(--cream)", borderRadius:8 }}>
                    {profile.wallet_address}
                  </div>
                ) : (
                  <span style={{ color:"var(--stone)", fontSize:13 }}>
                    Not linked — connect Phantom wallet from the navbar
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Donations tab */}
        {tab === "donations" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {donations.length === 0 ? (
              <div className="card" style={{ padding:48, textAlign:"center" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>💙</div>
                <p style={{ color:"var(--stone)" }}>No donations yet</p>
              </div>
            ) : donations.map((d, i) => (
              <div key={d.id ?? i} className="card" style={{ padding:18 }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", flexWrap:"wrap", gap:12 }}>
                  <div>
                    <div style={{ fontWeight:700, marginBottom:4 }}>
                      {d.campaign_title || "Campaign"}
                    </div>
                    <div style={{ fontSize:12, color:"var(--stone)" }}>
                      {new Date(d.created_at).toLocaleString()}
                    </div>
                    {d.message && (
                      <div style={{ fontSize:12, color:"var(--stone)",
                        fontStyle:"italic", marginTop:4 }}>
                        "{d.message}"
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:"var(--font-display)", fontWeight:800,
                      color:"var(--crimson)", fontSize:18 }}>
                      {parseFloat(d.amount_sol || 0).toFixed(4)} SOL
                    </div>
                    <a href={`https://explorer.solana.com/tx/${d.tx_signature}?cluster=devnet`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ fontSize:11, color:"var(--info)" }}>
                      🔗 Explorer
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Security tab */}
        {tab === "security" && (
          <div className="card" style={{ padding:28 }}>
            <h3 style={{ fontFamily:"var(--font-display)", fontWeight:700, marginBottom:20 }}>
              Change Password
            </h3>
            <form onSubmit={handleChangePassword}
              style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input className="form-input" type="password"
                  value={pwForm.current}
                  onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                  placeholder="Enter current password" required />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password"
                  value={pwForm.next}
                  onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                  placeholder="Min 6 characters" required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input className="form-input" type="password"
                  value={pwForm.confirm}
                  onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Repeat new password" required />
              </div>
              <button className="btn btn-primary" type="submit"
                disabled={saving} style={{ width:"fit-content" }}>
                {saving ? "Changing…" : "Change Password"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
