import dotenv from 'dotenv';
import { PublicKey } from '@solana/web3.js';
import path from 'path';

dotenv.config();

export interface Config {
  rpcUrl: string;
  feeWalletPrivateKey: string;
  targetMint: string;
  inputMint: string;
  slippageBps: number;
  minSolReserve: number;
  defaultBuybackAmount: number;
  explorerBaseUrl: string;
  logLevel: string;
  tradeFeedDefaultLimit: number;
  jupiterApiBase: string;
  jupiterApiKey: string;
}

const DEFAULT_RPC_URL = 'https://lauraine-qytyxk-fast-mainnet.helius-rpc.com/';

const ALTERNATE_RPCS = [
  'https://mercuria-fronten-1cd8.mainnet.rpcpool.com/dfacae7d-d474-4d76-abd1-ef8da42a6510',
  'https://solana-mainnet.phantom.app/YBPpkkN4g91xDiAnTE9r0RcMkjg0sKUIWvAfoFVJ?advancedTxSubmission=true'
];

function validatePublicKey(key: string, name: string): void {
  try {
    new PublicKey(key);
  } catch (error) {
    throw new Error(`Invalid ${name}: ${key}`);
  }
}

function loadConfig(): Config {
  const feeWalletPrivateKey = process.env.FEE_WALLET_PRIVATE_KEY || '';

  const targetMint = process.env.TARGET_MINT || '';

  const inputMint = process.env.INPUT_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC
  if (inputMint) {
    validatePublicKey(inputMint, 'INPUT_MINT');
  }

  const jupiterApiKey = process.env.JUPITER_API_KEY || '';

  return {
    rpcUrl: process.env.RPC_URL || DEFAULT_RPC_URL,
    feeWalletPrivateKey,
    targetMint,
    inputMint,
    slippageBps: parseInt(process.env.SLIPPAGE_BPS || '100', 10),
    minSolReserve: parseFloat(process.env.MIN_SOL_RESERVE || '0.05'),
    defaultBuybackAmount: parseFloat(process.env.DEFAULT_BUYBACK_AMOUNT || '100'),
    explorerBaseUrl: process.env.EXPLORER_BASE_URL || 'https://solscan.io',
    logLevel: process.env.LOG_LEVEL || 'info',
    tradeFeedDefaultLimit: parseInt(process.env.TRADE_FEED_DEFAULT_LIMIT || '20', 10),
    jupiterApiBase: process.env.JUPITER_API_BASE || 'https://quote-api.jup.ag',
    jupiterApiKey
  };
}

export const config = loadConfig();
export { ALTERNATE_RPCS };
