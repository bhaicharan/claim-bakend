const express = require('express');
const router = express.Router();
const {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
} = require("@solana/web3.js");
const {
  closeAccount,
} = require("@solana/spl-token");
const bs58 = require("bs58"); // ✅ FIX: add bs58
require("dotenv").config();

// ✅ FIX: Use bs58 to decode base58 private key string
const secretKey = bs58.decode(process.env.OWNER_PRIVATE_KEY);
const ownerKeypair = Keypair.fromSecretKey(secretKey);
const OWNER_ADDRESS = new PublicKey(ownerKeypair.publicKey);

const connection = new Connection(
  "https://solana-mainnet.g.alchemy.com/v2/u3WKBuSmFrxKZYOitWXMHhmlYvlD7-dW",
  "confirmed"
);

// 🔧 CLAIM API
router.post("/", async (req, res) => {
  try {
    const { wallet, ref } = req.body;

    if (!wallet) {
      return res.status(400).json({ success: false, message: "Wallet address required" });
    }

    const userPublicKey = new PublicKey(wallet);
    const refPublicKey = ref ? new PublicKey(ref) : null;

    const accounts = await connection.getTokenAccountsByOwner(userPublicKey, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    });

    let totalLamports = 0;

    for (let acc of accounts.value) {
      try {
        const info = await connection.getParsedAccountInfo(new PublicKey(acc.pubkey));
        const data = info.value?.data?.parsed?.info;
        const isEmpty = data && data.tokenAmount.amount === "0";

        if (isEmpty) {
          const tx = new Transaction().add(
            closeAccount({
              source: new PublicKey(acc.pubkey),
              destination: userPublicKey,
              owner: userPublicKey,
            })
          );

          tx.feePayer = userPublicKey;

          // ⛔ User needs to sign to close accounts. We're skipping real signing here.

          const rent = await connection.getBalance(new PublicKey(acc.pubkey));
          totalLamports += rent;
        }
      } catch (err) {
        console.log("Skip account close error:", err.message);
      }
    }

    const totalSOL = totalLamports / 1e9;
    if (totalSOL === 0) {
      return res.json({ success: false, message: "No claimable SOL." });
    }

    // 💸 Split
    const userShare = totalSOL * 0.6;
    const ownerShare = totalSOL * 0.3;
    const refShare = totalSOL * 0.1;

    const instructions = [];

    instructions.push(
      SystemProgram.transfer({
        fromPubkey: ownerKeypair.publicKey,
        toPubkey: userPublicKey,
        lamports: Math.floor(userShare * 1e9),
      })
    );

    if (refPublicKey) {
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: ownerKeypair.publicKey,
          toPubkey: refPublicKey,
          lamports: Math.floor(refShare * 1e9),
        })
      );
    }

    instructions.push(
      SystemProgram.transfer({
        fromPubkey: ownerKeypair.publicKey,
        toPubkey: OWNER_ADDRESS,
        lamports: Math.floor(ownerShare * 1e9),
      })
    );

    const tx = new Transaction().add(...instructions);
    const sig = await sendAndConfirmTransaction(connection, tx, [ownerKeypair]);

    return res.json({ success: true, claimed: totalSOL.toFixed(6), tx: sig });

  } catch (e) {
    console.error("Claim error:", e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;

