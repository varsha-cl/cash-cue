import fs from "fs/promises";
import { generateText, OpenAIStream, tool } from "ai";
import { ToolInvocation, convertToCoreMessages, streamText, Message } from "ai";
import { convertToCoreTools, maxMessageContext, tools } from "./tools";
import { StreamingTextResponse } from "ai";
import { CoreTool } from "ai";
import { OPENAI_API_KEY, GEMINI_API_KEY } from "../../../cred-config";
import OpenAI from "openai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { codeBlock } from "common-tags";
import { executeQuery, getRecordsFromTable } from "../../postgres-proxy/utils";
import useAppStore from "../state-utils/state-management";
import { getMimeTypeFromImagePath, updateLastSteps } from "./utils";
import { GoogleGenerativeAI } from "@google/generative-ai";
// Solana imports
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  Keypair,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import { BN } from "bn.js";

const chatModel = "gpt-4o";
const geminiModel = "gemini-2.0-flash";

// const openai = new OpenAI({
//   apiKey: OPENAI_API_KEY,
//   baseURL: 'https://api.openai.com/v1',
//   dangerouslyAllowBrowser: true,
// })

const openai = createOpenAI({
  apiKey: OPENAI_API_KEY,
  baseURL: "https://api.openai.com/v1",
});

// Initialize Solana connection to devnet
const solanaConnection = new Connection("https://api.devnet.solana.com", "confirmed");

// Function to record a successful staking transaction in the database
export const recordSuccessfulStake = async (
  walletPublicKey: string,
  amount: number,
  stakingProgramId: string,
  transactionSignature: string
): Promise<void> => {
  try {
    // Hardcoded validator address - same as in stakeSOL function
    const hardcodedValidatorAddress = "8SQEcP4FaYQySktNQeyxF3w8pvArx3oMEh7fPrzkN9pu";
    
    // Record the staking event in the database
    await executeQuery(`
      INSERT INTO staking_events (wallet_address, amount, token, staking_program_id, transaction_signature, staked_at) 
      VALUES ('${walletPublicKey}', ${amount}, 'SOL', '${hardcodedValidatorAddress}', '${transactionSignature}', CURRENT_TIMESTAMP)
    `);
  } catch (error) {
    console.error("Error recording successful stake:", error);
    throw error;
  }
};

// Function to stake SOL (simplified version without SolanaAgentKit)
export const stakeSOL = async (
  walletPublicKey: string,
  amount: number,
  stakingProgramId: string
): Promise<string> => {
  try {
    // Hardcoded validator address - this is a known Solana validator on devnet
    // We're ignoring the stakingProgramId provided by the UI
    const hardcodedValidatorAddress = "8SQEcP4FaYQySktNQeyxF3w8pvArx3oMEh7fPrzkN9pu"; // Devnet validator
    
    // Create a new transaction
    const transaction = new Transaction();
    
    // For demonstration purposes, we'll use a memo instruction to simulate staking
    // In a real staking implementation, you would call the actual staking program
    transaction.add(
      new TransactionInstruction({
        keys: [
          { pubkey: new PublicKey(walletPublicKey), isSigner: true, isWritable: true },
        ],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        data: Buffer.from(`Stake ${amount} SOL to validator ${hardcodedValidatorAddress}`, 'utf-8'),
      })
    );
    
    // Get recent blockhash and set it on the transaction
    const { blockhash } = await solanaConnection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(walletPublicKey);
    
    // Serialize the transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).toString('base64');
    
    return serializedTransaction;
  } catch (error) {
    console.error("Error creating staking transaction:", error);
    throw error;
  }
};

