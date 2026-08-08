// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "./services/ThemeContext";
import { AuthProvider } from "./services/AuthContext";
import WalletContextProvider from "./wallet/WalletContext";
import App from "./App";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <WalletContextProvider>
          <AuthProvider>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  fontFamily: "var(--font-body)",
                  background: "var(--white)",
                  color: "var(--ink)",
                  border: "1px solid rgba(192,57,43,.15)",
                  boxShadow: "var(--shadow)",
                },
              }}
            />
          </AuthProvider>
        </WalletContextProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
