# 🚀 START HERE - TURNBACKBOT

Welcome to TURNBACKBOT! This guide will get you up and running quickly.

---

## What is TURNBACKBOT?

TURNBACKBOT is a production-ready CLI tool for Solana token projects that enables:

✅ **Manual Fee Claims** - Transfer accumulated fees (SOL or SPL tokens)  
✅ **Manual Buybacks** - Execute token buybacks via Jupiter aggregator  
✅ **Trade Feed** - Monitor recent buyers and sellers from on-chain data  
✅ **Multiple RPCs** - Switch between Helius, RPC Pool, and Phantom  
✅ **Beautiful CLI** - Gradient banner, clean logs, elegant output  

---

## Quick Setup (5 Minutes)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment

```bash
# Copy the example file
copy env.example .env

# Edit with your settings
notepad .env
```

**Required Values:**
- `FEE_WALLET_PRIVATE_KEY` - Your base58 encoded private key
- `TARGET_MINT` - Token mint address to buy back
- `JUPITER_API_KEY` - Already provided in example

### Step 3: Build

```bash
npm run build
```

### Step 4: Test

```bash
npm start -- status
```

You should see a beautiful ASCII banner and your wallet status! 🎉

---

## Your First Commands

### Check Wallet Status

```bash
npm start -- status
```

Shows your SOL balance, token balances, and configuration.

### View Recent Trades

```bash
npm start -- feed --mint YOUR_TOKEN_MINT --limit 10
```

Shows recent buyers and sellers for your token.

### Test Buyback (Dry Run)

```bash
npm start -- buyback --amount 10 --dry-run
```

Simulates a buyback without executing.

### Claim Fees

```bash
npm start -- claim --mint SOL --amount 0.1 --yes
```

Transfers 0.1 SOL from fee wallet.

---

## Documentation Guide

### 📖 Which Document to Read?

| Document | When to Read It |
|----------|-----------------|
| **[README.md](README.md)** | Comprehensive documentation - read this for complete details |
| **[QUICKSTART.md](QUICKSTART.md)** | Fast setup guide - 5 minute walkthrough |
| **[EXAMPLES.md](EXAMPLES.md)** | Usage examples - see real command examples |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | Production deployment - when going live |
| **[TESTING.md](TESTING.md)** | Testing guide - before production use |
| **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** | Project overview - understand the architecture |
| **[FILE_STRUCTURE.md](FILE_STRUCTURE.md)** | File organization - navigate the codebase |
| **START_HERE.md** | This file - your entry point! |

### 🎯 Recommended Reading Order

**For Users:**
1. START_HERE.md (you are here)
2. [QUICKSTART.md](QUICKSTART.md)
3. [EXAMPLES.md](EXAMPLES.md)
4. [README.md](README.md) (reference)

**For Deployment:**
1. [TESTING.md](TESTING.md)
2. [DEPLOYMENT.md](DEPLOYMENT.md)
3. [README.md](README.md) (security section)

