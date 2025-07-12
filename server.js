require("dotenv").config();
const bs58 = require("bs58");
const { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction, SystemProgram } = require("@solana/web3.js");

const connection = new Connection("https://solana-mainnet.g.alchemy.com/v2/u3WKBuSmFrxKZYOitWXMHhmlYvlD7-dW", "confirmed");

// ✅ Decode Base58 Private Key
const secretKey = bs58.decode(process.env.OWNER_PRIVATE_KEY);
const ownerKeypair = Keypair.fromSecretKey(secretKey);
const OWNER_ADDRESS = ownerKeypair.publicKey;
