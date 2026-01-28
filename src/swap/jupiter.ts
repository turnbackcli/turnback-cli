import { Connection, VersionedTransaction, Keypair } from '@solana/web3.js';
import { config } from '../config';
import { logger } from '../logs/logger';
import { withRetry } from '../utils/retry';
import { fetch } from 'undici';

export interface QuoteResponse {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct?: string;
  routePlan?: any[];
}

export interface SwapResult {
  signature: string;
  inputAmount: number;
  outputAmount: number;
  priceImpact?: string;
}

export async function getQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number
): Promise<QuoteResponse> {
  const url = `${config.jupiterApiBase}/v6/quote?` + 
    `inputMint=${inputMint}&` +
    `outputMint=${outputMint}&` +
    `amount=${amount}&` +
    `slippageBps=${slippageBps}`;

  logger.debug(`Fetching quote from Jupiter: ${url}`);

  const response = await withRetry(
    async () => {
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Jupiter quote failed: ${res.status} ${text}`);
      }

      return res.json() as Promise<QuoteResponse>;
    },
    {
      maxAttempts: 3,
      delayMs: 1000
    }
  );

  return response;
}

export async function getSwapTransaction(
  quote: QuoteResponse,
  userPublicKey: string,
  wrapUnwrapSOL: boolean = true
): Promise<string> {
  const url = `${config.jupiterApiBase}/v6/swap`;

  const body = {
    quoteResponse: quote,
    userPublicKey,
    wrapAndUnwrapSol: wrapUnwrapSOL,
    dynamicComputeUnitLimit: true,
    prioritizationFeeLamports: 'auto'
  };

  logger.debug('Requesting swap transaction from Jupiter');

  const response = await withRetry(
    async () => {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.jupiterApiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Jupiter swap transaction failed: ${res.status} ${text}`);
      }

      const data = await res.json() as any;
      return data.swapTransaction;
    },
    {
      maxAttempts: 3,
      delayMs: 1000
    }
  );

  return response;
}

export async function executeSwap(
  connection: Connection,
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number,
  wallet: Keypair
): Promise<SwapResult> {
  // Get quote
  logger.info('Fetching swap quote...');
  const quote = await getQuote(inputMint, outputMint, amount, slippageBps);

  logger.info(`Quote received:`);
  logger.info(`  In: ${quote.inAmount} (${quote.inputMint.substring(0, 8)}...)`);
  logger.info(`  Out: ${quote.outAmount} (${quote.outputMint.substring(0, 8)}...)`);
  if (quote.priceImpactPct) {
    logger.info(`  Price Impact: ${quote.priceImpactPct}%`);
  }

  // Get swap transaction
  logger.info('Building swap transaction...');
  const swapTransactionBuf = await getSwapTransaction(
    quote,
    wallet.publicKey.toBase58(),
    true
  );

  // Deserialize and sign
  const swapTransaction = VersionedTransaction.deserialize(
    Buffer.from(swapTransactionBuf, 'base64')
  );
  swapTransaction.sign([wallet]);

  // Send transaction
  logger.info('Sending swap transaction...');
  const signature = await withRetry(
    async () => {
      const sig = await connection.sendTransaction(swapTransaction, {
        maxRetries: 3,
        skipPreflight: false
      });

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(sig, 'confirmed');
      if (confirmation.value.err) {
        throw new Error(`Swap failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      return sig;
    },
    {
      maxAttempts: 3,
      delayMs: 2000
    }
  );

  return {
    signature,
    inputAmount: parseInt(quote.inAmount),
    outputAmount: parseInt(quote.outAmount),
    priceImpact: quote.priceImpactPct
  };
}
