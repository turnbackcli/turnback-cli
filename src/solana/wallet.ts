import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { config } from '../config';
import { logger } from '../logs/logger';

let cachedKeypair: Keypair | null = null;

export function loadWallet(): Keypair {
  if (cachedKeypair) {
    return cachedKeypair;
  }

  const privateKey = config.feeWalletPrivateKey;
  
  if (!privateKey) {
    throw new Error('FEE_WALLET_PRIVATE_KEY is required in .env for this command');
  }

  try {
    // Try base58 decoding
    const decoded = bs58.decode(privateKey);
    cachedKeypair = Keypair.fromSecretKey(decoded);
    
    logger.debug(`Wallet loaded: ${cachedKeypair.publicKey.toBase58()}`);
    return cachedKeypair;
  } catch (error: any) {
    logger.error('Failed to load wallet from FEE_WALLET_PRIVATE_KEY');
    throw new Error('Invalid private key format. Expected base58 encoded key.');
  }
}

export function getWalletPublicKey(): string {
  const wallet = loadWallet();
  return wallet.publicKey.toBase58();
}

export function maskPrivateKey(key: string): string {
  if (key.length <= 10) return '***';
  return key.substring(0, 4) + '...' + key.substring(key.length - 4);
}
