const fs = require("fs");
const path = require("path");
const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} = require("@solana/web3.js");

const NETWORK = process.env.SOLANA_NETWORK || "devnet";
const RPC_URL =
  process.env.SOLANA_RPC_URL ||
  (NETWORK === "mainnet-beta"
    ? "https://api.mainnet-beta.solana.com"
    : "https://api.devnet.solana.com");
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const MIN_FEE_BALANCE_LAMPORTS = 100000;
const TREASURY_FILE = process.env.TREASURY_KEYPAIR_PATH || path.resolve(__dirname, "../../platform-wallet.json");

let treasuryKeypair = null;
const bs58Module = require("bs58");
const bs58 = bs58Module.default || bs58Module;

function loadTreasuryFromEnv(raw) {
  if (!raw) {
    return null;
  }

  try {
    const secret = bs58.decode(raw);
    return Keypair.fromSecretKey(secret);
  } catch (error) {
    console.warn("Invalid TREASURY_PRIVATE_KEY, checking platform-wallet.json next");
    return null;
  }
}

function loadTreasuryFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!Array.isArray(parsed) || parsed.length !== 64) {
      throw new Error("Expected a 64-byte secret key array");
    }
    return Keypair.fromSecretKey(Uint8Array.from(parsed));
  } catch (error) {
    console.warn(`Invalid treasury keypair file at ${filePath}: ${error.message}`);
    return null;
  }
}

function getTreasury() {
  if (treasuryKeypair) {
    return treasuryKeypair;
  }

  const fromEnv = loadTreasuryFromEnv(process.env.TREASURY_PRIVATE_KEY);
  if (fromEnv) {
    treasuryKeypair = fromEnv;
    console.log("Treasury wallet loaded from TREASURY_PRIVATE_KEY:", treasuryKeypair.publicKey.toBase58());
    return treasuryKeypair;
  }

  const fromFile = loadTreasuryFromFile(TREASURY_FILE);
  if (fromFile) {
    treasuryKeypair = fromFile;
    console.log("Treasury wallet loaded from platform-wallet.json:", treasuryKeypair.publicKey.toBase58());
    return treasuryKeypair;
  }

  treasuryKeypair = Keypair.generate();
  console.warn("No persistent treasury wallet configured. Generated a temporary dev wallet:", treasuryKeypair.publicKey.toBase58());
  return treasuryKeypair;
}

async function ensureTreasuryHasFees(connection, treasury) {
  const balance = await connection.getBalance(treasury.publicKey, "confirmed");
  if (balance >= MIN_FEE_BALANCE_LAMPORTS) {
    return balance;
  }

  if (!["devnet", "testnet"].includes(NETWORK)) {
    throw new Error("Treasury wallet needs SOL for memo transaction fees");
  }

  console.log("Airdropping SOL to treasury for eSewa memo fees...");
  try {
    const airdropSignature = await connection.requestAirdrop(
      treasury.publicKey,
      0.25 * LAMPORTS_PER_SOL
    );
    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction(
      {
        signature: airdropSignature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      "confirmed"
    );
  } catch (error) {
    throw new Error(
      `Treasury wallet ${treasury.publicKey.toBase58()} has no SOL and devnet airdrop failed. Fund this wallet manually and retry.`
    );
  }

  const updatedBalance = await connection.getBalance(treasury.publicKey, "confirmed");
  if (updatedBalance < MIN_FEE_BALANCE_LAMPORTS) {
    throw new Error("Airdrop completed but treasury balance is still too low");
  }

  return updatedBalance;
}

function buildEsewaMemo({ esewaRefId, amountNpr, campaignId, userId, transactionUuid }) {
  return JSON.stringify({
    type: "esewa_donation",
    ref: esewaRefId,
    amount_npr: amountNpr,
    campaign_id: campaignId,
    user_id: userId,
    transaction_uuid: transactionUuid || null,
    ts: new Date().toISOString(),
  });
}

async function recordEsewaOnChain({
  esewaRefId,
  amountNpr,
  campaignId,
  userId,
  transactionUuid,
}) {
  const connection = new Connection(RPC_URL, "confirmed");
  const treasury = getTreasury();
  const memo = buildEsewaMemo({
    esewaRefId,
    amountNpr,
    campaignId,
    userId,
    transactionUuid,
  });

  await ensureTreasuryHasFees(connection, treasury);

  const transaction = new Transaction().add(
    new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memo, "utf8"),
    })
  );

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [treasury], {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });

    console.log("eSewa on-chain record:", signature);
    return { signature, memo, treasury: treasury.publicKey.toBase58() };
  } catch (error) {
    console.error("recordEsewaOnChain error:", error.message);
    throw new Error(`Failed to write eSewa reference on Solana: ${error.message}`);
  }
}

module.exports = { recordEsewaOnChain, getTreasury, RPC_URL, TREASURY_FILE };