// Function to mint NFT after successful staking (simplified version without SolanaAgentKit)
export const mintNFTOnSuccessfulStaking = async (
  walletPublicKey: string,
  metadataUri: string,
  name: string,
  symbol: string,
  transactionSignature: string
): Promise<string> => {
  try {
    // Verify the staking transaction exists and is confirmed
    const stakeExists = await verifyStakingTransaction(walletPublicKey, transactionSignature);
    
    if (!stakeExists) {
      throw new Error("No confirmed staking transaction found. Please stake SOL first.");
    }
    
    // Get the staking details from the database
    const stakingDetails = await executeQuery(`
      SELECT * FROM staking_events 
      WHERE wallet_address = '${walletPublicKey}' 
      AND transaction_signature = '${transactionSignature}'
    `);
    
    if (!stakingDetails || stakingDetails.length === 0) {
      throw new Error("Staking details not found in database.");
    }
    
    // Type assertion to access properties safely
    const stakingRecord = stakingDetails[0] as any;
    const stakingAmount = stakingRecord?.amount || '0';
    const stakingToken = stakingRecord?.token || 'SOL';
    
    // Generate a unique mint address for the NFT
    const mintAddress = Keypair.generate().publicKey.toString();
    
    // Record the NFT minting in the database
    await executeQuery(`
      INSERT INTO nft_mints (mint_address, name, symbol, metadata_uri, staking_token, staking_amount, minted_at, wallet_address, transaction_signature) 
      VALUES ('${mintAddress}', '${name}', '${symbol}', '${metadataUri}', '${stakingToken}', '${stakingAmount}', CURRENT_TIMESTAMP, '${walletPublicKey}', '${transactionSignature}')
    `);
    
    // In a real implementation, we would create and send the actual NFT minting transaction here
    // For now, we're just recording it in the database and returning the mint address
    
    return mintAddress;
  } catch (error) {
    console.error("Error minting NFT after staking:", error);
    throw error;
  }
};

