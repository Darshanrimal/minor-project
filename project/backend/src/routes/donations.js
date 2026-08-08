const express = require("express");
const auth = require("../middleware/auth");
const db = require("../models/db");
const { recordEsewaOnChain } = require("../services/solanaService");
const {
  ESEWA_PRODUCT_CODE,
  convertNprToSol,
  fetchEsewaTransactionStatus,
  generateEsewaRefId,
  normalizeEsewaCallback,
  parsePositiveAmount,
  signEsewaPayload,
  verifyEsewaResponseSignature,
} = require("../services/esewaService");

const router = express.Router();

function buildDonationResponse(donation) {
  if (!donation) {
    return null;
  }

  return {
    id: donation.id,
    campaign_id: donation.campaign_id,
    donor_wallet: donation.donor_wallet,
    payment_method: donation.payment_method,
    amount_sol: donation.amount_sol,
    amount_npr: donation.amount_npr,
    tx_signature: donation.tx_signature,
    blockchain_ref: donation.blockchain_ref,
    esewa_ref_id: donation.esewa_ref_id,
    message: donation.message,
    created_at: donation.created_at,
  };
}

async function findDonationByEsewaRef(esewaRefId, txSignature) {
  const [[donation]] = await db.query(
    `SELECT id, campaign_id, donor_wallet, payment_method, amount_sol, amount_npr,
            tx_signature, blockchain_ref, esewa_ref_id, message, created_at
     FROM donations
     WHERE esewa_ref_id = ? OR tx_signature = ?
     LIMIT 1`,
    [esewaRefId, txSignature]
  );
  return donation || null;
}

