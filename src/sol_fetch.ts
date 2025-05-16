
import * as web3 from "@solana/web3.js";
import bs58 from "bs58"; // To decode the private key

// Amount to send (in SOL)
const solAmount = 0.01; // Sending 0.01 SOL
const lamports = solAmount * web3.LAMPORTS_PER_SOL; // Convert SOL to lamports
// Connect to Solana Devnet using Helius RPC
const connection = new web3.Connection(
  "https://devnet.helius-rpc.com/?api-key=39dd186b-8a8b-412f-8ed9-db96c52d1196",
  "confirmed",
);

// Private key as base58 encoded string (Replace this with your actual private key)
const secretKeyBase58 =
  "675BoYSggKjqXrVLwWRGRs7qrGvAiuZ2LWvcXqFndYWwTsFCHqFLzAnGHdqLYX3EeaM7KaECqBzvrs7mswbdQNGj";

// Decode the private key and create a Keypair
const fromKeypair = web3.Keypair.fromSecretKey(bs58.decode(secretKeyBase58));

console.log("From Address:", fromKeypair.publicKey.toString());

// Define the recipient's address
const toPublicKey = new web3.PublicKey(
  "CPHfAW51cDqE7VkLa7wtJb4C4b1VepAGJZpyf9DXk4cw",
);
console.log("To Address:", toPublicKey.toString());

/**
 * Sends SOL to a specified address with a memo
 * @param fromKeypair - The sender's keypair
 * @param toPublicKey - The recipient's public key
 * @param solAmount - Amount of SOL to send
 * @param memo - Memo text to include in the transaction
 * @returns Transaction signature
 */
export async function sendSolWithMemo(
  fromKeypair: web3.Keypair,
  toPublicKey: web3.PublicKey,
  solAmount: number,
  memo: string
): Promise<string> {
  try {
    // Convert SOL to lamports
    const lamports = solAmount * web3.LAMPORTS_PER_SOL;
    
    // Create transaction with transfer instruction
    const transaction = new web3.Transaction().add(
      web3.SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports: lamports,
      }),
    );
    
    // Add memo instruction to the transaction
    transaction.add(
      new web3.TransactionInstruction({
        keys: [
          { pubkey: fromKeypair.publicKey, isSigner: true, isWritable: true },
        ],
        programId: new web3.PublicKey(
          "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
        ),
        data: Buffer.from(memo, "utf-8"),
      }),
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromKeypair.publicKey;

    // Sign the transaction
    transaction.sign(fromKeypair);

    // Send transaction
    const signature = await web3.sendAndConfirmTransaction(
      connection,
      transaction,
      [fromKeypair],
    );

    console.log("Transaction Successful! SIGNATURE:", signature);
    return signature;
  } catch (error) {
    console.error("Transaction Failed:", error);
    throw error;
  }
}

// Example usage
(async () => {
  try {
    await sendSolWithMemo(
      fromKeypair,
      toPublicKey,
      0.01,
      "Sajan in the house"
    );
  } catch (error) {
    console.error("Failed to send SOL:", error);
  }
})();

// Function to fetch Solana signatures
export async function fetchSolSignatures(publicKey= toPublicKey , limit = 10) {
  try {
    const signatures = await connection.getSignaturesForAddress(
      publicKey,
      {
        limit: limit,
      },
    );
    console.log("Signatures:", signatures);
    return signatures;
  } catch (error) {
    console.error("Error fetching signatures:", error);
    throw error;
  }
}

// // Example usage
// (async () => {
//   try {
//     await fetchSolSignatures(fromKeypair.publicKey);
//   } catch (error) {
//     console.error("Failed to fetch signatures:", error);
//   }
// })();
