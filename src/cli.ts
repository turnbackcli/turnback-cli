import { Command } from 'commander';
import { PublicKey } from '@solana/web3.js';
import { getConnection, setRpcUrl, getCurrentRpcUrl } from './solana/connection';
import { loadWallet, getWalletPublicKey } from './solana/wallet';
import { getSolBalance, getTokenBalanceInfo } from './solana/token';
import { claimFees } from './fee/claim';
import { executeBuyback } from './buyback/buyback';
import { fetchTradeFeed, formatTradeFeed } from './feed/tradeFeed';
import { startLiveFeed } from './feed/liveFeed';
import { startWebSocketFeed } from './feed/websocketFeed';
import { startWebSocketLiteFeed } from './feed/websocketLite';
import { logger } from './logs/logger';
import { printBox, printSuccessBox, printErrorBox, printTable, formatNumber } from './ui/pretty';
import { config } from './config';
import readline from 'readline';

const program = new Command();

program
  .name('turnbackbot')
  .description('Production-ready Solana CLI for fee claims and buybacks')
  .version('1.0.0')
  .option('--rpc <url>', 'Custom RPC URL')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.rpc) {
      setRpcUrl(opts.rpc);
    }
  });

// STATUS COMMAND
program
  .command('status')
  .description('Show wallet status and balances')
  .action(async () => {
    try {
      const connection = getConnection();
      const wallet = loadWallet();
      const walletPubkey = wallet.publicKey;

      logger.info('Fetching wallet status...');

      const [solBalance, inputTokenInfo, targetTokenInfo] = await Promise.all([
        getSolBalance(connection, walletPubkey),
        getTokenBalanceInfo(connection, walletPubkey, new PublicKey(config.inputMint)),
        getTokenBalanceInfo(connection, walletPubkey, new PublicKey(config.targetMint))
      ]);

      const content = [
        `RPC URL: ${getCurrentRpcUrl()}`,
        '',
        `Wallet: ${walletPubkey.toBase58()}`,
        '',
        `SOL Balance: ${formatNumber(solBalance)} SOL`,
        `Min Reserve: ${formatNumber(config.minSolReserve)} SOL`,
        '',
        `Input Token (${config.inputMint.substring(0, 8)}...):`,
        `  Balance: ${formatNumber(inputTokenInfo.formatted)}`,
        `  Decimals: ${inputTokenInfo.decimals}`,
        '',
        `Target Token (${config.targetMint.substring(0, 8)}...):`,
        `  Balance: ${formatNumber(targetTokenInfo.formatted)}`,
        `  Decimals: ${targetTokenInfo.decimals}`
      ];

      printBox('WALLET STATUS', content);
    } catch (error: any) {
      logger.error(`Status check failed: ${error.message}`);
      process.exit(1);
    }
  });

// CLAIM COMMAND
program
  .command('claim')
  .description('Manually claim fees (transfer tokens)')
  .requiredOption('--mint <address>', 'Token mint address or "SOL"')
  .requiredOption('--amount <number>', 'Amount to transfer')
  .option('--to <address>', 'Recipient address (default: fee wallet)')
  .option('--yes', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      const connection = getConnection();
      const amount = parseFloat(options.amount);

      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid amount');
      }

      // Validate recipient if provided
      if (options.to) {
        try {
          new PublicKey(options.to);
        } catch {
          throw new Error('Invalid recipient address');
        }
      }

      logger.blank();
      printBox('CLAIM FEES', [
        `Mint: ${options.mint}`,
        `Amount: ${amount}`,
        `To: ${options.to || getWalletPublicKey()}`,
        '',
        'This will transfer tokens from the fee wallet'
      ]);

      // Confirm unless --yes flag
      if (!options.yes) {
        const confirmed = await confirm('Proceed with claim?');
        if (!confirmed) {
          logger.warn('Claim cancelled');
          return;
        }
      }

      logger.blank();
      const result = await claimFees(connection, {
        mint: options.mint,
        amount,
        to: options.to,
        dryRun: false
      });

      printSuccessBox('CLAIM SUCCESSFUL', [
        `Amount: ${result.amount} ${result.mint}`,
        `Recipient: ${result.recipient}`,
        '',
        `Signature: ${result.signature}`,
        `Explorer: ${result.explorerUrl}`
      ]);

      logger.tx('Claim completed', result.signature, result.explorerUrl);
    } catch (error: any) {
      logger.error(`Claim failed: ${error.message}`);
      process.exit(1);
    }
  });