router.get("/my", auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.id, d.amount_sol, d.amount_npr, d.payment_method,
              d.tx_signature, d.blockchain_ref, d.esewa_ref_id,
              d.message, d.created_at, d.donor_wallet,
              c.title AS campaign_title, c.id AS campaign_id,
              o.name AS organization_name
       FROM donations d
       JOIN campaigns c ON d.campaign_id = c.id
       JOIN organizations o ON c.organization_id = o.id
       WHERE d.user_id = ?
       ORDER BY d.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("my donations error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/wallet/:address", async (req, res) => {
  const address = String(req.params.address || "").trim();
  if (!address) {
    return res.status(400).json({ message: "Wallet address required" });
  }

  try {
    const [rows] = await db.query(
      `SELECT d.id, d.amount_sol, d.amount_npr, d.payment_method,
              d.tx_signature, d.blockchain_ref, d.esewa_ref_id,
              d.message, d.created_at, d.donor_wallet,
              c.title AS campaign_title, c.id AS campaign_id
       FROM donations d
       JOIN campaigns c ON d.campaign_id = c.id
       WHERE d.donor_wallet = ?
       ORDER BY d.created_at DESC`,
      [address]
    );
    res.json(rows);
  } catch (err) {
    console.error("wallet donations error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/top-donors", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
          COALESCE(u.username, MIN(CASE WHEN d.donor_wallet <> 'esewa' THEN d.donor_wallet END), 'eSewa donor') AS donor_label,
          COALESCE(u.wallet_address, MIN(CASE WHEN d.donor_wallet <> 'esewa' THEN d.donor_wallet END), MIN(d.donor_wallet)) AS donor_wallet,
          COUNT(*) AS total_donations,
          ROUND(SUM(COALESCE(d.amount_sol, 0)), 4) AS total_sol,
          ROUND(SUM(COALESCE(d.amount_npr, 0)), 2) AS total_npr
       FROM donations d
       LEFT JOIN users u ON u.id = d.user_id
       GROUP BY COALESCE(d.user_id, d.donor_wallet)
       ORDER BY SUM(COALESCE(d.amount_sol, 0)) DESC, SUM(COALESCE(d.amount_npr, 0)) DESC
       LIMIT 5`
    );
    res.json(rows);
  } catch (err) {
    console.error("top donors error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/chart", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT DATE(created_at) AS date,
              COUNT(*) AS count,
              ROUND(SUM(CASE WHEN payment_method='sol' THEN amount_sol ELSE 0 END), 4) AS total_sol,
              ROUND(SUM(CASE WHEN payment_method='esewa' THEN amount_npr ELSE 0 END), 2) AS total_npr
       FROM donations
       WHERE created_at >= datetime('now', '-7 days')
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error("chart error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/esewa/signature", auth, async (req, res) => {
  const amount = parsePositiveAmount(req.body.total_amount);
  const transactionUuid = String(req.body.transaction_uuid || "").trim();
  const productCode = String(req.body.product_code || ESEWA_PRODUCT_CODE).trim();

  if (!amount || !transactionUuid || !productCode) {
    return res.status(400).json({
      message: "total_amount, transaction_uuid, product_code required",
    });
  }

  const signature = signEsewaPayload({
    total_amount: amount.toFixed(2),
    transaction_uuid: transactionUuid,
    product_code: productCode,
  });

  res.json({
    product_code: productCode,
    total_amount: amount.toFixed(2),
    transaction_uuid: transactionUuid,
    signature,
  });
});

function isDemoEsewaPayload({ callbackPayload, esewaRefId }) {
  const hasSignature = Boolean(callbackPayload?.signature && callbackPayload?.signed_field_names);
  return !hasSignature || String(esewaRefId || "").startsWith("DEMO-");
}

router.post("/esewa/verify", auth, async (req, res) => {
  const callbackPayload = req.body.callback_payload || {};
  const callback = normalizeEsewaCallback({ ...req.body, ...callbackPayload });
  const campaignId = callback.campaign_id || parseInt(req.body.campaign_id || req.body.campaignId, 10);
  const amountNpr = parsePositiveAmount(callback.amount_npr || req.body.amount_npr);
  const esewaRefId = String(
    callback.esewa_ref_id || req.body.esewa_ref_id || generateEsewaRefId(campaignId || "campaign")
  ).trim();
  const transactionUuid = String(callback.transaction_uuid || req.body.transaction_uuid || "").trim() || null;
  const providedBlockchainRef = String(req.body.blockchain_ref || "").trim() || null;
  const providedDonorWallet = String(req.body.donor_wallet || "").trim() || "esewa";
  const normalizedMessage =
    typeof req.body.message === "string"
      ? req.body.message.trim() || null
      : callback.message;
  const productCode = String(callbackPayload.product_code || req.body.product_code || ESEWA_PRODUCT_CODE).trim();
  const solEquivalent = convertNprToSol(amountNpr);
  const isDemoPayload = isDemoEsewaPayload({ callbackPayload, esewaRefId });

  if (!campaignId || !amountNpr || !esewaRefId || !solEquivalent) {
    return res.status(400).json({
      message: "campaign_id, amount_npr, and esewa_ref_id required",
    });
  }

  if (!isDemoPayload && !verifyEsewaResponseSignature(callbackPayload)) {
    return res.status(400).json({
      message: "Invalid eSewa callback signature",
      on_chain_success: false,
    });
  }

  if (!isDemoPayload && transactionUuid) {
    try {
      const statusResult = await fetchEsewaTransactionStatus({
        product_code: productCode,
        total_amount: amountNpr.toFixed(2),
        transaction_uuid: transactionUuid,
      });

      if (statusResult.status !== "COMPLETE") {
        return res.status(400).json({
          message: `eSewa status check returned ${statusResult.status || "UNKNOWN"}`,
          on_chain_success: false,
        });
      }
    } catch (statusError) {
      return res.status(502).json({
        message: statusError.message,
        on_chain_success: false,
      });
    }
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[campaign]] = await conn.query(
      "SELECT id FROM campaigns WHERE id = ? AND is_active = 1",
      [campaignId]
    );
    if (!campaign) {
      await conn.rollback();
      return res.status(404).json({ message: "Campaign not found or inactive" });
    }

    const txSignature = transactionUuid || `ESEWA-${esewaRefId}`;
    const existingDonation = await findDonationByEsewaRef(esewaRefId, txSignature);

    if (existingDonation?.blockchain_ref) {
      await conn.rollback();
      return res.status(200).json({
        message: "eSewa donation already synchronized",
        donation: buildDonationResponse(existingDonation),
        campaign_update: {
          campaign_id: campaignId,
          raised_amount_increment_sol: 0,
        },
        on_chain_success: true,
      });
    }

    let blockchainRef = providedBlockchainRef;
    if (!blockchainRef) {
      const onChainResult = await recordEsewaOnChain({
        esewaRefId,
        amountNpr,
        campaignId,
        userId: req.user.id,
        transactionUuid,
      });
      blockchainRef = onChainResult?.signature || null;
    }
    if (!blockchainRef) {
      throw new Error("Failed to store eSewa transaction on Solana");
    }

    if (existingDonation) {
      const needsRaisedAmountUpdate = !existingDonation.blockchain_ref;

      await conn.query(
        `UPDATE donations
         SET amount_sol = ?,
             amount_npr = ?,
             blockchain_ref = ?,
             message = ?,
             donor_wallet = ?,
             payment_method = 'esewa'
         WHERE id = ?`,
        [
          solEquivalent,
          amountNpr,
          blockchainRef,
          normalizedMessage ?? existingDonation.message,
          providedDonorWallet,
          existingDonation.id,
        ]
      );

      if (needsRaisedAmountUpdate) {
        await conn.query(
          "UPDATE campaigns SET raised_amount = raised_amount + ? WHERE id = ?",
          [solEquivalent, campaignId]
        );
      }

      await conn.commit();

      const updatedDonation = await findDonationByEsewaRef(esewaRefId, txSignature);
      return res.status(200).json({
        message: "eSewa donation synchronized successfully",
        donation: buildDonationResponse(updatedDonation),
        campaign_update: {
          campaign_id: campaignId,
          raised_amount_increment_sol: needsRaisedAmountUpdate ? solEquivalent : 0,
        },
        on_chain_success: true,
      });
    }

    await conn.query(
       `INSERT INTO donations
         (campaign_id, donor_wallet, user_id, amount_sol, amount_npr, tx_signature,
          esewa_ref_id, blockchain_ref, message, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'esewa')`,
      [campaignId, providedDonorWallet, req.user.id, solEquivalent, amountNpr, txSignature,
        esewaRefId, blockchainRef, normalizedMessage]
    );

    await conn.query(
      "UPDATE campaigns SET raised_amount = raised_amount + ? WHERE id = ?",
      [solEquivalent, campaignId]
    );

    await conn.commit();

    const [[donation]] = await db.query(
      `SELECT id, campaign_id, donor_wallet, payment_method, amount_sol, amount_npr,
              tx_signature, blockchain_ref, esewa_ref_id, message, created_at
       FROM donations
       WHERE esewa_ref_id = ?`,
      [esewaRefId]
    );

    res.status(201).json({
      message: "eSewa donation recorded successfully",
      donation: buildDonationResponse(donation),
      campaign_update: {
        campaign_id: campaignId,
        raised_amount_increment_sol: solEquivalent,
      },
      on_chain_success: true,
    });
  } catch (err) {
    await conn.rollback();
    console.error("eSewa verify SQL error:", err.message);
    res.status(500).json({
      message: `Server error: ${err.message}`,
      on_chain_success: false,
    });
  } finally {
    conn.release();
  }
});

router.post("/", auth, async (req, res) => {
  const { campaign_id, tx_signature, donor_wallet } = req.body;
  const amountSol = parsePositiveAmount(req.body.amount_sol);
  const normalizedMessage =
    typeof req.body.message === "string" ? req.body.message.trim() || null : null;

  if (!campaign_id || !amountSol || !tx_signature || !donor_wallet) {
    return res.status(400).json({
      message: "campaign_id, amount_sol, tx_signature, donor_wallet required",
    });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[campaign]] = await conn.query(
      "SELECT id FROM campaigns WHERE id = ? AND is_active = 1",
      [campaign_id]
    );
    if (!campaign) {
      await conn.rollback();
      return res.status(404).json({ message: "Campaign not found" });
    }

    const [dup] = await conn.query(
      "SELECT id FROM donations WHERE tx_signature = ?",
      [tx_signature]
    );
    if (dup.length > 0) {
      await conn.rollback();
      return res.status(409).json({ message: "Transaction already recorded" });
    }

    await conn.query(
      `INSERT INTO donations
         (campaign_id, donor_wallet, user_id, amount_sol, tx_signature,
          blockchain_ref, message, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'sol')`,
      [campaign_id, donor_wallet, req.user.id, amountSol, tx_signature, tx_signature, normalizedMessage]
    );

    await conn.query(
      "UPDATE campaigns SET raised_amount = raised_amount + ? WHERE id = ?",
      [amountSol, campaign_id]
    );

    await conn.commit();

    const [[donation]] = await db.query(
      `SELECT id, campaign_id, donor_wallet, payment_method, amount_sol, amount_npr,
              tx_signature, blockchain_ref, esewa_ref_id, message, created_at
       FROM donations
       WHERE tx_signature = ?`,
      [tx_signature]
    );

    res.status(201).json({
      message: "Donation recorded",
      donation: buildDonationResponse(donation),
      campaign_update: {
        campaign_id,
        raised_amount_increment_sol: amountSol,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error("SOL donation error:", err.message);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
});

module.exports = router;
