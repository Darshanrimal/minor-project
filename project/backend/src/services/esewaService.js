const crypto = require("crypto");

const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q";
const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || "EPAYTEST";
const ESEWA_UAT_STATUS_CHECK_URL =
  process.env.ESEWA_UAT_STATUS_CHECK_URL ||
  "https://uat.esewa.com.np/api/epay/transaction/status/";
const ESEWA_PRODUCTION_STATUS_CHECK_URL =
  process.env.ESEWA_PRODUCTION_STATUS_CHECK_URL ||
  "https://epay.esewa.com.np/api/epay/transaction/status/";
const DEFAULT_SOL_TO_NPR_RATE = 15000;

function parsePositiveAmount(value) {
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function getSolToNprRate() {
  const configuredRate = parsePositiveAmount(process.env.SOL_TO_NPR_RATE);
  return configuredRate || DEFAULT_SOL_TO_NPR_RATE;
}

function convertNprToSol(nprAmount) {
  const parsedNpr = parsePositiveAmount(nprAmount);
  if (!parsedNpr) {
    return null;
  }

  const rate = getSolToNprRate();
  const solEquivalent = parsedNpr / rate;
  return Number(solEquivalent.toFixed(9));
}

function signEsewaPayload({ total_amount, transaction_uuid, product_code }) {
  const message =
    `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;

  return crypto
    .createHmac("sha256", ESEWA_SECRET_KEY)
    .update(message)
    .digest("base64");
}


function verifyEsewaResponseSignature(payload = {}) {
  const signature = String(payload.signature || "").trim();
  const signedFieldNames = String(payload.signed_field_names || "").trim();

  if (!signature || !signedFieldNames) {
    return false;
  }

  const message = signedFieldNames
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean)
    .map((field) => `${field}=${payload[field] ?? ""}`)
    .join(",");

  const expected = crypto
    .createHmac("sha256", ESEWA_SECRET_KEY)
    .update(message)
    .digest("base64");

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch (_) {
    return false;
  }
}

function getEsewaStatusCheckUrl(productCode = ESEWA_PRODUCT_CODE) {
  return productCode === "EPAYTEST"
    ? ESEWA_UAT_STATUS_CHECK_URL
    : ESEWA_PRODUCTION_STATUS_CHECK_URL;
}

async function fetchEsewaTransactionStatus({ product_code, total_amount, transaction_uuid }) {
  const url = new URL(getEsewaStatusCheckUrl(product_code));
  url.searchParams.set("product_code", product_code);
  url.searchParams.set("total_amount", String(total_amount));
  url.searchParams.set("transaction_uuid", String(transaction_uuid));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`eSewa status check failed with HTTP ${response.status}`);
  }

  const data = await response.json();
  return {
    raw: data,
    status: String(data.status || "").trim().toUpperCase(),
    refId: String(data.refId || data.ref_id || "").trim() || null,
  };
}

function decodeEsewaData(encodedData) {
  if (!encodedData) {
    return {};
  }

  try {
    const decoded = Buffer.from(String(encodedData), "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch (_) {
    return {};
  }
}

function generateEsewaRefId(seed = "") {
  const safeSeed = String(seed || "txn")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(-24);
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `ESEWA-${timestamp}-${safeSeed || "txn"}-${random}`;
}

function normalizeEsewaCallback(input = {}) {
  const payload = decodeEsewaData(input.data);
  const query = { ...input };
  delete query.data;

  const merged = { ...query, ...payload };

  const amount =
    parsePositiveAmount(merged.total_amount) ||
    parsePositiveAmount(merged.amount) ||
    parsePositiveAmount(merged.totalAmount);

  const campaignId =
    parseInt(merged.campaign_id || merged.campaignId || merged.product_id, 10);

  const transactionUuid =
    String(
      merged.transaction_uuid ||
      merged.transactionUuid ||
      merged.transaction_code ||
      merged.transactionCode ||
      ""
    ).trim();

  const status = String(merged.status || merged.transaction_status || "").trim().toUpperCase();

  const refId = String(
    merged.refId ||
    merged.ref_id ||
    merged.reference_id ||
    merged.transaction_code ||
    transactionUuid ||
    ""
  ).trim();

  const message = typeof merged.message === "string" ? merged.message.trim() : "";

  return {
    raw: merged,
    status,
    amount_npr: amount,
    campaign_id: Number.isNaN(campaignId) ? null : campaignId,
    transaction_uuid: transactionUuid || null,
    esewa_ref_id: refId || generateEsewaRefId(transactionUuid || campaignId || "txn"),
    message: message || null,
  };
}

function isEsewaSuccessStatus(status) {
  return ["COMPLETE", "SUCCESS", "SUCCESSFUL"].includes(String(status || "").toUpperCase());
}

module.exports = {
  ESEWA_PRODUCT_CODE,
  convertNprToSol,
  generateEsewaRefId,
  getSolToNprRate,
  isEsewaSuccessStatus,
  normalizeEsewaCallback,
  parsePositiveAmount,
  signEsewaPayload,
  verifyEsewaResponseSignature,
  fetchEsewaTransactionStatus,
};
