// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import WalletContextProvider from "./wallet/WalletContext";
import { AuthProvider } from "./services/AuthContext";
import App from "./App";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <WalletContextProvider>
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                fontFamily: "'DM Sans', sans-serif",
                borderRadius: "12px",
                fontSize: "14px",
              },
              success: { iconTheme: { primary: "#27AE60", secondary: "#fff" } },
              error:   { iconTheme: { primary: "#E74C3C", secondary: "#fff" } },
            }}
          />
        </AuthProvider>
      </WalletContextProvider>
    </BrowserRouter>
  </React.StrictMode>
);