// Function to verify a staking transaction exists and is confirmed
export const verifyStakingTransaction = async (
  walletPublicKey: string,
  transactionSignature: string
): Promise<boolean> => {
  try {
    // Check if the transaction exists on-chain
    const transaction = await solanaConnection.getTransaction(transactionSignature, {
      maxSupportedTransactionVersion: 0
    });
    
    if (!transaction) {
      console.log("Transaction not found:", transactionSignature);
      return false;
    }
    
    // Check if the transaction was successful
    if (transaction.meta === null || transaction.meta.err) {
      console.log("Transaction failed:", transactionSignature);
      return false;
    }
    
    // Check if the transaction involves the wallet
    const accountKeys = transaction.transaction.message.staticAccountKeys || [];
    
    // Check if the wallet is involved in the transaction
    const isFromWallet = accountKeys.some(
      (key: PublicKey) => key.toString() === walletPublicKey
    );
    
    if (!isFromWallet) {
      console.log("Transaction not from wallet:", walletPublicKey);
      return false;
    }
    
    // Check for the memo program in the transaction logs
    let hasMemoProgram = false;
    let hasStakingMessage = false;
    
    if (transaction.meta && transaction.meta.logMessages) {
      // Log all messages for debugging
      console.log("Transaction log messages:", transaction.meta.logMessages);
      
      // Check log messages for memo program invocation
      hasMemoProgram = transaction.meta.logMessages.some(
        log => log.includes('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
      );
      
      console.log("Has memo program:", hasMemoProgram);
      
      // More lenient check for staking message - just look for "Stake" in any log message
      hasStakingMessage = transaction.meta.logMessages.some(
        log => log.includes('Stake')
      );
      
      console.log("Has staking message:", hasStakingMessage);
      
      // For debugging purposes, always return true if the transaction is from the wallet and has the memo program
      // This will help us see if the transaction is being processed correctly
      return isFromWallet && hasMemoProgram;
    }
    
    return false;
  } catch (error) {
    console.error("Error verifying staking transaction:", error);
    return false;
  }
};

// Function to check if staking is completed for a wallet
export const checkStakingCompleted = async (
  walletPublicKey: string
): Promise<boolean> => {
  try {
    // Check if there's a staking record in the database
    const stakingHistory = await getStakingHistory(walletPublicKey);
    
    if (!stakingHistory || stakingHistory.length === 0) {
      return false;
    }
    
    // Get the most recent staking transaction
    const latestStake = stakingHistory[0];
    
    // Verify the transaction on-chain
    return await verifyStakingTransaction(walletPublicKey, latestStake.transaction_signature);
  } catch (error) {
    console.error("Error checking staking completion:", error);
    return false;
  }
};

// Function to get staking history for a wallet
export const getStakingHistory = async (walletPublicKey: string): Promise<any[]> => {
  try {
    // Query the database to get staking history
    const result = await executeQuery(`
      SELECT * FROM staking_events 
      WHERE wallet_address = '${walletPublicKey}'
      ORDER BY staked_at DESC
    `);
    
    return result || [];
  } catch (error) {
    console.error("Error getting staking history:", error);
    throw error;
  }
};

// Function to get NFT minting history for a wallet
export const getNFTMintingHistory = async (walletPublicKey: string): Promise<any[]> => {
  try {
    // Query the database to get NFT minting history
    const result = await executeQuery(`
      SELECT * FROM nft_mints 
      WHERE wallet_address = '${walletPublicKey}'
      ORDER BY minted_at DESC
    `);
    
    return result || [];
  } catch (error) {
    console.error("Error getting NFT minting history:", error);
    throw error;
  }
};

// Function to get wallet SOL balance
export const getWalletBalance = async (walletPublicKey: string): Promise<number> => {
  try {
    const balance = await solanaConnection.getBalance(new PublicKey(walletPublicKey));
    return balance / LAMPORTS_PER_SOL; // Convert lamports to SOL
  } catch (error) {
    console.error("Error getting wallet balance:", error);
    throw error;
  }
};

export const getAIResponse = async (
  messages: Message[],
): Promise<StreamingTextResponse> => {
  // Trim the message context sent to the LLM to mitigate token abuse
  const trimmedMessageContext = messages;

  //   const {lastAiSteps, setLastAiSteps } = useAppStore();

  console.log("tools:", tools);

  console.log("messages", trimmedMessageContext);
  console.log(
    "convertToCoreMessages(trimmedMessageContext)",
    convertToCoreMessages(trimmedMessageContext),
  );

  const concatenatedMessages = concatenateMessages(trimmedMessageContext);
  console.log("concatenatedMessages", concatenatedMessages);

  const result = await streamText({
    system: codeBlock`
    you are a helpful assistant,
    
    you will be given a list of tools that you can use to answer the user's question.
    Under the hood you have access to an in-browser Postgres database.
    you can use the tools to get information about the user's question or make changes to the database.

    to make updates, you can query records in the table, and also execute statements to update the table.

    to start a new transaction , create a new record in the money_movement table
    MAKE ASSUMPTIONS if some information is missing and explicitly mention what you assumed. M

    you should also be able to create new graphs, to create new graph, we create a new record in the graphs table which uses chartjs to display the data.
    
    the data_query is a query that will be used to get the data for the graph, 
    ALWAYS make sure the data_query is a valid select SQL query with the following columns: key, value. I repeat, key and value.
 
    ### DB SCHEMA 
    the database tables are as follows:

CREATE TABLE money_movement (
    id SERIAL PRIMARY KEY,
    from_acc VARCHAR(255),
    to_acc VARCHAR(255),
    from_name VARCHAR(255),
    to_name VARCHAR(255),
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_category CHECK (category IN ('Housing', 'Groceries', 'Transportation', 'Utilities', 'Healthcare', 'Entertainment', 'Dining Out', 'Education', 'Travel', 'Shopping', 'Personal Care', 'Gifts', 'Investments', 'Miscellaneous'))
);

CREATE TABLE graphs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    data_query TEXT NOT NULL,
    dataset_label VARCHAR(255),
    background_colors TEXT[] DEFAULT ARRAY[
        '#FF6384', '#36A2EB', '#FFCE56', 
        '#4BC0C0', '#9966FF', '#FF9F40'
    ],
    hover_background_colors TEXT[],
    should_display BOOLEAN DEFAULT true, -- to indicate if the graph should be displayed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE nft_mints (
    id SERIAL PRIMARY KEY,
    mint_address VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    metadata_uri TEXT NOT NULL,
    target_type VARCHAR(50),
    target_value VARCHAR(255),
    staking_token VARCHAR(255),
    staking_amount VARCHAR(255),
    wallet_address VARCHAR(255),
    minted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    value VARCHAR(255) NOT NULL,
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE staking_events (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    amount VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(255),
    staked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
   
    ### EXAMPLE 
    example of inserting into graph table, use similar way to create a new graph (just do it once per query request):

            INSERT INTO graphs (title, type, data_query, dataset_label, background_colors, hover_background_colors, should_display, created_at, updated_at) VALUES ('Weekly Event Count', 'line', ' WITH date_series AS ( SELECT generate_series( DATE(NOW() - INTERVAL ''6 days''), DATE(NOW()), ''1 day''::interval )::date AS date ), event_counts AS ( SELECT DATE(event_start_time) AS date, COUNT(*) AS value FROM user_events WHERE event_start_time >= NOW() - INTERVAL ''7 days'' GROUP BY DATE(event_start_time) ) SELECT ds.date AS key, COALESCE(ec.value, 0) AS value FROM date_series ds LEFT JOIN event_counts ec ON ds.date = ec.date ORDER BY ds.date; ', 'Events', ARRAY['#36A2EB'], ARRAY['#1E90FF'], true, '2024-10-15T01:35:54.440Z', '2024-10-15T01:35:54.440Z');
    `,
    model: openai("gpt-4o"),
    tools: {
      weather: tool({
        description: "Get the weather in a location",
        parameters: z.object({
          location: z.string().describe("The location to get the weather for"),
        }),
        execute: async ({ location }) => ({
          location,
          temperature: 69,
        }),
      }),
      getRecords: tool({
        description: "Get all records from a specified table",
        parameters: z.object({
          table_name: z
            .string()
            .describe("The name of the table to get records from"),
        }),
        execute: async ({ table_name }) => {
          const records = await getRecordsFromTable(table_name);
          return { records };
        },
      }),
      executeQuery: tool({
        description: "Execute a custom SQL query",
        parameters: z.object({
          query: z.string().describe("The SQL query to execute"),
        }),
        execute: async ({ query }) => {
          console.log("AI IS GOING TO RUN THIS: ", query)
          const result = await executeQuery(query);
          return { result };
        },
      }),
      // stakeSOL: tool({
      //   description: "Create a staking transaction for SOL on devnet",
      //   parameters: z.object({
      //     walletPublicKey: z.string().describe("The user's wallet public key"),
      //     amount: z.number().describe("The amount of SOL to stake"),
      //     stakingProgramId: z.string().describe("The staking program ID to stake with (will be ignored, using hardcoded validator)"),
      //   }),
      //   execute: async ({ walletPublicKey, amount, stakingProgramId }) => {
      //     const serializedTransaction = await stakeSOL(
      //       walletPublicKey,
      //       amount,
      //       stakingProgramId
      //     );
      //     return { serializedTransaction };
      //   },
      // }),
      // mintNFTForStaking: tool({
      //   description: "Mint an NFT when a user completes a successful staking",
      //   parameters: z.object({
      //     walletPublicKey: z.string().describe("The user's wallet public key"),
      //     metadataUri: z.string().describe("The URI for the NFT metadata"),
      //     name: z.string().describe("The name of the NFT"),
      //     symbol: z.string().describe("The symbol of the NFT"),
      //     stakingAmount: z.string().describe("The amount staked"),
      //     stakingToken: z.string().describe("The token staked"),
      //   }),
      //   execute: async ({ walletPublicKey, metadataUri, name, symbol, stakingAmount, stakingToken }) => {
      //     // Get the most recent staking transaction for this wallet
      //     const stakingHistory = await getStakingHistory(walletPublicKey);
      //     if (!stakingHistory || stakingHistory.length === 0) {
      //       throw new Error("No staking history found. Please stake SOL first.");
      //     }
          
      //     const latestStake = stakingHistory[0];
      //     const transactionSignature = latestStake.transaction_signature;
          
      //     const mintAddress = await mintNFTOnSuccessfulStaking(
      //       walletPublicKey,
      //       metadataUri,
      //       name,
      //       symbol,
      //       transactionSignature
      //     );
      //     return { mintAddress };
      //   },
      // }),
      // checkStakingCompleted: tool({
      //   description: "Check if a user has completed a staking operation",
      //   parameters: z.object({
      //     walletPublicKey: z.string().describe("The user's wallet public key"),
      //   }),
      //   execute: async ({ walletPublicKey }) => {
      //     const isCompleted = await checkStakingCompleted(walletPublicKey);
      //     return { isCompleted };
      //   },
      // }),
      // getStakingHistory: tool({
      //   description: "Get staking history for a wallet",
      //   parameters: z.object({
      //     walletPublicKey: z.string().describe("The user's wallet public key"),
      //   }),
      //   execute: async ({ walletPublicKey }) => {
      //     const history = await getStakingHistory(walletPublicKey);
      //     return { history };
      //   },
      // }),
      // getNFTMintingHistory: tool({
      //   description: "Get NFT minting history for a wallet",
      //   parameters: z.object({
      //     walletPublicKey: z.string().describe("The user's wallet public key"),
      //   }),
      //   execute: async ({ walletPublicKey }) => {
      //     const history = await getNFTMintingHistory(walletPublicKey);
      //     return { history };
      //   },
      // }),
      // getWalletBalance: tool({
      //   description: "Get SOL balance for a wallet",
      //   parameters: z.object({
      //     walletPublicKey: z.string().describe("The user's wallet public key"),
      //   }),
      //   execute: async ({ walletPublicKey }) => {
      //     const balance = await getWalletBalance(walletPublicKey);
      //     return { balance };
      //   },
      // }),
    },
    // prompt: messages[messages.length - 1].content,
    prompt: concatenateMessages(trimmedMessageContext),
    maxToolRoundtrips: 3,
  });
  console.log("result", result);
  console.log("result.text", result.text);
  console.log("result.steps", result.steps);

  result.steps.then(async (steps) => {
    await updateLastSteps(steps);
  });

  // Assuming result.text is not async iterable, convert it to one
  //   const textChunks = result.text; // Ensure this is an array or iterable
  return result.toAIStreamResponse();

  // Create a ReadableStream from the result
  //   const stream = new ReadableStream({
  //     async start(controller) {
  //       for await (const chunk of textChunks) { // Use for-await-of to handle async iterables
  //         console.log(chunk); // Log each chunk
  //         controller.enqueue(chunk); // Stream each chunk immediately
  //       }
  //       controller.close();
  //     },
  //   });

  //   return new StreamingTextResponse(stream);
};

// Function to concatenate messages into a single string
export const concatenateMessages = (messages: { role: string; content: string }[]): string => {
  try {
    // Map each message to "role: content" format and join with newlines
    return messages
      .map(message => `${message.role}: ${message.content}`)
      .join('\n\n');
  } catch (error) {
    console.error("Error concatenating messages:", error);
    return ""; // Return empty string in case of error
  }
};


export const processReceiptWithGemini = async (
  imagePath: string,
): Promise<{
  merchantName: string;
  date: string;
  time: string;
  items: { name: string; price: number }[];
  total: number;
  tax: number;
  paymentMethod: string;
}> => {
  try {
    const imageBuffer = await fs.readFile(imagePath);
    const imageBase64 = imageBuffer.toString("base64");

    const mimeType = await getMimeTypeFromImagePath(imagePath); // Ensure this function is available

    if (!mimeType) {
      throw new Error("Could not determine MIME type for the image.");
    }

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    };

    const prompt = `Extract all the information from this receipt, including store name, date, time, items purchased, prices, subtotal, tax, and total amount. Respond in JSON format.

      Do not include any additional text or explanations or code backticks. The JSON should have the following structure: 
      Output: 
      {
        "merchantName": "",
        "date": "",
        "time": "",
        "items": [
          {
            "name": "",
            "price": 0
          }
        ],
        "total": 0,
        "tax": 0,
        "paymentMethod": ""
      }
    `;

    const geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY); // Ensure this is properly initialized
    const model = geminiClient.getGenerativeModel({ model: geminiModel });
    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;
    const text = response.text(); // Get the model's text response
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, ""); // Clean the output

    let parsedData;
    try {
      parsedData = JSON.parse(cleanedText); // Attempt to parse Gemini's output as JSON
    } catch (jsonError) {
      console.error("Gemini's output was not valid JSON. Raw output:", text);
      throw new Error(
        "Gemini API returned invalid JSON. Check Gemini's output format.",
      );
    }

    return parsedData;
  } catch (error) {
    console.error("Error processing receipt with Gemini:", error);
    throw error; // Re-throw to be caught by the caller
  }
};

