#!/usr/bin/env node

/**
 * Utility script to convert Solana keypair JSON to base58 format
 * Usage: node scripts/keypair-to-base58.js <path-to-keypair.json>
 */

const fs = require('fs');
const bs58 = require('bs58');
const path = require('path');

function convertKeypairToBase58(keypairPath) {
  try {
    // Read keypair file
    const keypairData = fs.readFileSync(keypairPath, 'utf8');
    const keypairArray = JSON.parse(keypairData);

    // Validate it's an array of numbers
    if (!Array.isArray(keypairArray) || keypairArray.length !== 64) {
      throw new Error('Invalid keypair format. Expected array of 64 numbers.');
    }

    // Convert to base58
    const base58Key = bs58.encode(Buffer.from(keypairArray));

    console.log('\n✓ Successfully converted keypair to base58\n');
    console.log('Base58 Private Key:');
    console.log('─'.repeat(80));
    console.log(base58Key);
    console.log('─'.repeat(80));
    console.log('\n⚠️  KEEP THIS SECRET! Add it to your .env file as FEE_WALLET_PRIVATE_KEY\n');

    return base58Key;
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

// Main
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node scripts/keypair-to-base58.js <path-to-keypair.json>');
    console.log('\nExample:');
    console.log('  node scripts/keypair-to-base58.js ~/.config/solana/id.json');
    process.exit(1);
  }

  const keypairPath = path.resolve(args[0]);

  if (!fs.existsSync(keypairPath)) {
    console.error(`✗ File not found: ${keypairPath}`);
    process.exit(1);
  }

  convertKeypairToBase58(keypairPath);
}

module.exports = { convertKeypairToBase58 };
