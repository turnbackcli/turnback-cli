# TURNBACKBOT Testing Guide

Comprehensive testing procedures for TURNBACKBOT.

## Pre-Testing Setup

### 1. Environment Preparation

```bash
# Install dependencies
npm install

# Build project
npm run build

# Verify build
ls -la dist/
```

### 2. Configuration

Create a test `.env` file:

```env
# Use devnet/testnet for initial testing (update RPC and mints accordingly)
# Or use mainnet with SMALL amounts

RPC_URL=https://lauraine-qytyxk-fast-mainnet.helius-rpc.com/
FEE_WALLET_PRIVATE_KEY=your_test_wallet_base58_key
TARGET_MINT=your_test_token_mint
INPUT_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
SLIPPAGE_BPS=100
MIN_SOL_RESERVE=0.05
DEFAULT_BUYBACK_AMOUNT=1
JUPITER_API_BASE=https://quote-api.jup.ag
JUPITER_API_KEY=e5029ac2-5c57-43a4-bcfa-cfe4da70cbd4
EXPLORER_BASE_URL=https://solscan.io
LOG_LEVEL=debug
TRADE_FEED_DEFAULT_LIMIT=20
```

### 3. Test Wallet Setup

- [ ] Create dedicated test wallet
- [ ] Fund with small amount of SOL (0.1-0.5 SOL)
- [ ] Fund with small amount of test tokens
- [ ] Convert keypair to base58 if needed

```bash
node scripts/keypair-to-base58.js path/to/test-keypair.json
```

---

## Unit Testing Checklist

### Configuration Module

- [ ] Loads environment variables correctly
- [ ] Validates public keys
- [ ] Uses defaults when optional values missing
- [ ] Throws errors for missing required values

**Test:**
```bash
# Missing required var
rm .env
npm start -- status  # Should fail with clear error

# Restore .env
cp .env.backup .env
```

### Connection Module

- [ ] Establishes connection to RPC
- [ ] Retries on transient failures
- [ ] Switches RPC when specified
- [ ] Masks RPC URLs in logs

**Test:**
```bash
# Test default RPC
npm start -- status

# Test alternate RPC
npm start -- status --rpc https://mercuria-fronten-1cd8.mainnet.rpcpool.com/dfacae7d-d474-4d76-abd1-ef8da42a6510
```

### Wallet Module

- [ ] Loads base58 private key
- [ ] Caches keypair
- [ ] Masks private key in logs
- [ ] Returns correct public key

**Test:**
```bash
npm start -- status
# Verify wallet pubkey displayed
# Check logs/turnbackbot.log - private key should NOT appear
```

### Token Module

- [ ] Fetches SOL balance
- [ ] Fetches SPL token balance
- [ ] Fetches token decimals
- [ ] Handles non-existent token accounts (returns 0)
- [ ] Formats token amounts correctly

**Test:**
```bash
npm start -- status
# Verify all balances display correctly
```

---

## Integration Testing

### Status Command

```bash
# Basic status
npm start -- status

# With custom RPC
npm start -- status --rpc https://solana-mainnet.phantom.app/YBPpkkN4g91xDiAnTE9r0RcMkjg0sKUIWvAfoFVJ?advancedTxSubmission=true
```

**Verify:**
- [ ] Displays wallet address
- [ ] Shows SOL balance
- [ ] Shows input token balance
- [ ] Shows target token balance
- [ ] Shows RPC URL
- [ ] Shows min reserve
- [ ] Output is formatted nicely in a box

### Feed Command

```bash
# Basic feed
npm start -- feed --mint YOUR_TOKEN_MINT --limit 10

# With time filter
npm start -- feed --mint YOUR_TOKEN_MINT --since 60 --limit 20

# With DEX filter
npm start -- feed --mint YOUR_TOKEN_MINT --dex jupiter --limit 15
```

**Verify:**
- [ ] Displays trades in table format
- [ ] Shows BUY/SELL correctly
- [ ] Shows wallet addresses (shortened)
- [ ] Shows token amounts
- [ ] Shows DEX source
- [ ] Shows transaction signatures
- [ ] Shows time ago
- [ ] Green for BUY, red for SELL
- [ ] Handles no trades gracefully

### Claim Command - Dry Run

```bash
# Note: No actual dry-run flag for claim, so use smallest amount possible
npm start -- claim --mint SOL --amount 0.001
# Cancel when prompted (type 'n')
```

**Verify:**
- [ ] Shows claim parameters
- [ ] Validates mint address
- [ ] Validates amount
- [ ] Checks SOL balance
- [ ] Prompts for confirmation
- [ ] Cancels when declined

### Claim Command - Real (Small Amount)

```bash
# Claim tiny amount of SOL
npm start -- claim --mint SOL --amount 0.001 --yes

# Claim SPL token to self
npm start -- claim --mint YOUR_TOKEN_MINT --amount 0.01 --yes
```

