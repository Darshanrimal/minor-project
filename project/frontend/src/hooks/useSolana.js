// src/hooks/useSolana.js
// Custom hook for Solana wallet and connection utilities
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useState, useEffect, useCallback } from "react";

export function useSolana() {
  const { connection }  = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!publicKey || !connection) { setBalance(null); return; }
    try {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch { setBalance(null); }
  }, [publicKey, connection]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const shortAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 8)}…${publicKey.toBase58().slice(-6)}`
    : null;

  return {
    connection,
    publicKey,
    connected,
    sendTransaction,
    balance,
    shortAddress,
    fetchBalance,
    loading,
    setLoading,
    LAMPORTS_PER_SOL,
  };
}
