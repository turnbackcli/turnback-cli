# TURNBACKBOT Deployment Checklist

Production deployment guide for TURNBACKBOT.

## Pre-Deployment Checklist

### 1. Environment Setup

- [ ] Node.js 18+ installed
- [ ] All dependencies installed (`npm install`)
- [ ] TypeScript compiled successfully (`npm run build`)
- [ ] `.env` file configured with production values
- [ ] Private key is base58 encoded
- [ ] Target and input mints are correct
- [ ] RPC endpoint is reliable and funded

### 2. Security Audit

- [ ] `.env` file is NOT committed to git
- [ ] `.gitignore` includes `.env`, `logs/`, `data/`
- [ ] Private key stored securely
- [ ] Wallet funded with minimal SOL (only what's needed)
- [ ] Dedicated wallet for fee operations (not primary wallet)
- [ ] 2FA enabled on any hosting accounts
- [ ] Access logs monitoring enabled

### 3. Configuration Validation

- [ ] `MIN_SOL_RESERVE` is adequate (recommended: 0.05-0.1 SOL)
- [ ] `SLIPPAGE_BPS` is reasonable (50-200 bps)
- [ ] `TARGET_MINT` verified on-chain
- [ ] `INPUT_MINT` verified on-chain
- [ ] `JUPITER_API_KEY` is valid
- [ ] RPC endpoint tested (`turnbackbot status`)
- [ ] Explorer URL matches network

### 4. Testing

- [ ] `status` command works
- [ ] `feed` command returns data
- [ ] `buyback --dry-run` succeeds
- [ ] `claim` with small amount tested
- [ ] `buyback` with small amount tested
- [ ] All logs writing to `logs/turnbackbot.log`
- [ ] Error handling tested (invalid amounts, etc.)

---

## Deployment Options

### Option 1: Local/Development Machine

**Pros:** Simple, direct control
**Cons:** Requires machine to be online

```bash
# Build
npm run build

# Run commands as needed
npm start -- status
npm start -- buyback --amount 50 --yes
```

### Option 2: VPS/Cloud Server

**Recommended for:** Regular operations, uptime requirements

#### Setup on Ubuntu/Debian

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone project
cd /opt
git clone <your-repo> turnbackbot
cd turnbackbot

# Install dependencies
npm install

# Configure
cp env.example .env
nano .env  # Edit with your settings

# Build
npm run build

# Test
npm start -- status

# Set up as systemd service (see below)
```

### Option 3: Docker Container

**Recommended for:** Isolation, reproducibility

#### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

COPY env.example .env

CMD ["node", "dist/index.js", "status"]
```

#### Build and Run

```bash
# Build image
docker build -t turnbackbot .

# Run with environment file
docker run --env-file .env turnbackbot status

# Run buyback
docker run --env-file .env turnbackbot buyback --amount 50 --yes
```

---

## Production Setup

### Systemd Service (Linux)

Create `/etc/systemd/system/turnbackbot.service`:

```ini
[Unit]
Description=TURNBACKBOT Fee Management
After=network.target

[Service]
Type=oneshot
User=turnback
Group=turnback
WorkingDirectory=/opt/turnbackbot
ExecStart=/usr/bin/npm start -- %i
EnvironmentFile=/opt/turnbackbot/.env
StandardOutput=append:/var/log/turnbackbot/stdout.log
StandardError=append:/var/log/turnbackbot/stderr.log

[Install]
WantedBy=multi-user.target
```

Usage:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Run status
sudo systemctl start turnbackbot@status

# Run buyback
sudo systemctl start turnbackbot@"buyback --amount 50 --yes"
```

### Cron Jobs

For scheduled operations:

```bash
# Edit crontab
crontab -e

# Run status check every hour
0 * * * * cd /opt/turnbackbot && npm start -- status >> /var/log/turnbackbot/cron.log 2>&1

# Fetch feed every 30 minutes
*/30 * * * * cd /opt/turnbackbot && npm start -- feed --mint YOUR_TOKEN --limit 20 >> /var/log/turnbackbot/feed.log 2>&1

# Manual note: Buybacks and claims should be manual, not automated
```

---

## Monitoring & Maintenance

### Log Rotation

Configure logrotate at `/etc/logrotate.d/turnbackbot`:

```
/opt/turnbackbot/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 turnback turnback
    sharedscripts
    postrotate
        systemctl reload turnbackbot >/dev/null 2>&1 || true
    endscript
}
```

### Health Checks

Create a health check script `scripts/health-check.sh`:

```bash
#!/bin/bash

echo "TURNBACKBOT Health Check - $(date)"

# Check status
if npm start -- status > /dev/null 2>&1; then
    echo "✓ Status check: OK"
else
    echo "✗ Status check: FAILED"
    exit 1
fi

# Check logs
if [ -f logs/turnbackbot.log ]; then
    echo "✓ Logs: OK"
else
    echo "✗ Logs: MISSING"
    exit 1
fi

# Check recent errors
ERRORS=$(tail -100 logs/turnbackbot.log | grep -c "ERROR")
if [ $ERRORS -gt 5 ]; then
    echo "⚠ Warning: $ERRORS recent errors detected"
fi

echo "Health check complete"
```

### Monitoring Checklist

- [ ] Log rotation configured
- [ ] Disk space monitoring (logs can grow)
- [ ] RPC endpoint uptime monitoring
- [ ] SOL balance alerts (below MIN_RESERVE)
- [ ] Transaction failure alerts
- [ ] Daily status check scheduled

---

## Backup & Recovery

### What to Backup

1. **Critical:**
   - `.env` file (encrypted)
   - Private key (secure vault)

2. **Important:**
   - Configuration files
   - Log files (for audit trail)
   - `data/state.json` (if you extend to track state)

3. **Nice to have:**
   - Transaction history
   - Feed data archives

### Backup Script

```bash
#!/bin/bash