**Verify:**
- [ ] Transaction succeeds
- [ ] Signature displayed
- [ ] Explorer link shown
- [ ] Balance updated (check with status)
- [ ] Logs written to file
- [ ] No errors in logs

### Buyback Command - Dry Run

```bash
npm start -- buyback --amount 1 --dry-run
```

**Verify:**
- [ ] Fetches quote successfully
- [ ] Shows input/output amounts
- [ ] Shows price impact
- [ ] Shows route info
- [ ] Shows slippage
- [ ] No transaction executed
- [ ] Displays "DRY RUN" clearly

### Buyback Command - Real (Small Amount)

```bash
# Test with smallest amount possible
npm start -- buyback --amount 0.1 --yes

# Test with custom slippage
npm start -- buyback --amount 0.1 --slippage 150 --yes
```

**Verify:**
- [ ] Quote fetched successfully
- [ ] Shows expected output
- [ ] Transaction executes
- [ ] Signature displayed
- [ ] Explorer link shown
- [ ] Balance updated
- [ ] Logs complete transaction details

---

## Error Handling Tests

### Insufficient Balance

```bash
# Try to claim more than you have
npm start -- claim --mint SOL --amount 999 --yes
```

**Expected:** Error message about insufficient balance

### Below Minimum Reserve

```bash
# Try to claim almost all SOL
# Calculate: your_sol_balance - 0.01
npm start -- claim --mint SOL --amount <LARGE_AMOUNT> --yes
```

**Expected:** Error about falling below MIN_SOL_RESERVE

### Invalid Address

```bash
npm start -- claim --mint SOL --amount 0.001 --to invalid_address --yes
```

**Expected:** Error about invalid recipient address

### Invalid Amount

```bash
npm start -- buyback --amount -5 --yes
npm start -- buyback --amount abc --yes
```

**Expected:** Error about invalid amount

### Missing Configuration

```bash
# Temporarily remove required env var
# (Backup .env first)
grep -v "FEE_WALLET_PRIVATE_KEY" .env > .env.tmp
mv .env .env.backup
mv .env.tmp .env

npm start -- status

# Restore
mv .env.backup .env
```

**Expected:** Clear error about missing FEE_WALLET_PRIVATE_KEY

### RPC Failure

```bash
# Use invalid RPC
npm start -- status --rpc https://invalid.rpc.endpoint.com
```

**Expected:** Error message about RPC connection failure

### High Slippage Warning

```bash
npm start -- buyback --amount 1 --slippage 500 --dry-run
```

**Expected:** Warning about high slippage (5%)

---

## Performance Tests

### Concurrent Commands

**Test:** Run multiple status checks simultaneously

```bash
# Terminal 1
npm start -- status

# Terminal 2 (immediately)
npm start -- status

# Terminal 3 (immediately)
npm start -- status
```

**Verify:**
- [ ] All complete successfully
- [ ] No race conditions
- [ ] Logs don't interfere

### Large Feed Requests

```bash
npm start -- feed --mint YOUR_TOKEN --limit 50
```

**Verify:**
- [ ] Completes in reasonable time (<10s)
- [ ] Doesn't timeout
- [ ] Returns correct number of trades
- [ ] Memory usage acceptable

### Rapid Sequential Operations

```bash
npm start -- status
npm start -- feed --mint YOUR_TOKEN --limit 5
npm start -- status
npm start -- buyback --amount 0.1 --dry-run
npm start -- status
```

**Verify:**
- [ ] All commands succeed
- [ ] No cache corruption
- [ ] Consistent results

---

## Security Tests

### Private Key Protection

```bash
# Run any command
npm start -- status

# Check logs
cat logs/turnbackbot.log | grep -i "private"
cat logs/turnbackbot.log | grep "$YOUR_PRIVATE_KEY"
```

**Verify:**
- [ ] Private key NEVER appears in logs
- [ ] Private key NEVER in console output
- [ ] Only masked versions shown

### Confirmation Prompts

```bash
# Run without --yes flag
npm start -- claim --mint SOL --amount 0.001

# Type 'n' when prompted
```

**Verify:**
- [ ] Prompt appears
- [ ] Declines correctly
- [ ] No transaction executed
- [ ] Clear cancellation message

### Balance Protection

```bash
# Try to violate MIN_SOL_RESERVE
npm start -- claim --mint SOL --amount <ALL_SOL_MINUS_0.01>
```

**Verify:**
- [ ] Rejected with clear error
- [ ] No transaction attempted
- [ ] Explains the safety rule

---

## Stress Tests

### Many Feed Fetches

```bash
for i in {1..10}; do
  npm start -- feed --mint YOUR_TOKEN --limit 20
  echo "Iteration $i complete"
done
```

**Verify:**
- [ ] All complete successfully
- [ ] No memory leaks
- [ ] Consistent performance

### Long-Running Session

```bash
# Run multiple commands over 30+ minutes
npm start -- status
# Wait 5 minutes
npm start -- feed --mint YOUR_TOKEN --limit 10
# Wait 10 minutes
npm start -- status
# etc.
```