// BUYBACK COMMAND
program
  .command('buyback')
  .description('Manually execute buyback swap')
  .requiredOption('--amount <number>', 'Amount of input token to swap')
  .option('--in <mint>', 'Input token mint (default: from config)')
  .option('--out <mint>', 'Output token mint (default: from config)')
  .option('--slippage <bps>', 'Slippage in bps (default: from config)')
  .option('--dry-run', 'Simulate without executing')
  .option('--yes', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      const connection = getConnection();
      const amount = parseFloat(options.amount);

      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid amount');
      }

      const slippageBps = options.slippage 
        ? parseInt(options.slippage)
        : config.slippageBps;

      logger.blank();
      printBox('BUYBACK SWAP', [
        `Input: ${amount} tokens`,
        `Input Mint: ${options.in || config.inputMint}`,
        `Output Mint: ${options.out || config.targetMint}`,
        `Slippage: ${slippageBps} bps (${(slippageBps / 100).toFixed(2)}%)`,
        '',
        options.dryRun ? 'DRY RUN MODE' : 'This will execute a real swap'
      ]);

      // Confirm unless --yes flag or dry-run
      if (!options.yes && !options.dryRun) {
        const confirmed = await confirm('Proceed with buyback?');
        if (!confirmed) {
          logger.warn('Buyback cancelled');
          return;
        }
      }

      logger.blank();
      const result = await executeBuyback(connection, {
        amount,
        inputMint: options.in,
        outputMint: options.out,
        slippageBps,
        dryRun: options.dryRun
      });

      if (options.dryRun) {
        printBox('DRY RUN RESULT', [
          `Input: ${result.inputAmount}`,
          `Expected Output: ${result.outputAmount.toFixed(4)}`,
          result.priceImpact ? `Price Impact: ${result.priceImpact}%` : '',
          '',
          'No transaction was executed'
        ]);
      } else {
        printSuccessBox('BUYBACK SUCCESSFUL', [
          `Input: ${result.inputAmount} tokens`,
          `Output: ${result.outputAmount.toFixed(4)} tokens`,
          result.priceImpact ? `Price Impact: ${result.priceImpact}%` : '',
          '',
          `Signature: ${result.signature}`,
          `Explorer: ${result.explorerUrl}`
        ]);

        logger.tx('Buyback completed', result.signature, result.explorerUrl);
      }
    } catch (error: any) {
      logger.error(`Buyback failed: ${error.message}`);
      process.exit(1);
    }
  });

// FEED COMMAND
program
  .command('feed')
  .description('Show recent trade feed (buyers/sellers)')
  .requiredOption('--mint <address>', 'Token mint address')
  .option('--limit <number>', 'Number of trades to show (default: 20)')
  .option('--since <minutes>', 'Only show trades from last N minutes')
  .option('--dex <name>', 'Filter by DEX: auto|jupiter|raydium|orca (default: auto)')
  .action(async (options) => {
    try {
      const connection = getConnection();
      const limit = options.limit ? parseInt(options.limit) : config.tradeFeedDefaultLimit;
      const sinceMinutes = options.since ? parseInt(options.since) : undefined;

      logger.blank();
      printBox('TRADE FEED', [
        `Token: ${options.mint}`,
        `Limit: ${limit}`,
        sinceMinutes ? `Since: ${sinceMinutes} minutes ago` : 'Since: all time',
        options.dex ? `DEX Filter: ${options.dex}` : 'DEX Filter: all'
      ]);

      logger.blank();
      const entries = await fetchTradeFeed(connection, {
        mint: options.mint,
        limit,
        sinceMinutes,
        dex: options.dex
      });

      formatTradeFeed(entries);
    } catch (error: any) {
      logger.error(`Feed fetch failed: ${error.message}`);
      process.exit(1);
    }
  });

// LIVE FEED COMMAND
program
  .command('live')
  .description('Live trade feed (real-time monitoring)')
  .requiredOption('--mint <address>', 'Token mint address')
  .option('--refresh <seconds>', 'Refresh interval in seconds (default: 3)')
  .option('--dex <name>', 'Filter by DEX: auto|jupiter|raydium|orca')
  .action(async (options) => {
    try {
      // Set RPC silently for live command
      const opts = program.opts();
      if (opts.rpc) {
        setRpcUrl(opts.rpc, true); // Silent mode
      }
      
      const connection = getConnection();
      const refreshSeconds = options.refresh ? parseInt(options.refresh) : 5;

      await startLiveFeed(connection, {
        mint: options.mint,
        refreshSeconds,
        dex: options.dex
      });

      // Keep process alive
      await new Promise(() => {});
    } catch (error: any) {
      logger.error(`Live feed failed: ${error.message}`);
      process.exit(1);
    }
  });

// INSTANT LIVE FEED COMMAND (WebSocket)
program
  .command('instant')
  .description('Instant live feed via WebSocket (real-time)')
  .requiredOption('--mint <address>', 'Token mint address')
  .action(async (options) => {
    try {
      // Set RPC silently
      const opts = program.opts();
      if (opts.rpc) {
        setRpcUrl(opts.rpc, true);
      }
      
      const connection = getConnection();

      await startWebSocketFeed(connection, {
        mint: options.mint
      });

      // Keep process alive
      await new Promise(() => {});
    } catch (error: any) {
      logger.error(`Instant feed failed: ${error.message}`);
      process.exit(1);
    }
  });

// SUPER INSTANT LIVE FEED (WebSocket Lite - No 429 errors!)
program
  .command('super')
  .description('Super instant live feed - no rate limits!')
  .requiredOption('--mint <address>', 'Token mint address')
  .action(async (options) => {
    try {
      // Set RPC silently
      const opts = program.opts();
      if (opts.rpc) {
        setRpcUrl(opts.rpc, true);
      }
      
      const connection = getConnection();

      await startWebSocketLiteFeed(connection, {
        mint: options.mint
      });

      // Keep process alive
      await new Promise(() => {});
    } catch (error: any) {
      logger.error(`Super instant feed failed: ${error.message}`);
      process.exit(1);
    }
  });

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`\n${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

export function runCLI(): void {
  program.parse();
}
