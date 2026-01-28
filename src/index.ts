#!/usr/bin/env node

import { printBanner, printWarning } from './ui/banner';
import { runCLI } from './cli';
import { logger } from './logs/logger';
import { config } from './config';

async function main() {
  try {
    const isLiveCommand = process.argv.includes('live');
    const isInstantCommand = process.argv.includes('instant');
    
    // Always print banner
    printBanner();
    
    // Skip warning for live/instant commands
    if (!isLiveCommand && !isInstantCommand) {
      printWarning();
    }

    // Validate config is loaded
    logger.debug('Configuration loaded successfully');
    logger.debug(`RPC: ${config.rpcUrl}`);
    if (config.targetMint) {
      logger.debug(`Target Mint: ${config.targetMint}`);
    }

    // Run CLI
    runCLI();
  } catch (error: any) {
    logger.error(`Fatal error: ${error.message}`);
    
    if (error.message.includes('required in .env')) {
      logger.error('Please check your .env file configuration');
      logger.error('Copy env.example to .env and fill in your values');
    }

    process.exit(1);
  }
}

main();