**Verify:**
- [ ] No degradation
- [ ] Logs rotate properly
- [ ] Connection remains stable

---

## Log Validation

### Console Logs

**Check for:**
- [ ] Clean, elegant formatting
- [ ] Appropriate colors
- [ ] Clear symbols (●✓⚠✗▸↑↓)
- [ ] No excessive verbosity
- [ ] Aligned output
- [ ] Readable spacing

### File Logs

```bash
# Check log file
cat logs/turnbackbot.log | tail -50

# Check JSON format
cat logs/turnbackbot.log | jq '.' | tail -20
```

**Verify:**
- [ ] Valid JSON format
- [ ] Timestamps present
- [ ] Log levels correct
- [ ] Transaction IDs logged
- [ ] Errors fully captured
- [ ] No duplicate entries

---

## Platform Testing

### Windows

```powershell
# PowerShell
npm start -- status
npm start -- feed --mint YOUR_TOKEN --limit 5
```

**Verify:**
- [ ] Banner displays correctly
- [ ] Colors work (if terminal supports)
- [ ] Paths resolve correctly
- [ ] All commands work

### Linux/macOS

```bash
npm start -- status
npm start -- feed --mint YOUR_TOKEN --limit 5
```

**Verify:**
- [ ] Banner displays correctly
- [ ] Colors work
- [ ] All commands work
- [ ] Permissions correct

---

## Regression Testing

After any code changes:

1. [ ] Build succeeds: `npm run build`
2. [ ] No TypeScript errors
3. [ ] Status command works
4. [ ] Feed command works
5. [ ] Claim dry-run works
6. [ ] Buyback dry-run works
7. [ ] Logs writing correctly
8. [ ] No new linter errors

---

## User Acceptance Testing

### Scenario 1: New User Setup

```bash
# Simulate new user
rm -rf node_modules dist logs data
npm install
cp env.example .env
# Edit .env with test values
npm run build
npm start -- status
```

**Success Criteria:**
- [ ] Setup is straightforward
- [ ] Error messages are helpful
- [ ] Documentation is clear
- [ ] First run succeeds

### Scenario 2: Daily Operations

```bash
npm start -- status
npm start -- feed --mint YOUR_TOKEN --since 60
npm start -- buyback --amount 10 --dry-run
npm start -- buyback --amount 10 --yes
```

**Success Criteria:**
- [ ] Workflow is smooth
- [ ] Output is informative
- [ ] No unexpected errors
- [ ] Performance is good

### Scenario 3: Error Recovery

```bash
# Cause an error (invalid RPC)
npm start -- status --rpc https://invalid.url

# Try again with valid RPC
npm start -- status
```

**Success Criteria:**
- [ ] Error message is clear
- [ ] Recovery is simple
- [ ] No persistent issues
- [ ] State is clean

---

## Production Readiness Checklist

Before deploying to production:

### Code Quality
- [ ] All tests pass
- [ ] No linter errors
- [ ] TypeScript strict mode enabled
- [ ] Error handling comprehensive
- [ ] Logging complete

### Security
- [ ] Private keys protected
- [ ] Confirmation prompts work
- [ ] Balance checks enforce limits
- [ ] No secrets in logs
- [ ] .env in .gitignore

### Documentation
- [ ] README complete
- [ ] QUICKSTART tested
- [ ] EXAMPLES accurate
- [ ] DEPLOYMENT verified
- [ ] All links work

### Performance
- [ ] Response times acceptable
- [ ] Memory usage reasonable
- [ ] No memory leaks
- [ ] Handles failures gracefully
- [ ] Retry logic works

### Usability
- [ ] Banner displays correctly
- [ ] Logs are clear and elegant
- [ ] Error messages helpful
- [ ] Output is well-formatted
- [ ] Help text complete

---

## Sign-Off

### Testing Complete

- [ ] All unit tests passed
- [ ] All integration tests passed
- [ ] All error handling tests passed
- [ ] Security tests passed
- [ ] Performance acceptable
- [ ] Documentation accurate
- [ ] Ready for production

**Tested By:** _________________  
**Date:** _________________  
**Version:** 1.0.0  
**Status:** ☐ PASS  ☐ FAIL  
**Notes:**

---

## Continuous Testing

### Daily Checks (Production)

```bash
# Run health check
npm start -- status

# Check recent logs
tail -50 logs/turnbackbot.log

# Verify disk space
df -h
```

### Weekly Checks

- [ ] Review all logs for errors
- [ ] Verify RPC endpoints still working
- [ ] Check for npm package updates
- [ ] Test backup/restore procedure
- [ ] Review security best practices

### Monthly Checks

- [ ] Full regression test
- [ ] Review and rotate logs
- [ ] Update dependencies
- [ ] Security audit
- [ ] Documentation review

---

**Testing is complete when all checklist items are verified! ✅**
