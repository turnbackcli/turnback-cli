import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { logger } from '../logs/logger';
import { withRetry } from '../utils/retry';
import { shortenAddress, shortenSignature } from '../solana/tx';

export interface TradeFeedEntry {
  signature: string;
  timestamp: number;
  side: 'BUY' | 'SELL';
  wallet: string;
  tokenDelta: number;
  source: string;
}

export interface FeedOptions {
  mint: string;
  limit?: number;
  sinceMinutes?: number;
  dex?: string;
}

const KNOWN_PROGRAMS = {
  JUPITER_V6: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  JUPITER_V4: 'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB',
  RAYDIUM_V4: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  RAYDIUM_CLMM: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
  ORCA_WHIRLPOOL: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  PUMP_FUN: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'
};

export async function fetchTradeFeed(
  connection: Connection,
  options: FeedOptions
): Promise<TradeFeedEntry[]> {
  const mintPubkey = new PublicKey(options.mint);
  const limit = options.limit || 20;

  logger.info(`Fetching trade feed for ${options.mint.substring(0, 8)}...`);
  logger.debug(`Limit: ${limit}, Since: ${options.sinceMinutes || 'all time'} minutes`);

  // Fetch recent signatures for the mint
  const signatures = await withRetry(
    () => connection.getSignaturesForAddress(mintPubkey, { limit: limit * 3 }),
    { maxAttempts: 3, delayMs: 1000 }
  );

  if (signatures.length === 0) {
    logger.warn('No recent transactions found for this mint');
    return [];
  }

  logger.debug(`Found ${signatures.length} signatures, analyzing...`);

  // Filter by time if specified
  const cutoffTime = options.sinceMinutes
    ? Date.now() / 1000 - options.sinceMinutes * 60
    : 0;

  const relevantSigs = signatures.filter(sig => {
    if (!sig.blockTime) return false;
    return sig.blockTime >= cutoffTime;
  });

  logger.debug(`${relevantSigs.length} signatures within time range`);

  // Fetch and analyze transactions
  const entries: TradeFeedEntry[] = [];

  for (const sig of relevantSigs.slice(0, limit * 2)) {
    try {
      const tx = await fetchTransaction(connection, sig.signature);
      if (!tx) continue;

      const entry = analyzeTrade(tx, sig.signature, mintPubkey, options.dex);
      if (entry) {
        entries.push(entry);
      }

      if (entries.length >= limit) {
        break;
      }
    } catch (error: any) {
      logger.debug(`Failed to analyze tx ${sig.signature}: ${error.message}`);
    }
  }

  logger.info(`Found ${entries.length} trades`);
  return entries;
}

async function fetchTransaction(
  connection: Connection,
  signature: string
): Promise<ParsedTransactionWithMeta | null> {
  try {
    const tx = await withRetry(
      () => connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed'
      }),
      { maxAttempts: 2, delayMs: 500 }
    );
    return tx;
  } catch (error) {
    return null;
  }
}

