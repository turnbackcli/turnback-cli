import { Connection, PublicKey } from '@solana/web3.js';
import { fetchTradeFeed, TradeFeedEntry } from './tradeFeed';
import chalk from 'chalk';
import { shortenAddress, shortenSignature } from '../solana/tx';

// Silence console.log temporarily
function silenceConsole<T>(fn: () => T): T {
  const originalLog = console.log;
  console.log = () => {};
  try {
    return fn();
  } finally {
    console.log = originalLog;
  }
}

async function silenceConsoleAsync<T>(fn: () => Promise<T>): Promise<T> {
  const originalLog = console.log;
  console.log = () => {};
  try {
    return await fn();
  } finally {
    console.log = originalLog;
  }
}

export interface LiveFeedOptions {
  mint: string;
  refreshSeconds?: number;
  dex?: string;
}

let tokenName: string | null = null;

const seenSignatures = new Set<string>();

const allTrades: TradeFeedEntry[] = [];

async function fetchTokenName(connection: Connection, mintAddress: string): Promise<string> {
  // For now, just return the full mint address
  // In future, can integrate with token list API
  return mintAddress;
}

export async function startLiveFeed(
  connection: Connection,
  options: LiveFeedOptions
): Promise<void> {
  const refreshInterval = (options.refreshSeconds || 1) * 1000; // Default 1 second for real-time

  // Fetch token name once
  if (!tokenName) {
    tokenName = await silenceConsoleAsync(async () => 
      await fetchTokenName(connection, options.mint)
    );
  }

  // Initial screen setup - don't clear, keep banner visible
  console.log('');
  console.log(chalk.bold.cyan(`  🔴 LIVE - ${tokenName}`));
  console.log(chalk.cyan('━'.repeat(80)));
  console.log('');
  console.log(chalk.yellow('⏳ Fetching trades...'));

  // Continuous polling loop
  while (true) {
    await fetchAndDisplayNew(connection, options, tokenName);
    await sleep(refreshInterval);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAndDisplayNew(
  connection: Connection,
  options: LiveFeedOptions,
  displayName: string
): Promise<void> {
  try {
    // Fetch trades (suppress internal logs only)
    const entries = await silenceConsoleAsync(async () => {
      return await fetchTradeFeed(connection, {
        mint: options.mint,
        limit: 30,
        sinceMinutes: 10,
        dex: options.dex
      });
    });

    // Filter only new trades
    const newTrades = entries.filter(entry => !seenSignatures.has(entry.signature));

    // Move cursor to top (keep banner visible)
    // Clear only the trades area, not the banner
    process.stdout.write('\x1B[8;1H'); // Move to line 8
    process.stdout.write('\x1B[J');    // Clear from cursor down
    
    // Print live header
    console.log(chalk.bold.cyan(`  🔴 LIVE - ${displayName.substring(0, 40)}...`));
    console.log(chalk.cyan('━'.repeat(80)));

    if (newTrades.length > 0) {
      // Add to seen and to all trades list
      newTrades.forEach(entry => {
        seenSignatures.add(entry.signature);
        allTrades.unshift(entry);
      });

      // Keep only last 50 trades
      if (allTrades.length > 50) {
        allTrades.splice(50);
      }

      console.log(chalk.green(`✓ ${newTrades.length} new trade(s) detected`));
      console.log('');
    } else if (allTrades.length === 0) {
      console.log(chalk.yellow('⏳ Waiting for trades... (checking every second)'));
      console.log('');
    }

    // Display all trades (newest at top)
    if (allTrades.length > 0) {
      const displayLimit = Math.min(allTrades.length, 30);
      for (let i = 0; i < displayLimit; i++) {
        displayTrade(allTrades[i]);
      }
    }
  } catch (error: any) {
    console.log(chalk.red(`✗ Error: ${error.message}`));
    console.log(chalk.dim('  Retrying...'));
  }
}

function displayTrade(entry: TradeFeedEntry): void {
  const time = new Date().toLocaleTimeString();
  const side = entry.side === 'BUY' ? chalk.green('BUY ↑') : chalk.red('SELL↓');
  const wallet = chalk.dim(shortenAddress(entry.wallet, 4));
  const amount = chalk.bold(entry.tokenDelta.toFixed(4).padStart(15));
  
  // Change Unknown to Jupiter
  const dexSource = entry.source === 'Unknown' ? 'Jupiter' : entry.source;
  const source = chalk.cyan(dexSource.padEnd(10));
  const sig = chalk.dim(shortenSignature(entry.signature, 4));

  console.log(`${chalk.dim(time)} ${side} ${wallet} ${amount} ${source} ${sig}`);
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}
