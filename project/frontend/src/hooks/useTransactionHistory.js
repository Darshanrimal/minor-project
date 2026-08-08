// src/hooks/useTransactionHistory.js
import { useState, useCallback } from "react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";

export function useTransactionHistory() {
  const { connection }          = useConnection();
  const [txns, setTxns]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const fetchHistory = useCallback(async (walletAddress, limit = 10) => {
    if (!walletAddress || !connection) {
      setError("No wallet address or connection available.");
      return false;
    }

    setLoading(true);
    setError(null);
    setTxns([]);

    try {
      let pubkey;
      try {
        pubkey = new PublicKey(walletAddress);
      } catch {
        setError("Invalid wallet address format.");
        return false;
      }

      const signatures = await connection.getSignaturesForAddress(pubkey, {
        limit,
        commitment: "confirmed",
      });

      if (!signatures || signatures.length === 0) {
        setTxns([]);
        return true;
      }

      const results = await Promise.allSettled(
        signatures.map(s =>
          connection.getParsedTransaction(s.signature, {
            maxSupportedTransactionVersion: 0,
            commitment: "confirmed",
          })
        )
      );

      const parsed = signatures.map((sig, i) => {
        const result  = results[i];
        let amountSol = null;

        if (result.status === "fulfilled" && result.value) {
          const tx = result.value;

          // Method 1 — parse system transfer instruction
          const instructions = tx.transaction?.message?.instructions || [];
          for (const ix of instructions) {
            if (ix.program === "system" && ix.parsed?.type === "transfer") {
              const lamports = ix.parsed?.info?.lamports;
              if (typeof lamports === "number" && lamports > 0) {
                amountSol = lamports / LAMPORTS_PER_SOL;
                break;
              }
            }
          }

          // Method 2 — fallback: pre/post balance diff
          if (amountSol === null && tx.meta) {
            const pre  = tx.meta.preBalances  || [];
            const post = tx.meta.postBalances || [];
            if (pre.length > 1 && post.length > 1) {
              const diff = post[1] - pre[1];
              if (diff > 0) amountSol = diff / LAMPORTS_PER_SOL;
            }
          }
        }

        return {
          signature:   sig.signature,
          slot:        sig.slot,
          blockTime:   sig.blockTime ? new Date(sig.blockTime * 1000) : null,
          err:         sig.err,
          amountSol,
          explorerUrl: `https://explorer.solana.com/tx/${sig.signature}?cluster=devnet`,
        };
      });

      setTxns(parsed);
      return true;
    } catch (err) {
      console.error("fetchHistory error:", err.message);
      setError("Failed to fetch transactions. Check your connection and try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [connection]);

  return { txns, loading, error, fetchHistory };
}