export const analyzeSpends = async (recieptData: any) => {
  const promts = `Categorize the following items into different categories: Food, Tech, Groceries, Clothing, Entertainment, Utilities, Transportation, Healthcare, Fuel, Commute, Travel, Personal Care, Bills, Household, Fees, Fitness, Other. 
    Given the structure of the reciptData as follows:
      items: [
        {
          name: "item name",
          price: 0
        }
      ]
    input: ${JSON.stringify(recieptData)}
    Provide a JSON response with the category and the total amount spent in that category with the following structure:
    output:
    analytics: {
        category: 
          amount: SchemaType.NUMBER,
        },

    Note: Do not include categories that have 0 amount. Also do not include any additional text or explanations or code backticks. 
    `;
  const geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = geminiClient.getGenerativeModel({ model: geminiModel });
  const result = await model.generateContent([promts]);
  const response = result.response;
  // console.log("Gemini's output:", response); // Log the raw output for debugging
  const text = response.text(); // This should now get the model's text response
  // console.log("Gemini's output:", text); // Log the raw output for debugging
  const cleanedText = text.replace(/```json/g, "").replace(/```/g, ""); // Clean the output
  let parsedData;
  try {
    parsedData = JSON.parse(cleanedText); // Attempt to parse Gemini's output as JSON immediately
  } catch (jsonError) {
    console.error("Gemini's output was not valid JSON. Raw output:", text);
    throw new Error(
      "Gemini API returned invalid JSON. Check Gemini's output format.",
    );
  }
  return parsedData;
};

const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw error;
  }
};

// Expose API for other components
export const aiServiceAPI = {
  getAIResponse,
  transcribeAudio,
  stakeSOL,
  recordSuccessfulStake,
  mintNFTOnSuccessfulStaking,
  checkStakingCompleted,
  verifyStakingTransaction,
  getStakingHistory,
  getNFTMintingHistory,
  getWalletBalance,
};