BACKUP_DIR=/backup/turnbackbot/$(date +%Y%m%d)
mkdir -p $BACKUP_DIR

# Encrypt and backup .env
gpg --encrypt --recipient your@email.com .env
cp .env.gpg $BACKUP_DIR/

# Backup logs
tar -czf $BACKUP_DIR/logs.tar.gz logs/

# Backup data
cp -r data/ $BACKUP_DIR/

echo "Backup completed: $BACKUP_DIR"
```

### Recovery Steps

1. Restore `.env` file (decrypt if needed)
2. Verify private key is correct
3. Run `npm install`
4. Run `npm run build`
5. Test with `npm start -- status`
6. Restore logs and data if needed

---

## Security Best Practices

### 1. Wallet Security

- Use a dedicated wallet for fee operations
- Keep only necessary SOL in wallet
- Never share private key
- Use hardware wallet for large operations
- Regularly rotate keys (advanced)

### 2. Access Control

- Limit server access to authorized personnel only
- Use SSH keys (not passwords)
- Enable firewall (ufw/iptables)
- Close unnecessary ports
- Use VPN for remote access

### 3. Monitoring

- Enable transaction alerts
- Monitor unusual activity
- Set up failure notifications
- Review logs daily
- Track all claims and buybacks

### 4. Operational Security

- Always use `--dry-run` first for large amounts
- Verify recipient addresses carefully
- Double-check transaction amounts
- Keep audit trail of all operations
- Document all major transactions

---

## Troubleshooting Production Issues

### Issue: RPC Connection Failures

**Symptoms:** Timeouts, "node is unhealthy"

**Solutions:**
1. Switch RPC with `--rpc` flag
2. Check RPC endpoint status
3. Verify network connectivity
4. Try alternate RPCs from config

### Issue: Transaction Failures

**Symptoms:** "Simulation failed", "blockhash not found"

**Solutions:**
1. Check wallet has sufficient SOL
2. Retry transaction
3. Increase priority fee (Jupiter auto-handles this)
4. Switch RPC endpoint

### Issue: High Price Impact

**Symptoms:** Large slippage, poor execution

**Solutions:**
1. Reduce trade amount
2. Increase slippage tolerance (carefully)
3. Wait for better liquidity
4. Split into multiple smaller trades

### Issue: Out of SOL

**Symptoms:** "Insufficient funds", "below reserve"

**Solutions:**
1. Fund wallet with more SOL
2. Adjust `MIN_SOL_RESERVE` if too high
3. Claim SOL fees: `claim --mint SOL --amount X`

---

## Rollback Procedures

### If something goes wrong:

1. **Stop all operations immediately**
2. **Assess the situation:**
   - Check recent transactions on explorer
   - Review logs for errors
   - Verify wallet balances
3. **Document the issue**
4. **Fix if possible or rollback:**
   - Restore from backup
   - Rebuild from clean state
   - Update configuration
5. **Test thoroughly before resuming**

---

## Performance Tuning

### RPC Selection

- Use geographically close RPC
- Premium RPCs for better reliability
- Load balance across multiple RPCs
- Monitor RPC response times

### Configuration Optimization

```env
# For high-frequency operations
MIN_SOL_RESERVE=0.1

# For volatile tokens
SLIPPAGE_BPS=150

# For better logging
LOG_LEVEL=debug
```

### Resource Usage

- Logs: ~1-5 MB/day typical
- Disk: ~100 MB for app + logs
- Memory: ~50-100 MB during execution
- CPU: Minimal (burst during operations)

---

## Compliance & Auditing

### Transaction Audit Trail

All transactions are logged to:
- `logs/turnbackbot.log` (file)
- Console output (can be redirected)
- On-chain (permanent record)

### Recommended Practices

1. Keep all logs for at least 1 year
2. Document all manual operations
3. Maintain change log for configuration
4. Regular security audits
5. Periodic key rotation

---

## Support & Escalation

### Self-Help Resources

1. Check [README.md](README.md)
2. Review [EXAMPLES.md](EXAMPLES.md)
3. Check logs in `logs/turnbackbot.log`
4. Test with `--dry-run`

### Emergency Contacts

- [ ] Define on-call personnel
- [ ] Escalation procedure
- [ ] Emergency wallet access procedure
- [ ] Critical incident playbook

---

## Post-Deployment Verification

After deployment, verify:

```bash
# 1. Status works
turnbackbot status

# 2. Can fetch feed
turnbackbot feed --mint YOUR_TOKEN --limit 5

# 3. Dry run succeeds
turnbackbot buyback --amount 1 --dry-run

# 4. Logs are writing
ls -lh logs/
tail -f logs/turnbackbot.log

# 5. All commands available
turnbackbot --help
```

---

## Checklist: Ready for Production

- [ ] All pre-deployment checks passed
- [ ] Tested on staging/testnet
- [ ] Wallet funded appropriately
- [ ] Monitoring configured
- [ ] Backups automated
- [ ] Documentation reviewed
- [ ] Team trained on operations
- [ ] Emergency procedures documented
- [ ] First transaction successful
- [ ] Logs verified

---

**You're ready to deploy! 🚀**

Remember: Start small, monitor closely, scale gradually.
