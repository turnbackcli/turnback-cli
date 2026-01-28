import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';
import { loadWallet } from '../solana/wallet';
import { getSolBalance, getTokenBalance, getTokenDecimals, toTokenAmount } from '../solana/token';
import { sendAndConfirmTx } from '../solana/tx';
import { logger } from '../logs/logger';
import { config } from '../config';

export interface ClaimOptions {
  mint: string;
  amount: number;
  to?: string;
  dryRun?: boolean;
}

export interface ClaimResult {
  signature: string;
  explorerUrl: string;
  amount: number;
  mint: string;
  recipient: string;
}

export async function claimFees(
  connection: Connection,
  options: ClaimOptions
): Promise<ClaimResult> {
  const wallet = loadWallet();
  const fromPubkey = wallet.publicKey;
  const toPubkey = options.to 
    ? new PublicKey(options.to) 
    : fromPubkey;

  logger.info('Claim Parameters:');
  logger.info(`  Mint: ${options.mint}`);
  logger.info(`  Amount: ${options.amount}`);
  logger.info(`  From: ${fromPubkey.toBase58()}`);
  logger.info(`  To: ${toPubkey.toBase58()}`);

  // Check SOL balance for fees
  const solBalance = await getSolBalance(connection, fromPubkey);
  logger.debug(`Current SOL balance: ${solBalance.toFixed(4)} SOL`);

  if (solBalance < config.minSolReserve + 0.01) {
    throw new Error(
      `Insufficient SOL for fees. Balance: ${solBalance.toFixed(4)}, ` +
      `Required: ${(config.minSolReserve + 0.01).toFixed(4)}`
    );
  }

  // Handle SOL transfer
  if (options.mint.toLowerCase() === 'sol') {
    return await claimSOL(connection, wallet, toPubkey, options.amount, options.dryRun);
  }

  // Handle SPL token transfer
  return await claimSPLToken(
    connection,
    wallet,
    new PublicKey(options.mint),
    toPubkey,
    options.amount,
    options.dryRun
  );
}

async function claimSOL(
  connection: Connection,
  wallet: any,
  toPubkey: PublicKey,
  amount: number,
  dryRun?: boolean
): Promise<ClaimResult> {
  const fromPubkey = wallet.publicKey;
  const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

  // Safety check
  const currentBalance = await getSolBalance(connection, fromPubkey);
  const afterBalance = currentBalance - amount;

  if (afterBalance < config.minSolReserve) {
    throw new Error(
      `Transfer would leave ${afterBalance.toFixed(4)} SOL, ` +
      `below minimum reserve of ${config.minSolReserve} SOL`
    );
  }

  if (dryRun) {
    logger.info('[DRY RUN] Would transfer:');
    logger.info(`  ${amount} SOL to ${toPubkey.toBase58()}`);
    logger.info(`  Remaining balance: ${afterBalance.toFixed(4)} SOL`);
    return {
      signature: 'DRY_RUN',
      explorerUrl: '',
      amount,
      mint: 'SOL',
      recipient: toPubkey.toBase58()
    };
  }

  // Create and send transaction
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports
    })
  );

  logger.info('Sending SOL transfer...');
  const result = await sendAndConfirmTx(connection, transaction, [wallet]);

  return {
    signature: result.signature,
    explorerUrl: result.explorerUrl,
    amount,
    mint: 'SOL',
    recipient: toPubkey.toBase58()
  };
}

async function claimSPLToken(
  connection: Connection,
  wallet: any,
  mintPubkey: PublicKey,
  toPubkey: PublicKey,
  humanAmount: number,
  dryRun?: boolean
): Promise<ClaimResult> {
  const fromPubkey = wallet.publicKey;

  // Get token info
  const decimals = await getTokenDecimals(connection, mintPubkey);
  const balance = await getTokenBalance(connection, fromPubkey, mintPubkey);
  const amount = toTokenAmount(humanAmount, decimals);

  logger.debug(`Token decimals: ${decimals}`);
  logger.debug(`Current balance: ${balance} (raw)`);
  logger.debug(`Transfer amount: ${amount} (raw)`);

  if (balance < amount) {
    throw new Error(
      `Insufficient token balance. Have: ${balance / Math.pow(10, decimals)}, ` +
      `Need: ${humanAmount}`
    );
  }

  const fromAta = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
  const toAta = await getAssociatedTokenAddress(mintPubkey, toPubkey);

  if (dryRun) {
    logger.info('[DRY RUN] Would transfer:');
    logger.info(`  ${humanAmount} tokens to ${toPubkey.toBase58()}`);
    logger.info(`  Remaining: ${(balance - amount) / Math.pow(10, decimals)}`);
    return {
      signature: 'DRY_RUN',
      explorerUrl: '',
      amount: humanAmount,
      mint: mintPubkey.toBase58(),
      recipient: toPubkey.toBase58()
    };
  }

  // Build transaction
  const transaction = new Transaction();

  // Check if recipient ATA exists, create if needed
  const toAtaInfo = await connection.getAccountInfo(toAta);
  if (!toAtaInfo) {
    logger.debug('Creating recipient token account...');
    transaction.add(
      createAssociatedTokenAccountInstruction(
        fromPubkey,
        toAta,
        toPubkey,
        mintPubkey
      )
    );
  }

  // Add transfer instruction
  transaction.add(
    createTransferInstruction(
      fromAta,
      toAta,
      fromPubkey,
      amount
    )
  );

  logger.info('Sending token transfer...');
  const result = await sendAndConfirmTx(connection, transaction, [wallet]);

  return {
    signature: result.signature,
    explorerUrl: result.explorerUrl,
    amount: humanAmount,
    mint: mintPubkey.toBase58(),
    recipient: toPubkey.toBase58()
  };
}
