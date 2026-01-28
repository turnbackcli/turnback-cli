# TURNBACKBOT

Production-ready Node.js CLI tool for Solana token projects to manually claim creator fees and execute buybacks with integrated trade feed monitoring.

## Features

- **Manual Fee Claims**: Transfer accumulated fees (SOL or SPL tokens) with safety checks
- **Manual Buybacks**: Execute token buybacks via Jupiter aggregator with best routing
- **Trade Feed**: Monitor recent buyers and sellers from on-chain transactions
- **Multiple RPC Support**: Switch between Helius, RPC Pool, and Phantom RPCs
- **Beautiful CLI**: Gradient banner, clean logs, and elegant output
- **Production Ready**: Retry logic, error handling, and comprehensive logging
- **Safety First**: Minimum SOL reserve protection, slippage warnings, and confirmation prompts

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- A Solana wallet with base58 private key
- Jupiter API key (provided)

### Setup

```bash
# Clone or download the project
cd turnbackbot

# Install dependencies
npm install

# Copy environment configuration
cp env.example .env

# Edit .env with your configuration
nano .env

# Build the project
npm run build

# Link for global use (optional)
npm link
```

## Configuration

Edit the `.env` file with your settings:

```env
# RPC Configuration (optional - defaults to Helius)
RPC_URL=https://lauraine-qytyxk-fast-mainnet.helius-rpc.com/

# Fee Wallet (base58 encoded private key)
FEE_WALLET_PRIVATE_KEY=your_base58_private_key_here

# Token Configuration
TARGET_MINT=TokenMintAddressHere
# INPUT_MINT: Token to swap FROM (default: SOL - Wrapped SOL)
# So11111111111111111111111111111111111111112 = SOL (Wrapped SOL)
# EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v = USDC
INPUT_MINT=So11111111111111111111111111111111111111112

# Trading Parameters
SLIPPAGE_BPS=100
MIN_SOL_RESERVE=0.05
DEFAULT_BUYBACK_AMOUNT=100

# Jupiter API
JUPITER_API_BASE=https://quote-api.jup.ag
JUPITER_API_KEY=e5029ac2-5c57-43a4-bcfa-cfe4da70cbd4

# Explorer
EXPLORER_BASE_URL=https://solscan.io

# Logging
LOG_LEVEL=info
TRADE_FEED_DEFAULT_LIMIT=20
```

### Configuration Parameters

- **RPC_URL**: Solana RPC endpoint (defaults to Helius if not set)
- **FEE_WALLET_PRIVATE_KEY**: Base58 encoded private key for the fee wallet
- **TARGET_MINT**: Token mint address to buy back
- **INPUT_MINT**: Token to spend for buybacks (usually USDC or WSOL)
- **SLIPPAGE_BPS**: Maximum slippage in basis points (100 = 1%)
- **MIN_SOL_RESERVE**: Minimum SOL to keep in wallet for transaction fees
- **DEFAULT_BUYBACK_AMOUNT**: Default amount for buyback operations
- **JUPITER_API_KEY**: API key for Jupiter aggregator
- **EXPLORER_BASE_URL**: Block explorer base URL for transaction links
- **LOG_LEVEL**: Logging verbosity (debug/info/warn/error)
- **TRADE_FEED_DEFAULT_LIMIT**: Default number of trades to fetch in feed

## Usage

### Status Command

Check wallet balances and configuration:

```bash
turnbackbot status
```

Output shows:
- Current RPC URL
- Wallet public key
- SOL balance and minimum reserve
- Input token balance (for buybacks)
- Target token balance

### Claim Command

Manually claim accumulated fees:

```bash
# Claim SOL
turnbackbot claim --mint SOL --amount 0.5

# Claim SOL to another wallet
turnbackbot claim --mint SOL --amount 0.5 --to <recipient_pubkey>

# Claim SPL tokens
turnbackbot claim --mint <TOKEN_MINT> --amount 100

# Skip confirmation prompt
turnbackbot claim --mint SOL --amount 0.2 --yes
```

