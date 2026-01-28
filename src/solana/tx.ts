import {
  Connection,
  Transaction,
  Keypair,
  sendAndConfirmTransaction,
  VersionedTransaction,
  TransactionSignature
} from '@solana/web3.js';
import { withRetry } from '../utils/retry';
import { logger } from '../logs/logger';
import { config } from '../config';

export interface SendTransactionResult {
  signature: string;
  explorerUrl: string;
}

export async function sendAndConfirmTx(
  connection: Connection,
  transaction: Transaction,
  signers: Keypair[]
): Promise<SendTransactionResult> {
  try {
    const signature = await withRetry(
      () => sendAndConfirmTransaction(connection, transaction, signers, {
        commitment: 'confirmed',
        maxRetries: 3
      }),
      {
        maxAttempts: 3,
        delayMs: 2000
      }
    );

    const explorerUrl = getExplorerUrl(signature);
    return { signature, explorerUrl };
  } catch (error: any) {
    logger.error(`Transaction failed: ${error.message}`);
    throw error;
  }
}

export async function sendAndConfirmVersionedTx(
  connection: Connection,
  transaction: VersionedTransaction
): Promise<SendTransactionResult> {
  try {
    const signature = await withRetry(
      async () => {
        const sig = await connection.sendTransaction(transaction, {
          maxRetries: 3,
          skipPreflight: false
        });
        
        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(sig, 'confirmed');
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }
        
        return sig;
      },
      {
        maxAttempts: 3,
        delayMs: 2000
      }
    );

    const explorerUrl = getExplorerUrl(signature);
    return { signature, explorerUrl };
  } catch (error: any) {
    logger.error(`Versioned transaction failed: ${error.message}`);
    throw error;
  }
}

export function getExplorerUrl(signature: string, cluster: string = 'mainnet-beta'): string {
  const baseUrl = config.explorerBaseUrl;
  
  if (baseUrl.includes('solscan.io')) {
    return `${baseUrl}/tx/${signature}`;
  } else if (baseUrl.includes('solana.fm')) {
    return `${baseUrl}/tx/${signature}?cluster=${cluster}`;
  } else {
    return `${baseUrl}/tx/${signature}?cluster=${cluster}`;
  }
}

export function shortenSignature(signature: string, chars: number = 8): string {
  return `${signature.substring(0, chars)}...${signature.substring(signature.length - chars)}`;
}

export function shortenAddress(address: string, chars: number = 4): string {
  return `${address.substring(0, chars)}...${address.substring(address.length - chars)}`;
}
