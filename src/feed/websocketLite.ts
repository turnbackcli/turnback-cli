import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import { shortenAddress } from '../solana/tx';
import { fetchTokenStats, displayTokenStats, TokenStats } from './tokenStats';
import { fetch } from 'undici';

export interface WebSocketLiteOptions {
  mint: string;
}

const startTime = Date.now();
const seenSigs = new Set<string>();
const recentTrades: TradeDisplay[] = [];
let currentStats: TokenStats | null = null;
let solPriceUSD = 0;
let globalConnection: Connection;
let globalMintAddress: string;

interface TradeDisplay {
  timestamp: number;
  side: string;
  amount: string;
  solAmount: string;
  wallet: string;
  marketCap: string;
  fee: string;
  color: any;
}

export async function startWebSocketLiteFeed(
  connection: Connection,
  options: WebSocketLiteOptions
): Promise<void> {
  const mintPubkey = new PublicKey(options.mint);
  
  // Store globally for stats refresh
  globalConnection = connection;
  globalMintAddress = options.mint;

  // Initial screen draw
  redrawScreen();
  
  // Fetch SOL price
  solPriceUSD = await fetchSolPrice();
  if (solPriceUSD === 0) {
    console.log(chalk.red('  ⚠ Failed to fetch SOL price, using fallback'));
    solPriceUSD = 127; // Current SOL price
  }
  
  // Fetch initial stats
  currentStats = await fetchTokenStats(connection, options.mint);
  redrawScreen();
  
  // Update stats and SOL price every 5 seconds for live MC
  setInterval(async () => {
    const newSolPrice = await fetchSolPrice();
    if (newSolPrice > 0) {
      solPriceUSD = newSolPrice;
    }
    currentStats = await fetchTokenStats(connection, options.mint);
  }, 5000);
  
  // Refresh timestamps every second
  setInterval(() => {
    redrawScreen();
  }, 1000);

  // Subscribe to logs for the mint
  const subscriptionId = connection.onLogs(
    mintPubkey,
    async (logs, context) => {
      if (seenSigs.has(logs.signature)) return;
      seenSigs.add(logs.signature);
      
      // Fetch and display trade details (no await to avoid blocking)
      displayTradeWithDetails(connection, logs.signature, mintPubkey).catch(() => {});
    },
    'confirmed'
  );

  // Keep process alive
  await new Promise(() => {});
}

async function displayTradeWithDetails(
  connection: Connection,
  signature: string,
  mintPubkey: PublicKey
): Promise<void> {
  try {
    // Fetch transaction (with longer timeout)
    const tx = await Promise.race([
      connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed'
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
    ]);

    if (!tx || !tx.meta) {
      // Skip trades we can't fetch (don't show "Trade")
      return;
    }

    const trade = analyzeTrade(tx, signature, mintPubkey);
    if (trade) {
      displayFormattedTrade(trade);
    }
    // Skip trades we can't determine buy/sell
  } catch {
    // Skip on error
  }
}

interface TradeInfo {
  side: 'BUY' | 'SELL';
  wallet: string;
  tokenAmount: number;
  solAmount: number;
  signature: string;
  timestamp: number;
}

