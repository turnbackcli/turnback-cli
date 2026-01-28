import { Connection, PublicKey } from '@solana/web3.js';
import { loadWallet } from '../solana/wallet';
import { getSolBalance, getTokenBalance, getTokenDecimals, toTokenAmount } from '../solana/token';
import { getQuote, executeSwap } from '../swap/jupiter';
import { logger } from '../logs/logger';
import { config } from '../config';

export interface BuybackOptions {
  amount: number;
  inputMint?: string;
  outputMint?: string;
  slippageBps?: number;
  dryRun?: boolean;
}

export interface BuybackResult {
  signature: string;
  explorerUrl: string;
  inputAmount: number;
  outputAmount: number;
  inputMint: string;
  outputMint: string;
  priceImpact?: string;
}

export async function executeBuyback(
  connection: Connection,
  options: BuybackOptions
): Promise<BuybackResult> {
  const wallet = loadWallet();
  const walletPubkey = wallet.publicKey;

  // Use defaults or provided values
  const inputMint = options.inputMint || config.inputMint;
  const outputMint = options.outputMint || config.targetMint;
  const slippageBps = options.slippageBps || config.slippageBps;

  logger.info('Buyback Parameters:');
  logger.info(`  Input Mint: ${inputMint}`);
  logger.info(`  Output Mint: ${outputMint}`);
  logger.info(`  Amount: ${options.amount}`);
  logger.info(`  Slippage: ${slippageBps} bps (${(slippageBps / 100).toFixed(2)}%)`);

  // Validate slippage
  if (slippageBps > 200) {
    logger.warn(`High slippage detected: ${slippageBps} bps (${(slippageBps / 100).toFixed(2)}%)`);
  }

  // Get input token decimals and convert amount
  const inputMintPubkey = new PublicKey(inputMint);
  const decimals = await getTokenDecimals(connection, inputMintPubkey);
  const rawAmount = toTokenAmount(options.amount, decimals);

  logger.debug(`Input decimals: ${decimals}, Raw amount: ${rawAmount}`);

  // Check balances
  const solBalance = await getSolBalance(connection, walletPubkey);
  const tokenBalance = await getTokenBalance(connection, walletPubkey, inputMintPubkey);

  logger.info(`Current Balances:`);
  logger.info(`  SOL: ${solBalance.toFixed(4)}`);
  logger.info(`  Input Token: ${(tokenBalance / Math.pow(10, decimals)).toFixed(4)}`);

  // Safety checks
  if (solBalance < config.minSolReserve) {
    throw new Error(
      `Insufficient SOL for transaction fees. Balance: ${solBalance.toFixed(4)}, ` +
      `Required: ${config.minSolReserve}`
    );
  }

  if (tokenBalance < rawAmount) {
    throw new Error(
      `Insufficient input token balance. Have: ${(tokenBalance / Math.pow(10, decimals)).toFixed(4)}, ` +
      `Need: ${options.amount}`
    );
  }

  // Get quote
  logger.info('Fetching quote from Jupiter...');
  const quote = await getQuote(inputMint, outputMint, rawAmount, slippageBps);

  const outputDecimals = await getTokenDecimals(connection, new PublicKey(outputMint));
  const expectedOut = parseInt(quote.outAmount) / Math.pow(10, outputDecimals);

  logger.info('Quote Summary:');
  logger.info(`  Input: ${options.amount} tokens`);
  logger.info(`  Expected Output: ${expectedOut.toFixed(4)} tokens`);
  if (quote.priceImpactPct) {
    const impact = parseFloat(quote.priceImpactPct);
    const impactColor = impact > 1 ? 'red' : impact > 0.5 ? 'yellow' : 'green';
    logger.info(`  Price Impact: ${quote.priceImpactPct}%`);
    
    if (impact > 5) {
      logger.warn('WARNING: Very high price impact detected!');
    }
  }

  if (quote.routePlan && quote.routePlan.length > 0) {
    logger.info(`  Route: ${quote.routePlan.length} step(s)`);
  }

  if (options.dryRun) {
    logger.info('[DRY RUN] Buyback would execute with above parameters');
    return {
      signature: 'DRY_RUN',
      explorerUrl: '',
      inputAmount: options.amount,
      outputAmount: expectedOut,
      inputMint,
      outputMint,
      priceImpact: quote.priceImpactPct
    };
  }

  // Execute swap
  logger.info('Executing buyback swap...');
  const startTime = Date.now();
  
  const swapResult = await executeSwap(
    connection,
    inputMint,
    outputMint,
    rawAmount,
    slippageBps,
    wallet
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  logger.success(`Buyback completed in ${duration}s`);

  const actualOut = swapResult.outputAmount / Math.pow(10, outputDecimals);

  return {
    signature: swapResult.signature,
    explorerUrl: `${config.explorerBaseUrl}/tx/${swapResult.signature}`,
    inputAmount: options.amount,
    outputAmount: actualOut,
    inputMint,
    outputMint,
    priceImpact: swapResult.priceImpact
  };
}
