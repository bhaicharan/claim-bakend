const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
} = require("@solana/web3.js");
const {
  getAssociatedTokenAddress,
  getAccount,
  closeAccount,
} = require("@solana/spl-token");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const OWNER_WALLET = new PublicKey("H23Sz2hX5Cw16TCvRHmVJk12ecw1WnDeN3iXVyXQ2Yvy");
const PRIVATE_KEY = Uint8Array.from([
  // 👇 Replace with your actual private key array here
  // Example: 45, 123, 210, ..., 99
]);

const feePayer = Keypair.fromSecretKey(PRIVATE_KEY);
const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

async function getEmptyTokenAccounts(publicKey) {
  const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
    programId: new PublicKey("J8oVF5Np1HoaHvJ3H8i7Cd2R2Jt6BFRSiqfWpHFXZXDighxTwjcepLJsrTuwydJRM23paFHGS3xDNb6B3LUtxd3"),
  });

  return accounts.value.filter((acc) => {
    const amount = acc.account.data.parsed.info.tokenAmount;
    return amount.uiAmount === 0 && !amount.isNative;
  });
}

async function closeAccountsAndDistribute(userAddress, refAddress) {
  const userPublicKey = new PublicKey(userAddress);
  const refPublicKey = refAddress ? new PublicKey(refAddress) : null;

  const emptyAccounts = await getEmptyTokenAccounts(userPublicKey);
  if (emptyAccounts.length === 0) return { amount: 0 };

  let totalLamports = 0;

  for (const acc of emptyAccounts) {
    const tokenAccount = acc.pubkey;
    const accountInfo = await getAccount(connection, tokenAccount);

    const tx = new Transaction().add(
      closeAccount({
        source: tokenAccount,
        destination: feePayer.publicKey,
        owner: userPublicKey,
      })
    );

    try {
      await sendAndConfirmTransaction(connection, tx, [feePayer], {
        skipPreflight: true,
      });

      totalLamports += accountInfo.lamports;
    } catch (e) {
      console.error(`Error closing account ${tokenAccount.toBase58()}:`, e.message);
    }
  }

  const amountSOL = totalLamports / 1e9;
  const userShare = amountSOL * 0.6;
  const ownerShare = amountSOL * 0.3;
  const refShare = refPublicKey ? amountSOL * 0.1 : 0;

  const tx = new Transaction();

  if (userShare > 0.0001) {
    tx.add(
      SystemProgram.transfer({
        fromPubkey: feePayer.publicKey,
        toPubkey: userPublicKey,
        lamports: Math.floor(userShare * 1e9),
      })
    );
  }

  if (ownerShare > 0.0001) {
    tx.add(
      SystemProgram.transfer({
        fromPubkey: feePayer.publicKey,
        toPubkey: OWNER_WALLET,
        lamports: Math.floor(ownerShare * 1e9),
      })
    );
  }

  if (refShare > 0.0001 && refPublicKey) {
    tx.add(
      SystemProgram.transfer({
        fromPubkey: feePayer.publicKey,
        toPubkey: refPublicKey,
        lamports: Math.floor(refShare * 1e9),
      })
    );
  }

  if (tx.instructions.length > 0) {
    await sendAndConfirmTransaction(connection, tx, [feePayer]);
  }

  return { amount: amountSOL.toFixed(6), accountsClosed: emptyAccounts.length };
}

// ✅ API Endpoint: POST /claim
app.post("/claim", async (req, res) => {
  const { user, ref } = req.body;
  if (!user) {
    return res.status(400).json({ success: false, error: "Missing user address" });
  }

  try {
    const result = await closeAccountsAndDistribute(user, ref);
    res.json({
      success: true,
      message: "Claim successful",
      ...result,
    });
  } catch (err) {
    console.error("Claim error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Claim API running on port ${PORT}`);
});
