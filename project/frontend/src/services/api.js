// src/services/api.js
import axios from "axios";

const configuredBaseUrl = import.meta.env.VITE_API_URL;
const BASE_URL =
  configuredBaseUrl ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:5000/api`
    : "http://localhost:5000/api");

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nd_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("nd_token");
      localStorage.removeItem("nd_user");
      window.dispatchEvent(new Event("nd:logout"));
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register:   (data)           => api.post("/auth/register", data),
  login:      (data)           => api.post("/auth/login", data),
  me:         ()               => api.get("/auth/me"),
  linkWallet: (wallet_address) => api.patch("/auth/wallet", { wallet_address }),
};

// ── Campaigns ─────────────────────────────────────────────────────────────────
export const campaignAPI = {
  list:      (params) => api.get("/campaigns", { params }),
  get:       (id)     => api.get(`/campaigns/${id}`),
  create:    (data)   => api.post("/campaigns", data),
  stats:     ()       => api.get("/campaigns/stats/platform"),
  donate:    (id, data) => api.post(`/campaigns/${id}/donate`, data),
  donations: (id)     => api.get(`/campaigns/${id}/donations`),
  releaseMilestone: (id, idx, data) =>
    api.post(`/campaigns/${id}/milestones/${idx}/release`, data),
};

// ── Donations ─────────────────────────────────────────────────────────────────
export const donationAPI = {
  // Phantom / SOL
  record:          (data)    => api.post("/donations", data),
  // eSewa
  recordEsewa:     (data)    => api.post("/donations/esewa/verify", data),
  esewaSignature:  (data)    => api.post("/donations/esewa/signature", data),
  // History
  byWallet:        (address) => api.get(`/donations/wallet/${address}`),
  myDonations:     ()        => api.get("/donations/my"),
  topDonors:       ()        => api.get("/donations/top-donors"),
  chart:           ()        => api.get("/donations/chart"),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const userAPI = {
  getProfile:     ()     => api.get("/users/profile"),
  updateProfile:  (data) => api.patch("/users/profile", data),
  changePassword: (data) => api.patch("/users/password", data),
  getOrgProfile:  (id)   => api.get(`/users/org/${id}`),
};

// ── Organizations ─────────────────────────────────────────────────────────────
export const orgAPI = {
  list:   ()         => api.get("/organizations"),
  get:    (id)       => api.get(`/organizations/${id}`),
  mine:   ()         => api.get("/organizations/mine"),
  create: (data)     => api.post("/organizations", data),
  verify: (id, data) => api.patch(`/organizations/${id}/verify`, data),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  stats:                ()              => api.get("/admin/stats"),
  users:                ()              => api.get("/admin/users"),
  // Match the live backend method so admin role updates do not 404.
  setRole:              (id, role)      => api.patch(`/admin/users/${id}/role`, { role }),
  organizations:        ()              => api.get("/admin/organizations"),
  // Match the live backend method so org verification updates do not 404.
  verifyOrg:            (id, data)      => api.patch(`/admin/organizations/${id}/verify`, data),
  campaigns:            ()              => api.get("/admin/campaigns"),
  updateCampaignStatus: (id, is_active) => api.put(`/admin/campaigns/${id}/status`, { is_active }),
  deleteCampaign:       (id)            => api.delete(`/admin/campaigns/${id}`),
  toggleCampaign:       (id)            => api.patch(`/admin/campaigns/${id}/toggle`),
};

// ── IPFS ──────────────────────────────────────────────────────────────────────
export const ipfsAPI = {
  uploadFile: (file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/ipfs/file", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadJson: (data) => api.post("/ipfs/json", data),
};

export default api;