**For Developers:**
1. [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
2. [FILE_STRUCTURE.md](FILE_STRUCTURE.md)
3. Source code in `src/`

---

## Key Configuration

### Environment Variables (.env)

```env
# Wallet
FEE_WALLET_PRIVATE_KEY=your_base58_private_key

# Tokens
TARGET_MINT=YourTokenMintAddress
INPUT_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v  # USDC

# Trading
SLIPPAGE_BPS=100              # 100 bps = 1%
MIN_SOL_RESERVE=0.05          # Keep 0.05 SOL for fees

# Jupiter API (provided)
JUPITER_API_KEY=e5029ac2-5c57-43a4-bcfa-cfe4da70cbd4
```

---

## Common Tasks

### Task: Check Wallet Balance

```bash
npm start -- status
```

### Task: Monitor Recent Trading

```bash
npm start -- feed --mint YOUR_TOKEN --since 60 --limit 30
```

Shows trades from the last 60 minutes.

### Task: Execute Buyback

```bash
# 1. Test with dry run
npm start -- buyback --amount 50 --dry-run

# 2. Review the quote

# 3. Execute if good
npm start -- buyback --amount 50 --yes
```

### Task: Claim Fees to Treasury

```bash
npm start -- claim --mint YOUR_TOKEN --amount 500 --to TREASURY_ADDRESS --yes
```

### Task: Switch RPC Endpoint

```bash
npm start -- status --rpc https://mercuria-fronten-1cd8.mainnet.rpcpool.com/dfacae7d-d474-4d76-abd1-ef8da42a6510
```

---

## Commands Reference

### All Available Commands

```bash
turnbackbot status                    # Show wallet status
turnbackbot claim [options]           # Claim fees
turnbackbot buyback [options]         # Execute buyback
turnbackbot feed [options]            # Show trade feed
turnbackbot --help                    # Show help
```

### Common Options

- `--rpc <url>` - Use custom RPC endpoint
- `--yes` - Skip confirmation prompts
- `--dry-run` - Simulate without executing (buyback only)

---

## Converting Your Keypair

If you have a Phantom/Solana JSON keypair file:

```bash
node scripts/keypair-to-base58.js path/to/your-keypair.json
```

This outputs a base58 string to use in `.env`.

---

## Project Structure

```
TURNBACK/
├── src/                 # TypeScript source code
├── dist/                # Compiled JavaScript
├── data/                # Runtime state
├── logs/                # Application logs
├── scripts/             # Helper scripts
├── *.md                 # Documentation
├── env.example          # Configuration template
└── package.json         # Dependencies
```

---

## Safety Features

🛡️ **Minimum Reserve Protection** - Won't spend below MIN_SOL_RESERVE  
🛡️ **Confirmation Prompts** - Asks before financial operations  
🛡️ **Balance Validation** - Checks balances before operations  
🛡️ **Slippage Warnings** - Alerts on high slippage  
🛡️ **Price Impact Alerts** - Warns on large price impact  
🛡️ **Dry-Run Mode** - Test without risk  
🛡️ **Explorer Links** - Verify all transactions on-chain  

---

## Best Practices

### ✅ DO

- Start with small amounts
- Use `--dry-run` for buybacks first
- Check `status` before operations
- Monitor logs regularly
- Keep MIN_SOL_RESERVE reasonable (0.05-0.1 SOL)
- Use dedicated wallet for operations
- Verify recipient addresses carefully

### ❌ DON'T

- Commit `.env` to git
- Share your private key
- Skip confirmation prompts unless certain
- Use all your SOL (keep reserve)
- Ignore slippage warnings
- Execute large trades without testing

---

## Troubleshooting

### Issue: "FEE_WALLET_PRIVATE_KEY is required"

**Solution:** Copy `env.example` to `.env` and fill in your private key.

### Issue: "Insufficient SOL for fees"

**Solution:** Fund your wallet with more SOL.

### Issue: "Jupiter quote failed"

**Solution:** 
- Check RPC connectivity
- Try different RPC with `--rpc` flag
- Verify token mints are correct

### Issue: Build errors

**Solution:**
```bash
npm run clean
npm install
npm run build
```

### Issue: No trades in feed

**Solution:**
- Token may have low activity
- Try removing `--since` filter
- Increase `--limit`

---

## Getting Help

1. **Documentation:** Read [README.md](README.md) thoroughly
2. **Examples:** Check [EXAMPLES.md](EXAMPLES.md) for usage patterns
3. **Logs:** Review `logs/turnbackbot.log` for errors
4. **Testing:** Follow [TESTING.md](TESTING.md) checklist

---

## Next Steps

### For Immediate Use

1. ✅ Complete Quick Setup above
2. ✅ Run `npm start -- status`
3. ✅ Test with `npm start -- feed --mint YOUR_TOKEN --limit 5`
4. ✅ Read [EXAMPLES.md](EXAMPLES.md) for usage patterns

### For Production Deployment

1. ✅ Complete all steps in [TESTING.md](TESTING.md)
2. ✅ Read [DEPLOYMENT.md](DEPLOYMENT.md) thoroughly
3. ✅ Set up monitoring and logging
4. ✅ Test with small amounts first

### For Development

1. ✅ Read [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
2. ✅ Review [FILE_STRUCTURE.md](FILE_STRUCTURE.md)
3. ✅ Explore source code in `src/`
4. ✅ Understand module dependencies

---

## Development Commands

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Run in dev mode (TypeScript directly)
npm run dev -- status

# Clean build artifacts
npm run clean

# Run tests
npm start -- status
```

---

## Key Features

### 1. Manual Fee Claims ✅
Transfer accumulated SOL or SPL tokens with safety checks.

### 2. Manual Buybacks ✅
Execute token buybacks via Jupiter with best routing.

### 3. Trade Feed ✅
Monitor buyers/sellers from on-chain transactions.

### 4. Multiple RPCs ✅
Switch between multiple reliable Solana RPC endpoints.

### 5. Beautiful UI ✅
ASCII art banner, clean logs, color-coded output.

### 6. Production Ready ✅
Retry logic, error handling, comprehensive logging.

---

## Support & Resources

### Documentation
- [Full README](README.md)
- [Quick Start](QUICKSTART.md)
- [Examples](EXAMPLES.md)
- [Deployment](DEPLOYMENT.md)

### Scripts
- Convert keypair: `node scripts/keypair-to-base58.js <file>`

### Logs
- Application logs: `logs/turnbackbot.log`
- View recent: `tail -50 logs/turnbackbot.log`

---

## Security Reminder

⚠️ **IMPORTANT:**
- Never commit `.env` file
- Never share your private key
- Always verify transaction details
- Start with small test amounts
- Use dedicated wallet for operations
- Keep backup of your private key

---

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

## Disclaimer

⚠️ This tool interacts with Solana mainnet and handles real funds. Always test thoroughly with small amounts first. The authors are not responsible for any losses incurred through use of this software.

**USE AT YOUR OWN RISK.**

---

## Ready to Go! 🎉

You're all set! Here's your first command:

```bash
npm start -- status
```

Enjoy using TURNBACKBOT! 🚀

---

**For detailed information, see [README.md](README.md)**