**Options:**
- `--mint <address>`: Token mint address or "SOL" for native SOL
- `--amount <number>`: Amount to transfer
- `--to <address>`: Recipient address (optional, defaults to fee wallet)
- `--yes`: Skip confirmation prompt

**Safety Features:**
- Validates sufficient balance before transfer
- Ensures MIN_SOL_RESERVE is maintained
- Creates recipient token account if needed
- Confirmation prompt (unless --yes is used)

### Buyback Command

Execute manual buyback via Jupiter:

```bash
# Basic buyback using config defaults
turnbackbot buyback --amount 100

# Specify input/output tokens
turnbackbot buyback --amount 100 --in <USDC_MINT> --out <TARGET_MINT>

# Custom slippage
turnbackbot buyback --amount 100 --slippage 200

# Dry run (simulate without executing)
turnbackbot buyback --amount 100 --dry-run

# Skip confirmation
turnbackbot buyback --amount 100 --yes
```

**Options:**
- `--amount <number>`: Amount of input token to swap
- `--in <mint>`: Input token mint (defaults to INPUT_MINT from config)
- `--out <mint>`: Output token mint (defaults to TARGET_MINT from config)
- `--slippage <bps>`: Slippage in basis points (defaults to config)
- `--dry-run`: Simulate without executing transaction
- `--yes`: Skip confirmation prompt

**Safety Features:**
- Validates sufficient balance
- Ensures MIN_SOL_RESERVE is maintained
- Displays quote with expected output and price impact
- Warns on high slippage (>200 bps) or price impact (>1%)
- Confirmation prompt (unless --yes or --dry-run)

### Feed Command

Monitor recent buyers and sellers:

```bash
# Show recent trades
turnbackbot feed --mint <TARGET_MINT>

# Show 50 most recent trades
turnbackbot feed --mint <TARGET_MINT> --limit 50

# Show trades from last hour
turnbackbot feed --mint <TARGET_MINT> --since 60

# Filter by DEX
turnbackbot feed --mint <TARGET_MINT> --dex jupiter
```

**Options:**
- `--mint <address>`: Token mint address to monitor
- `--limit <number>`: Number of trades to display (default: 20)
- `--since <minutes>`: Only show trades from last N minutes
- `--dex <name>`: Filter by DEX (auto|jupiter|raydium|orca|pump)

**Output:**
- Time ago (relative)
- Side (BUY ↑ / SELL ↓)
- Wallet address (shortened)
- Token amount delta
- DEX source (Jupiter, Raydium, Orca, Pump.fun, or Unknown)
- Transaction signature (shortened)

### RPC Switching

Use a different RPC for any command:

```bash
# Use alternate RPC for status check
turnbackbot status --rpc https://mercuria-fronten-1cd8.mainnet.rpcpool.com/...

# Use Phantom RPC for buyback
turnbackbot buyback --amount 100 --rpc https://solana-mainnet.phantom.app/...
```

Available RPCs:
1. Default Helius: `https://lauraine-qytyxk-fast-mainnet.helius-rpc.com/`
2. RPC Pool: `https://mercuria-fronten-1cd8.mainnet.rpcpool.com/dfacae7d-d474-4d76-abd1-ef8da42a6510`
3. Phantom: `https://solana-mainnet.phantom.app/YBPpkkN4g91xDiAnTE9r0RcMkjg0sKUIWvAfoFVJ?advancedTxSubmission=true`

## Trade Feed Detection

The trade feed analyzes on-chain transactions to identify buyers and sellers:

### How It Works

1. **Fetch Transactions**: Retrieves recent signatures for the token mint
2. **Parse Transactions**: Gets parsed transaction data with token balance changes
3. **Analyze Changes**: Compares pre/post token balances to determine:
   - **Buyer**: Wallet that increased token balance
   - **Seller**: Wallet that decreased token balance
4. **Detect DEX**: Identifies the DEX/router from program IDs and logs
5. **Filter & Format**: Applies filters and displays in readable table

### Supported DEXs