function analyzeTrade(
  tx: ParsedTransactionWithMeta,
  signature: string,
  mintPubkey: PublicKey
): TradeInfo | null {
  if (!tx.meta || !tx.blockTime) return null;

  const mintStr = mintPubkey.toBase58();
  const preBalances = tx.meta.preTokenBalances || [];
  const postBalances = tx.meta.postTokenBalances || [];
  const accountKeys = tx.transaction.message.accountKeys;

  const changes = new Map<string, number>();

  for (const pre of preBalances) {
    if (pre.mint !== mintStr) continue;
    const owner = pre.owner;
    if (!owner) continue;

    const preAmount = parseFloat(pre.uiTokenAmount.uiAmountString || '0');
    const post = postBalances.find(p => p.accountIndex === pre.accountIndex);
    const postAmount = post ? parseFloat(post.uiTokenAmount.uiAmountString || '0') : 0;

    const delta = postAmount - preAmount;
    if (Math.abs(delta) > 0.000001) {
      changes.set(owner, delta);
    }
  }

  for (const post of postBalances) {
    if (post.mint !== mintStr) continue;
    const owner = post.owner;
    if (!owner) continue;

    const hasPreBalance = preBalances.some(p => p.accountIndex === post.accountIndex);
    if (!hasPreBalance) {
      const postAmount = parseFloat(post.uiTokenAmount.uiAmountString || '0');
      if (postAmount > 0.000001) {
        changes.set(owner, postAmount);
      }
    }
  }

  // Get the FEE PAYER (actual trader) - first signer
  const feePayer = accountKeys[0];
  const feePayerPubkey = typeof feePayer === 'string' ? feePayer : feePayer.pubkey.toBase58();
  
  // Get token delta specifically for FEE PAYER (not pool!)
  let traderDelta = changes.get(feePayerPubkey) || 0;
  
  // If fee payer doesn't have token change, might be routing through program
  // In that case, find the largest change (but less reliable)
  if (Math.abs(traderDelta) < 0.000001) {
    for (const delta of changes.values()) {
      if (Math.abs(delta) > Math.abs(traderDelta)) {
        traderDelta = delta;
      }
    }
  }

  if (Math.abs(traderDelta) < 0.000001) return null;

  // Get SOL/WSOL trade amount - be more precise!
  let solDelta = 0;
  
  // Check WSOL (wrapped SOL) balance changes
  const WSOL_MINT = 'So11111111111111111111111111111111111111112';
  
  // First, try to find WSOL changes specifically related to the fee payer
  const wsolChangesMap = new Map<string, number>();
  
  for (const pre of preBalances) {
    if (pre.mint === WSOL_MINT && pre.owner) {
      const preAmount = parseFloat(pre.uiTokenAmount.uiAmountString || '0');
      const post = postBalances.find(p => p.accountIndex === pre.accountIndex);
      const postAmount = post ? parseFloat(post.uiTokenAmount.uiAmountString || '0') : 0;
      
      const wsolDelta = Math.abs(postAmount - preAmount);
      if (wsolDelta > 0.0001) {
        wsolChangesMap.set(pre.owner, wsolDelta);
      }
    }
  }
  
  // Check new WSOL accounts
  for (const post of postBalances) {
    if (post.mint === WSOL_MINT && post.owner) {
      const hasPreBalance = preBalances.some(p => p.accountIndex === post.accountIndex);
      if (!hasPreBalance) {
        const postAmount = parseFloat(post.uiTokenAmount.uiAmountString || '0');
        if (postAmount > 0.0001) {
          const existing = wsolChangesMap.get(post.owner) || 0;
          wsolChangesMap.set(post.owner, Math.max(existing, postAmount));
        }
      }
    }
  }
  
  // Prefer fee payer's WSOL change
  if (wsolChangesMap.has(feePayerPubkey)) {
    solDelta = wsolChangesMap.get(feePayerPubkey)!;
  } else if (wsolChangesMap.size > 0) {
    // Use median (not max) to avoid pool outliers
    const changes = Array.from(wsolChangesMap.values()).sort((a, b) => a - b);
    const medianIdx = Math.floor(changes.length / 2);
    solDelta = changes[medianIdx];
  }
  
  // Fallback: check native SOL balance change
  if (solDelta < 0.001 && tx.meta.preBalances.length > 0) {
    const preSol = tx.meta.preBalances[0] / 1e9;
    const postSol = tx.meta.postBalances[0] / 1e9;
    const nativeDelta = Math.abs(preSol - postSol);
    
    // Only use if significant (exclude fees < 0.005)
    if (nativeDelta > 0.005 && nativeDelta < 100) {
      solDelta = nativeDelta;
    }
  }

  return {
    side: traderDelta > 0 ? 'BUY' : 'SELL', // Use trader's delta, not pool's!
    wallet: feePayerPubkey,
    tokenAmount: Math.abs(traderDelta),
    solAmount: solDelta,
    signature,
    timestamp: tx.blockTime * 1000
  };
}