function analyzeTrade(
  tx: ParsedTransactionWithMeta,
  signature: string,
  mintPubkey: PublicKey,
  dexFilter?: string
): TradeFeedEntry | null {
  if (!tx.meta || !tx.blockTime) return null;

  // Detect DEX from account keys
  const accountKeys = tx.transaction.message.accountKeys.map(key => 
    typeof key === 'string' ? key : key.pubkey.toBase58()
  );

  const source = detectDexSource(accountKeys, tx.meta.logMessages || []);
  
  // Apply DEX filter if specified
  if (dexFilter && dexFilter !== 'auto') {
    if (!source.toLowerCase().includes(dexFilter.toLowerCase())) {
      return null;
    }
  }

  // Analyze token balance changes
  const preBalances = tx.meta.preTokenBalances || [];
  const postBalances = tx.meta.postTokenBalances || [];

  const mintStr = mintPubkey.toBase58();

  // Find balance changes for our mint
  const changes = new Map<string, number>();

  for (const pre of preBalances) {
    if (pre.mint !== mintStr) continue;
    const owner = pre.owner;
    if (!owner) continue;

    const preAmount = parseFloat(pre.uiTokenAmount.uiAmountString || '0');
    const post = postBalances.find(
      p => p.accountIndex === pre.accountIndex
    );
    const postAmount = post ? parseFloat(post.uiTokenAmount.uiAmountString || '0') : 0;

    const delta = postAmount - preAmount;
    if (Math.abs(delta) > 0.000001) {
      changes.set(owner, delta);
    }
  }

  // Handle new accounts (only in post)
  for (const post of postBalances) {
    if (post.mint !== mintStr) continue;
    const owner = post.owner;
    if (!owner) continue;

    const hasPreBalance = preBalances.some(
      p => p.accountIndex === post.accountIndex
    );

    if (!hasPreBalance) {
      const postAmount = parseFloat(post.uiTokenAmount.uiAmountString || '0');
      if (postAmount > 0.000001) {
        changes.set(owner, postAmount);
      }
    }
  }

  // Find the largest change (likely the trader)
  let maxDelta = 0;
  let trader = '';

  for (const [owner, delta] of changes.entries()) {
    if (Math.abs(delta) > Math.abs(maxDelta)) {
      maxDelta = delta;
      trader = owner;
    }
  }

  if (!trader || Math.abs(maxDelta) < 0.000001) {
    return null;
  }

  // Determine side
  const side = maxDelta > 0 ? 'BUY' : 'SELL';

  return {
    signature,
    timestamp: tx.blockTime * 1000,
    side,
    wallet: trader,
    tokenDelta: Math.abs(maxDelta),
    source
  };
}

function detectDexSource(accountKeys: string[], logs: string[]): string {
  // Check account keys for known programs
  for (const key of accountKeys) {
    if (key === KNOWN_PROGRAMS.JUPITER_V6 || key === KNOWN_PROGRAMS.JUPITER_V4) {
      return 'Jupiter';
    }
    if (key === KNOWN_PROGRAMS.RAYDIUM_V4 || key === KNOWN_PROGRAMS.RAYDIUM_CLMM) {
      return 'Raydium';
    }
    if (key === KNOWN_PROGRAMS.ORCA_WHIRLPOOL) {
      return 'Orca';
    }
    if (key === KNOWN_PROGRAMS.PUMP_FUN) {
      return 'Pump.fun';
    }
  }

  // Check logs for hints
  const logsStr = logs.join(' ').toLowerCase();
  if (logsStr.includes('jupiter')) return 'Jupiter';
  if (logsStr.includes('raydium')) return 'Raydium';
  if (logsStr.includes('orca') || logsStr.includes('whirlpool')) return 'Orca';
  if (logsStr.includes('pump')) return 'Pump.fun';

  return 'Unknown';
}

export function formatTradeFeed(entries: TradeFeedEntry[]): void {
  if (entries.length === 0) {
    logger.info('No trades found');
    return;
  }

  logger.blank();
  logger.divider();
  
  // Header
  console.log(
    `${'TIME'.padEnd(12)} ` +
    `${'SIDE'.padEnd(6)} ` +
    `${'WALLET'.padEnd(12)} ` +
    `${'AMOUNT'.padEnd(15)} ` +
    `${'SOURCE'.padEnd(12)} ` +
    `${'TX'}`
  );
  logger.divider();

  // Entries
  for (const entry of entries) {
    const timeAgo = formatTimeAgo(entry.timestamp);
    const wallet = shortenAddress(entry.wallet, 4);
    const sig = shortenSignature(entry.signature, 4);
    const amount = entry.tokenDelta.toFixed(4);

    logger.feed(
      entry.side,
      `${timeAgo.padEnd(12)} ` +
      `${entry.side.padEnd(6)} ` +
      `${wallet.padEnd(12)} ` +
      `${amount.padEnd(15)} ` +
      `${entry.source.padEnd(12)} ` +
      `${sig}`
    );
  }

  logger.divider();
  logger.blank();
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