- Jupiter (v4 & v6)
- Raydium (v4 & CLMM)
- Orca (Whirlpool)
- Pump.fun

### Limitations

- **Best-effort detection**: Some complex transactions may be misattributed
- **Pure transfers excluded**: Only swap-like transactions are included
- **Mint/burn events filtered**: Focus is on trading activity
- **Unknown routes**: Transactions not matching known DEXs labeled "Unknown"
- **Rate limits**: Large limits may be slow due to RPC rate limiting
- **Recent transactions only**: Limited to recent blockchain history

## Logging

### Console Logs

Clean, elegant console output with:
- Color-coded messages (blue info, green success, yellow warning, red error)
- Transaction links with explorer URLs
- Boxed summaries for important operations
- Trade feed with formatted tables

### File Logs

Structured JSON logs written to `logs/turnbackbot.log`:
- Timestamps for all operations
- Full error details and stack traces
- Transaction signatures and metadata
- Rotation: 5 files × 10MB each

## Security

### Best Practices

- **Private Key**: Never commit `.env` file or share private keys
- **Mainnet Warning**: Banner displayed on every run
- **Masked Secrets**: Private keys and RPC URLs are masked in logs
- **Confirmation Prompts**: Required for all financial operations (unless --yes)
- **Balance Checks**: Validates sufficient funds before operations
- **Reserve Protection**: MIN_SOL_RESERVE ensures funds for future fees

### Recommendations

1. Use a dedicated wallet for fee operations
2. Start with `--dry-run` to test buybacks
3. Set conservative slippage limits
4. Monitor logs for any anomalies
5. Test on devnet/testnet before mainnet
6. Keep Node.js and dependencies updated

## Development

### Run in Development Mode

```bash
npm run dev status
npm run dev -- buyback --amount 10 --dry-run
```

### Build

```bash
npm run build
```

### Clean Build

```bash
npm run clean
npm run build
```

## Architecture

```
src/
├── index.ts              # Entry point, banner, initialization
├── cli.ts                # Commander CLI commands
├── config.ts             # Configuration loading & validation
├── solana/
│   ├── connection.ts     # RPC connection with retry
│   ├── wallet.ts         # Keypair loading (base58)
│   ├── token.ts          # ATA, balances, token operations
│   └── tx.ts             # Transaction sending & confirmation
├── fee/
│   └── claim.ts          # Fee claim logic (SOL & SPL)
├── buyback/
│   └── buyback.ts        # Buyback execution logic
├── swap/
│   └── jupiter.ts        # Jupiter quote & swap integration
├── feed/
│   └── tradeFeed.ts      # Trade feed detection & formatting
├── logs/
│   └── logger.ts         # Winston file logs + pretty console
├── ui/
│   ├── banner.ts         # ASCII banner with gradient
│   └── pretty.ts         # Boxen tables & formatting
└── utils/
    └── retry.ts          # Retry logic with backoff
```

## Troubleshooting

### "FEE_WALLET_PRIVATE_KEY is required"

Ensure `.env` file exists and contains a valid base58 private key.

### "Insufficient SOL for fees"

Wallet SOL balance is below MIN_SOL_RESERVE + transaction fees. Add more SOL.

### "Jupiter quote failed"

- Check RPC connectivity
- Verify token mints are correct
- Ensure sufficient liquidity exists for the swap
- Try with a different RPC using `--rpc`

### "No recent transactions found"

- Token may have low trading activity
- Try increasing `--limit`
- Remove `--since` filter to see all historical trades

### RPC Timeout Errors

- Switch to alternate RPC using `--rpc` flag
- Check RPC endpoint is accessible
- Retry logic will automatically handle temporary failures

## License

MIT

## Support

For issues or questions:
1. Check this README thoroughly
2. Review logs in `logs/turnbackbot.log`
3. Test with `--dry-run` flag first
4. Verify configuration in `.env`

---

**⚠️ DISCLAIMER**: This tool interacts with Solana mainnet and handles real funds. Always test thoroughly with small amounts first. The authors are not responsible for any losses incurred through use of this software.
