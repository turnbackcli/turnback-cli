# TURNBACKBOT Usage Examples

Complete examples for all commands with expected outputs.

## Table of Contents

1. [Status Check](#status-check)
2. [Fee Claims](#fee-claims)
3. [Buyback Operations](#buyback-operations)
4. [Trade Feed](#trade-feed)
5. [RPC Switching](#rpc-switching)
6. [Advanced Workflows](#advanced-workflows)

---

## Status Check

### Basic Status

```bash
turnbackbot status
```

**Output:**
```
┌─────────────────────────────────── WALLET STATUS ────────────────────────────────────┐
│                                                                                       │
│   RPC URL: https://lauraine-qytyxk-fast-mainnet.helius-rpc.com/                     │
│                                                                                       │
│   Wallet: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU                              │
│                                                                                       │
│   SOL Balance: 1.2345 SOL                                                            │
│   Min Reserve: 0.0500 SOL                                                            │
│                                                                                       │
│   Input Token (EPjFWdd5...):                                                         │
│     Balance: 500.0000                                                                │
│     Decimals: 6                                                                      │
│                                                                                       │
│   Target Token (TokenMint...):                                                       │
│     Balance: 1234.5678                                                               │
│     Decimals: 9                                                                      │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Fee Claims

### Claim SOL

```bash
turnbackbot claim --mint SOL --amount 0.5 --yes
```

**Output:**
```
┌──────────────────────────────────── CLAIM FEES ───────────────────────────────────────┐
│                                                                                       │
│   Mint: SOL                                                                           │
│   Amount: 0.5                                                                         │
│   To: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU                                  │
│                                                                                       │
│   This will transfer tokens from the fee wallet                                      │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘

● Claim Parameters:
●   Mint: SOL
●   Amount: 0.5
●   From: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
●   To: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
● Sending SOL transfer...
✓ Claim completed

┌──────────────────────────────────── CLAIM SUCCESSFUL ─────────────────────────────────┐
│                                                                                       │
│   Amount: 0.5 SOL                                                                     │
│   Recipient: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU                            │
│                                                                                       │
│   Signature: 5wHu2...xyz123                                                          │
│   Explorer: https://solscan.io/tx/5wHu2...xyz123                                     │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

### Claim SPL Token to Another Wallet

```bash
turnbackbot claim --mint EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v --amount 100 --to GjwcWFQYzemBtpMoFgBzYkUdFSLQP4KxCT8rXJDrqJnp
```

**With Confirmation:**
```
Proceed with claim? (y/N): y
```

---

## Buyback Operations

### Dry Run Buyback

```bash
turnbackbot buyback --amount 50 --dry-run
```

**Output:**
```
┌─────────────────────────────────── BUYBACK SWAP ──────────────────────────────────────┐
│                                                                                       │
│   Input: 50 tokens                                                                    │
│   Input Mint: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v                           │
│   Output Mint: TokenMintAddress123...                                                │
│   Slippage: 100 bps (1.00%)                                                          │
│                                                                                       │
│   DRY RUN MODE                                                                        │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘

● Buyback Parameters:
●   Input Mint: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
●   Output Mint: TokenMintAddress123...
●   Amount: 50
●   Slippage: 100 bps (1.00%)
● Current Balances:
●   SOL: 1.2345
●   Input Token: 500.0000
● Fetching quote from Jupiter...
● Quote Summary:
●   Input: 50 tokens
●   Expected Output: 245.6789 tokens
●   Price Impact: 0.23%
●   Route: 2 step(s)

┌─────────────────────────────────── DRY RUN RESULT ────────────────────────────────────┐
│                                                                                       │
│   Input: 50                                                                           │
│   Expected Output: 245.6789                                                          │
│   Price Impact: 0.23%                                                                │
│                                                                                       │
│   No transaction was executed                                                        │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

### Execute Real Buyback

```bash
turnbackbot buyback --amount 50 --yes
```

**Output:**
```
● Executing buyback swap...
● Fetching swap quote...
● Quote received:
●   In: 50000000 (EPjFWdd5...)
●   Out: 245678900 (TokenMin...)
●   Price Impact: 0.23%
● Building swap transaction...
● Sending swap transaction...
✓ Buyback completed in 3.45s

┌────────────────────────────────── BUYBACK SUCCESSFUL ─────────────────────────────────┐
│                                                                                       │
│   Input: 50 tokens                                                                    │
│   Output: 245.6789 tokens                                                            │
│   Price Impact: 0.23%                                                                │
│                                                                                       │
│   Signature: 4aKd9...abc456                                                          │
│   Explorer: https://solscan.io/tx/4aKd9...abc456                                     │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

### Custom Slippage Buyback

```bash
turnbackbot buyback --amount 100 --slippage 200 --yes
```

**Note:** Higher slippage (2%) for volatile tokens or low liquidity.

---

## Trade Feed

### Basic Feed

```bash
turnbackbot feed --mint TokenMintAddress123 --limit 10
```

**Output:**
```
┌──────────────────────────────────── TRADE FEED ───────────────────────────────────────┐
│                                                                                       │
│   Token: TokenMintAddress123                                                          │
│   Limit: 10                                                                           │
│   Since: all time                                                                     │
│   DEX Filter: all                                                                     │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘

● Fetching trade feed for TokenMin...
● Found 10 trades

────────────────────────────────────────────────────────────────
TIME         SIDE   WALLET       AMOUNT          SOURCE       TX
────────────────────────────────────────────────────────────────
↑ 2m ago       BUY    7xKX...gAsU  123.4567        Jupiter      5wHu...z123
↓ 5m ago       SELL   9pQr...hTe2  456.7890        Raydium      8kLm...a456
↑ 8m ago       BUY    3dFg...pYu7  789.0123        Jupiter      2nBv...c789
↓ 12m ago      SELL   6hJk...mNb4  234.5678        Orca         9xCv...d012
↑ 15m ago      BUY    1aSd...qWe9  567.8901        Jupiter      7mZx...e345
↓ 20m ago      SELL   4gHj...rTy6  890.1234        Pump.fun     3kPo...f678
↑ 25m ago      BUY    8lKj...uIo3  345.6789        Jupiter      6jQw...g901
↓ 30m ago      SELL   2zXc...yPa8  678.9012        Raydium      1bNm...h234
↑ 35m ago      BUY    5vBn...sLk1  901.2345        Unknown      4cDf...i567
↓ 40m ago      SELL   9mKl...fGh0  123.4567        Jupiter      8vXz...j890
────────────────────────────────────────────────────────────────
```

### Recent Trades Only

```bash
turnbackbot feed --mint TokenMintAddress123 --since 30 --limit 20
```

**Shows only trades from the last 30 minutes.**

### Filter by DEX

```bash
turnbackbot feed --mint TokenMintAddress123 --dex jupiter --limit 15
```

**Shows only Jupiter trades.**

---

## RPC Switching

### Use RPC Pool

```bash
turnbackbot status --rpc https://mercuria-fronten-1cd8.mainnet.rpcpool.com/dfacae7d-d474-4d76-abd1-ef8da42a6510
```

### Use Phantom RPC

```bash
turnbackbot buyback --amount 50 --yes --rpc https://solana-mainnet.phantom.app/YBPpkkN4g91xDiAnTE9r0RcMkjg0sKUIWvAfoFVJ?advancedTxSubmission=true
```

**The custom RPC applies to the entire command.**

---

## Advanced Workflows

### Complete Buyback Workflow

```bash
# 1. Check current status
turnbackbot status

# 2. Monitor recent market activity
turnbackbot feed --mint YOUR_TOKEN --limit 25 --since 60

# 3. Test buyback parameters
turnbackbot buyback --amount 100 --dry-run

# 4. Execute buyback if quote looks good
turnbackbot buyback --amount 100 --yes

# 5. Verify new balance
turnbackbot status
```

### Fee Management Workflow

```bash
# 1. Check accumulated fees
turnbackbot status

# 2. Claim fees to treasury wallet
turnbackbot claim --mint TARGET_MINT --amount 500 --to TREASURY_WALLET --yes

# 3. Claim SOL for operational expenses
turnbackbot claim --mint SOL --amount 0.5 --to OPERATIONS_WALLET --yes

# 4. Verify remaining balances
turnbackbot status
```

### Market Analysis Workflow

```bash
# View all-time trades
turnbackbot feed --mint TOKEN --limit 50

# View last hour
turnbackbot feed --mint TOKEN --since 60 --limit 50

# Compare DEX sources
turnbackbot feed --mint TOKEN --dex jupiter --limit 20
turnbackbot feed --mint TOKEN --dex raydium --limit 20

# Monitor recent activity (buyers vs sellers)
turnbackbot feed --mint TOKEN --since 15 --limit 30
```

### Multi-Token Management

```bash
# Check status
turnbackbot status

# Buyback Token A
turnbackbot buyback --amount 50 --in USDC --out TOKEN_A --yes

# Buyback Token B
turnbackbot buyback --amount 50 --in USDC --out TOKEN_B --yes

# Claim Token A fees
turnbackbot claim --mint TOKEN_A --amount 100 --yes

# Claim Token B fees
turnbackbot claim --mint TOKEN_B --amount 100 --yes
```

---

## Error Handling Examples

### Insufficient Balance

```bash
turnbackbot buyback --amount 10000 --yes
```

**Output:**
```
✗ Buyback failed: Insufficient input token balance. Have: 500.0000, Need: 10000
```

### Below Minimum Reserve

```bash
turnbackbot claim --mint SOL --amount 1.3 --yes
```

**Output:**
```
✗ Claim failed: Transfer would leave 0.0345 SOL, below minimum reserve of 0.05 SOL
```

### High Price Impact Warning

```bash
turnbackbot buyback --amount 5000 --dry-run
```

**Output:**
```
● Quote Summary:
●   Input: 5000 tokens
●   Expected Output: 12345.6789 tokens
●   Price Impact: 8.45%
⚠ WARNING: Very high price impact detected!
```

---

## Tips & Tricks

### 1. Always Test First

```bash
# Test with dry-run before real execution
turnbackbot buyback --amount 100 --dry-run
turnbackbot buyback --amount 100 --yes
```

### 2. Monitor Before Executing

```bash
# Check recent trades to understand market conditions
turnbackbot feed --mint TOKEN --since 60 --limit 30
# Then execute buyback based on market activity
turnbackbot buyback --amount 50 --yes
```

### 3. Use Appropriate Slippage

```bash
# Low volatility / high liquidity: 50-100 bps
turnbackbot buyback --amount 100 --slippage 50

# Medium volatility: 100-150 bps (default)
turnbackbot buyback --amount 100

# High volatility / low liquidity: 200+ bps
turnbackbot buyback --amount 100 --slippage 250
```

### 4. Batch Operations Script

Create a bash script `buyback-routine.sh`:

```bash
#!/bin/bash

echo "Starting buyback routine..."

# Check status
npm start -- status

# Get recent trades
npm start -- feed --mint $TOKEN_MINT --since 30

# Execute buyback
npm start -- buyback --amount 50 --yes

# Final status
npm start -- status

echo "Buyback routine complete!"
```

---

**Need more examples?** Check the [README.md](README.md) for detailed documentation.
