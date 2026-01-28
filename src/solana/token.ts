import { 
  PublicKey, 
  Connection,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getAccount,
  TokenAccountNotFoundError
} from '@solana/spl-token';
import { withRetry } from '../utils/retry';
import { logger } from '../logs/logger';

export async function getTokenBalance(
  connection: Connection,
  walletPubkey: PublicKey,
  mintPubkey: PublicKey
): Promise<number> {
  try {
    const ata = await getAssociatedTokenAddress(mintPubkey, walletPubkey);
    const account = await withRetry(() => getAccount(connection, ata));
    return Number(account.amount);
  } catch (error: any) {
    if (error instanceof TokenAccountNotFoundError) {
      return 0;
    }
    throw error;
  }
}

export async function getSolBalance(
  connection: Connection,
  walletPubkey: PublicKey
): Promise<number> {
  const balance = await withRetry(() => connection.getBalance(walletPubkey));
  return balance / LAMPORTS_PER_SOL;
}

export async function getTokenDecimals(
  connection: Connection,
  mintPubkey: PublicKey
): Promise<number> {
  try {
    const mintInfo = await withRetry(() => 
      connection.getParsedAccountInfo(mintPubkey)
    );
    
    if (!mintInfo.value) {
      throw new Error('Mint account not found');
    }
    
    const data = mintInfo.value.data;
    if (typeof data === 'object' && 'parsed' in data) {
      return data.parsed.info.decimals;
    }
    
    throw new Error('Failed to parse mint decimals');
  } catch (error: any) {
    logger.warn(`Could not fetch decimals for ${mintPubkey.toBase58()}, using default 9`);
    return 9;
  }
}

export function formatTokenAmount(amount: number, decimals: number): number {
  return amount / Math.pow(10, decimals);
}

export function toTokenAmount(humanAmount: number, decimals: number): number {
  return Math.floor(humanAmount * Math.pow(10, decimals));
}

export interface TokenBalanceInfo {
  mint: string;
  balance: number;
  decimals: number;
  formatted: number;
}

export async function getTokenBalanceInfo(
  connection: Connection,
  walletPubkey: PublicKey,
  mintPubkey: PublicKey
): Promise<TokenBalanceInfo> {
  const balance = await getTokenBalance(connection, walletPubkey, mintPubkey);
  const decimals = await getTokenDecimals(connection, mintPubkey);
  const formatted = formatTokenAmount(balance, decimals);

  return {
    mint: mintPubkey.toBase58(),
    balance,
    decimals,
    formatted
  };
}
