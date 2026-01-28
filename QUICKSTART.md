# TURNBACKBOT Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
# Copy the example environment file
copy env.example .env

# Edit .env with your settings (use notepad, vim, or any editor)
notepad .env
```

**Required Settings:**
- `FEE_WALLET_PRIVATE_KEY`: Your base58 encoded wallet private key
- `TARGET_MINT`: The token you want to buy back
- `JUPITER_API_KEY`: Already provided (e5029ac2-5c57-43a4-bcfa-cfe4da70cbd4)

### 3. Build the Project

```bash
npm run build
```

### 4. Run Your First Command

```bash
# Check wallet status
npm start -- status

# Or use the dev command
npm run dev status
```

## 📋 Common Commands

### Check Status
```bash
npm start -- status
```

### Claim Fees (SOL)
```bash
npm start -- claim --mint SOL --amount 0.1 --yes
```

### Execute Buyback (Dry Run)
```bash
npm start -- buyback --amount 10 --dry-run
```

### View Trade Feed
```bash
npm start -- feed --mint YOUR_TOKEN_MINT --limit 20
```

## 🔧 Switch RPC

```bash
# Use RPC Pool
npm start -- status --rpc https://mercuria-fronten-1cd8.mainnet.rpcpool.com/dfacae7d-d474-4d76-abd1-ef8da42a6510

# Use Phantom
npm start -- status --rpc https://solana-mainnet.phantom.app/YBPpkkN4g91xDiAnTE9r0RcMkjg0sKUIWvAfoFVJ?advancedTxSubmission=true
```

## 📝 Example .env Configuration

```env
# Use default Helius RPC (or uncomment and set your own)
# RPC_URL=https://lauraine-qytyxk-fast-mainnet.helius-rpc.com/

# Your wallet private key (base58 format)
FEE_WALLET_PRIVATE_KEY=5J7Zq...your...base58...key...here

# Token to buy back
TARGET_MINT=YourTokenMintAddress

# Token to spend (USDC)
INPUT_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Slippage: 100 bps = 1%
SLIPPAGE_BPS=100

# Keep at least 0.05 SOL for fees
MIN_SOL_RESERVE=0.05

# Default buyback amount
DEFAULT_BUYBACK_AMOUNT=100

# Jupiter API (already configured)
JUPITER_API_BASE=https://quote-api.jup.ag
JUPITER_API_KEY=e5029ac2-5c57-43a4-bcfa-cfe4da70cbd4

# Explorer
EXPLORER_BASE_URL=https://solscan.io

# Logging
LOG_LEVEL=info
TRADE_FEED_DEFAULT_LIMIT=20
```

## 🔐 Getting Your Base58 Private Key

If you have a Solana keypair JSON file (Phantom export, etc.):

```javascript
// Node.js script to convert
const fs = require('fs');
const bs58 = require('bs58');

const keypair = JSON.parse(fs.readFileSync('your-keypair.json'));
const base58Key = bs58.encode(Buffer.from(keypair));
console.log(base58Key);
```

## ⚠️ Safety Tips

1. **Start with dry-run**: Always test buybacks with `--dry-run` first
2. **Small amounts**: Test with small amounts before large operations
3. **Check balances**: Use `status` command to verify balances
4. **Secure keys**: Never commit `.env` or share your private key
5. **Monitor logs**: Check `logs/turnbackbot.log` for detailed information

## 🎯 Typical Workflow

```bash
# 1. Check status
npm start -- status

# 2. Check recent trades
npm start -- feed --mint YOUR_TOKEN_MINT --limit 25

# 3. Test buyback (dry run)
npm start -- buyback --amount 50 --dry-run

# 4. Execute buyback
npm start -- buyback --amount 50 --yes

# 5. Claim accumulated tokens
npm start -- claim --mint TARGET_MINT --amount 100 --to DESTINATION_WALLET --yes
```

## 📞 Troubleshooting

### Build Errors
```bash
npm run clean
npm install
npm run build
```

### RPC Issues
Try switching RPC with `--rpc` flag

### Configuration Errors
Verify your `.env` file matches the format in `env.example`

---

**Ready to go!** 🎉

For full documentation, see [README.md](README.md)
