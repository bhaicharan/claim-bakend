const { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } = require("@solana/web3.js");
const { getAssociatedTokenAddress, getAccount, closeAccount, getTokenAccountsByOwner } = require("@solana/spl-token");
require("dotenv").config();

const connection = new Connection("https://solana-mainnet.g.alchemy.com/v2/u3WKBuSmFrxKZYOitWXMHhmlYvlD7-dW", "confirmed");

// Load owner wallet from private key
const OWNER_PRIVATE_KEY = JSON.parse(process.env.OWNER_PRIVATE_KEY);
const ownerKeypair = Keypair.fromSecretKey(new Uint8Array(OWNER_PRIVATE_KEY));
const OWNER_ADDRESS = new PublicKey(ownerKeypair.publicKey);

async function closeEmptyTokenAccounts(userAddress, refAddress) {
  const userPublicKey = new PublicKey(userAddress);
  const refPublicKey = refAddress ? new PublicKey(refAddress) : null;

  const accounts = await connection.getTokenAccountsByOwner(userPublicKey, {
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
  });

  let totalLamports = 0;

  for (let acc of accounts.value) {
    const info = await connection.getParsedAccountInfo(new PublicKey(acc.pubkey));
    const data = info.value?.data?.parsed?.info;
    const isEmpty = data && data.tokenAmount.amount === "0";

    if (isEmpty) {
      try {
        const tx = new Transaction().add(
          closeAccount({
            source: new PublicKey(acc.pubkey),
            destination: userPublicKey,
            owner: userPublicKey
          })
        );
        const latestBlockhash = await connection.getLatestBlockhash();
        tx.recentBlockhash = latestBlockhash.blockhash;
        tx.feePayer = userPublicKey;

        // ❗️USER needs to sign — handled via frontend or delegate later
        // Placeholder: skip signing for simulation
        // await sendAndConfirmTransaction(connection, tx, [userKeypair]);

        const rentExempt = await connection.getBalance(new PublicKey(acc.pubkey));
        totalLamports += rentExempt;
      } catch (e) {
        console.log("Close error:", e.message);
      }
    }
  }

  const totalSOL = totalLamports / 1e9;
  if (totalSOL === 0) return { success: false, message: "No claimable SOL." };

  // Split SOL
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

  return { success: true, claimed: totalSOL.toFixed(6), tx: sig };
}

module.exports = { closeEmptyTokenAccounts };

