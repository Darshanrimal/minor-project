require("dotenv").config();
const { Keypair } = require("@solana/web3.js");
const bs58Module = require("bs58");
const bs58 = bs58Module.default || bs58Module;

const keypair = Keypair.generate();

console.log("Treasury wallet generated.");
console.log("Public Key:");
console.log(keypair.publicKey.toBase58());
console.log("");
console.log("Add this to your backend .env:");
console.log(`TREASURY_PRIVATE_KEY=${bs58.encode(keypair.secretKey)}`);
