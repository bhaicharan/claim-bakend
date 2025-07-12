// server.js require("dotenv").config(); const express = require("express"); const bodyParser = require("body-parser"); const { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } = require("@solana/web3.js");

const app = express(); const PORT = process.env.PORT || 3000; const OWNER_WALLET = "H23Sz2hX5Cw16TCvRHmVJk12ecw1WnDeN3iXVyXQ2Yvy"; const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

app.use(bodyParser.json());

// Owner key from .env file const secretKey = Uint8Array.from(JSON.parse(process.env.OWNER_PRIVATE_KEY)); const owner = Keypair.fromSecretKey(secretKey); const connection = new Connection(SOLANA_RPC);

app.post("/claim", async (req, res) => { const { user, ref } = req.body;

try { const userPubkey = new PublicKey(user); const referrerPubkey = ref ? new PublicKey(ref) : null; const ownerPubkey = new PublicKey(OWNER_WALLET);

// Example: Simulate 0.01 SOL recovered from token accounts
const recoveredLamports = 10000000; // 0.01 SOL
const userAmount = Math.floor(recoveredLamports * 0.6);
const refAmount = Math.floor(recoveredLamports * 0.1);
const ownerAmount = recoveredLamports - userAmount - refAmount;

const instructions = [];
instructions.push(SystemProgram.transfer({ fromPubkey: owner.publicKey, toPubkey: userPubkey, lamports: userAmount }));
if (referrerPubkey) {
  instructions.push(SystemProgram.transfer({ fromPubkey: owner.publicKey, toPubkey: referrerPubkey, lamports: refAmount }));
}
instructions.push(SystemProgram.transfer({ fromPubkey: owner.publicKey, toPubkey: ownerPubkey, lamports: ownerAmount }));

const transaction = new Transaction().add(...instructions);
const signature = await sendAndConfirmTransaction(connection, transaction, [owner]);

res.json({ success: true, signature, claimed: recoveredLamports / 1e9 });

} catch (err) { console.error("Claim Error:", err); res.json({ success: false, message: err.message }); } });

app.listen(PORT, () => { console.log(✅ Server is running on port ${PORT}); });

