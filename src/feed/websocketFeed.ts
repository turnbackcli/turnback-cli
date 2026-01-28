import { Connection, PublicKey, ParsedTransactionWithMeta, PartiallyDecodedInstruction } from '@solana/web3.js';
import chalk from 'chalk';
import { shortenAddress, shortenSignature } from '../solana/tx';

export interface WebSocketFeedOptions {
  mint: string;
}

interface Trade {
  signature: string;
  timestamp: number;
  side: 'BUY' | 'SELL';
  wallet: string;
  amount: number;
}

const recentTrades: Trade[] = [];
const seenSigs = new Set<string>();

export async function startWebSocketFeed(
  connection: Connection,
  options: WebSocketFeedOptions
): Promise<void> {
  const mintPubkey = new PublicKey(options.mint);

  // Print header
  console.clear();
  console.log('');
  console.log(chalk.bold.cyan(`  🔴 INSTANT LIVE - ${options.mint}`));
  console.log(chalk.cyan('━'.repeat(80)));
  console.log(chalk.dim('  Listening for transactions...'));
  console.log('');

  // Subscribe to account changes for the mint
  const subscriptionId = connection.onLogs(
    mintPubkey,
    async (logs, context) => {
      try {
        const signature = logs.signature;
        
        // Skip if we've seen this
        if (seenSigs.has(signature)) return;
        seenSigs.add(signature);

        // Fetch transaction details
        const tx = await connection.getParsedTransaction(signature, {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed'
        });

        if (tx && tx.meta) {
          const trade = analyzeTrade(tx, signature, mintPubkey);
          if (trade) {
            displayTrade(trade);
            recentTrades.unshift(trade);
            
            // Keep only last 30 trades
            if (recentTrades.length > 30) {
              recentTrades.pop();
            }
          }
        }
      } catch (error) {
        // Silent error
      }
    },
    'confirmed'
  );

  console.log(chalk.green('✓ WebSocket connected - waiting for trades...'));
  console.log('');

  // Keep process alive
  await new Promise(() => {});
}

function analyzeTrade(
  tx: ParsedTransactionWithMeta,
  signature: string,
  mintPubkey: PublicKey
): Trade | null {
  if (!tx.meta || !tx.blockTime) return null;

  const mintStr = mintPubkey.toBase58();
  const preBalances = tx.meta.preTokenBalances || [];
  const postBalances = tx.meta.postTokenBalances || [];

  // Find balance changes
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

  // Handle new accounts
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

  // Find largest change
  let maxDelta = 0;
  let trader = '';

  for (const [owner, delta] of changes.entries()) {
    if (Math.abs(delta) > Math.abs(maxDelta)) {
      maxDelta = delta;
      trader = owner;
    }
  }

  if (!trader || Math.abs(maxDelta) < 0.000001) return null;

  return {
    signature,
    timestamp: tx.blockTime * 1000,
    side: maxDelta > 0 ? 'BUY' : 'SELL',
    wallet: trader,
    amount: Math.abs(maxDelta)
  };
}

function displayTrade(trade: Trade): void {
  const time = new Date(trade.timestamp).toLocaleTimeString();
  const side = trade.side === 'BUY' ? chalk.green('BUY ↑') : chalk.red('SELL↓');
  const wallet = chalk.dim(shortenAddress(trade.wallet, 4));
  const amount = chalk.bold(trade.amount.toFixed(4).padStart(15));
  const sig = chalk.dim(shortenSignature(trade.signature, 4));

  console.log(`${chalk.dim(time)} ${side} ${wallet} ${amount} ${chalk.cyan('INSTANT'.padEnd(10))} ${sig}`);
}
