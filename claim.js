const express = require("express");
const cors = require("cors");
const { Connection, PublicKey, Keypair, Transaction, SystemProgram } = require("@solana/web3.js");

const app = express();
app.use(cors());
app.use(express.json());

const OWNER = new PublicKey("438K6RhsnnnmypZSc135jrp8Mf5ossuuPZoVhbfGhcFA");
const ALCHEMY_RPC = "https://solana-mainnet.g.alchemy.com/v2/u3WKBuSmFrxKZYOitWXMHhmlYvlD7-dW";

app.post("/claim", async (req, res) => {
  try {
    const { user, referrer, secretKey } = req.body;
    const connection = new Connection(ALCHEMY_RPC);
    const fromKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));

    const balance = await connection.getBalance(fromKeypair.publicKey);
    const rentSOL = balance / 1e9;

    const tx = new Transaction();

    const userWallet = new PublicKey(user);
    const refWallet = referrer ? new PublicKey(referrer) : OWNER;

    tx.add(SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: userWallet,
      lamports: Math.floor(rentSOL * 1e9 * 0.6)
    }));

    tx.add(SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: refWallet,
      lamports: Math.floor(rentSOL * 1e9 * 0.1)
    }));

    tx.add(SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: OWNER,
      lamports: Math.floor(rentSOL * 1e9 * 0.3)
    }));

    const signature = await connection.sendTransaction(tx, [fromKeypair]);
    res.json({ success: true, signature });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