function displayFormattedTrade(trade: TradeInfo): void {
  const sideColor = trade.side === 'BUY' ? chalk.green : chalk.red;
  const amount = formatAmount(trade.tokenAmount);
  const solAmount = `SOL${trade.solAmount.toFixed(3)}`; // Format as "SOL0.284"
  const wallet = shortenAddress(trade.wallet, 3);
  
  // Calculate creator fee (typically 1% = 100 bps of trade volume)
  // Fee = SOL amount × (creator_trading_fee_percentage / 10000)
  const CREATOR_FEE_BPS = 100; // 1% default (adjust based on pool config)
  const feeAmount = trade.solAmount * (CREATOR_FEE_BPS / 10000);
  const fee = feeAmount > 0.0001 ? `${feeAmount.toFixed(4)} SOL` : '---';
  
  // Calculate MC from this specific trade's price (instant, no API lag)
  let marketCap = '---';
  
  // Only calculate if we have a meaningful SOL amount (> 0.005 to avoid dust/fees)
  if (trade.tokenAmount > 100 && trade.solAmount > 0.005 && solPriceUSD > 0) {
    const supply = currentStats?.supply || 1000000000; // Default 1B if not available
    
    // Price from this trade in SOL
    const priceInSOL = trade.solAmount / trade.tokenAmount;
    
    // Convert to USD
    const priceInUSD = priceInSOL * solPriceUSD;
    
    // Market cap (with sanity check)
    const tradeMC = priceInUSD * supply;
    
    // Only use if reasonable (between $1K and $100M)
    if (tradeMC > 1000 && tradeMC < 100000000) {
      marketCap = formatMarketCap(tradeMC);
      
      // Update stats with this trade's price
      if (currentStats) {
        currentStats.price = priceInUSD;
        currentStats.marketCap = tradeMC;
      }
    } else if (currentStats && currentStats.marketCap > 0) {
      marketCap = formatMarketCap(currentStats.marketCap);
    }
  } else if (currentStats && currentStats.marketCap > 0) {
    // Fall back to API MC for small trades or missing SOL amount
    marketCap = formatMarketCap(currentStats.marketCap);
  }
  
  // Add to recent trades (at beginning for newest first)
  recentTrades.unshift({
    timestamp: trade.timestamp,
    side: trade.side === 'BUY' ? 'Buy' : 'Sell',
    amount,
    solAmount,
    wallet,
    marketCap,
    fee,
    color: sideColor
  });
  
  // Keep only last 30 trades
  if (recentTrades.length > 30) {
    recentTrades.pop();
  }
  
  redrawScreen();
}


function redrawScreen(): void {
  // Clear screen
  console.clear();
  
  // Print TURNBACKBOT banner
  console.log('');
  const banner = figlet.textSync('TURNBACKBOT', { font: 'Standard' });
  console.log(gradient.pastel.multiline(banner));
  console.log('');
  
  // Display token stats
  displayTokenStats(currentStats);
  
  // Print table header
  console.log(chalk.bold.cyan(`  🔴 LIVE FEED`));
  console.log(chalk.cyan('━'.repeat(120)));
  console.log(
    `  ${'Age'.padEnd(8)}` +
    `${'Type'.padEnd(10)}` +
    `${'MC'.padEnd(10)}` +
    `${'Amount'.padEnd(18)}` +
    `${'Total SOL'.padEnd(15)}` +
    `${'Trader'.padEnd(13)}` +
    `${'Fee'}`
  );
  console.log(chalk.cyan('━'.repeat(120)));
  
  // Display trades (newest at top with relative time)
  const now = Date.now();
  if (recentTrades.length === 0) {
    console.log(chalk.dim('  Listening for trades...'));
  } else {
    for (const trade of recentTrades) {
      const timeAgo = formatTimeAgo(now - trade.timestamp);
      
      // Format each column with fixed width
      const ageCol = timeAgo.padEnd(8);
      const typeCol = trade.side.padEnd(10);
      const mcCol = trade.marketCap.padEnd(10);
      const amountCol = trade.amount.padEnd(18);
      const solCol = trade.solAmount.padEnd(15);
      const walletCol = trade.wallet.padEnd(13);
      const feeCol = trade.fee;
      
      console.log(
        `  ${chalk.yellow(ageCol)}` +
        `${trade.color(typeCol)}` +
        `${chalk.cyan(mcCol)}` +
        `${chalk.bold(amountCol)}` +
        `${chalk.magenta(solCol)}` +
        `${chalk.dim(walletCol)}` +
        `${chalk.green(feeCol)}`
      );
    }
  }
  
  // Status footer
  console.log('');
  console.log(chalk.dim(`  Total: ${recentTrades.length > 30 ? '30+' : recentTrades.length} trades`));
}

function formatTimeAgo(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

function formatAmount(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(2)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toFixed(2);
}

function formatMarketCap(mc: number): string {
  if (mc >= 1e9) return `$${(mc / 1e9).toFixed(0)}B`;
  if (mc >= 1e6) return `$${(mc / 1e6).toFixed(0)}M`;
  if (mc >= 1e3) return `$${(mc / 1e3).toFixed(0)}K`;
  return `$${mc.toFixed(0)}`;
}

async function fetchSolPrice(): Promise<number> {
  try {
    // Try multiple sources for most accurate SOL price
    // 1. Jupiter
    let url = 'https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112';
    let response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    
    if (response.ok) {
      const data = await response.json() as any;
      const price = data.data?.['So11111111111111111111111111111111111111112']?.price;
      if (price > 0) return price;
    }
    
    // 2. DexScreener fallback
    url = 'https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112';
    response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    
    if (response.ok) {
      const data = await response.json() as any;
      const pair = data.pairs?.[0];
      if (pair?.priceUsd) return parseFloat(pair.priceUsd);
    }
    
    return 0;
  } catch {
    return 0;
  }
}
