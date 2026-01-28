# TURNBACKBOT File Structure

Complete file tree and organization.

```
TURNBACK/
│
├── 📦 Package & Configuration
│   ├── package.json                  # Dependencies & scripts
│   ├── package-lock.json             # Locked dependency versions
│   ├── tsconfig.json                 # TypeScript configuration
│   ├── .gitignore                    # Git ignore rules
│   ├── env.example                   # Environment template
│   └── LICENSE                       # MIT License
│
├── 📚 Documentation
│   ├── README.md                     # Main documentation (comprehensive)
│   ├── QUICKSTART.md                 # 5-minute setup guide
│   ├── EXAMPLES.md                   # Usage examples & scenarios
│   ├── DEPLOYMENT.md                 # Production deployment guide
│   ├── TESTING.md                    # Testing procedures
│   ├── PROJECT_SUMMARY.md            # Project overview
│   └── FILE_STRUCTURE.md             # This file
│
├── 🔧 Scripts
│   └── scripts/
│       └── keypair-to-base58.js      # Convert keypair JSON to base58
│
├── 💾 Data & Logs
│   ├── data/
│   │   └── state.json                # State storage (optional use)
│   └── logs/
│       └── turnbackbot.log           # Application logs (auto-generated)
│
├── 📝 Source Code (TypeScript)
│   └── src/
│       │
│       ├── index.ts                  # 🚀 Entry point
│       │   └── Responsibilities:
│       │       ├── Print banner
│       │       ├── Print warnings
│       │       ├── Validate config
│       │       └── Run CLI
│       │
│       ├── cli.ts                    # 🎯 CLI Commands (Commander)
│       │   └── Commands:
│       │       ├── status            # Show wallet status
│       │       ├── claim             # Manual fee claims
│       │       ├── buyback           # Manual buybacks
│       │       └── feed              # Trade feed
│       │
│       ├── config.ts                 # ⚙️ Configuration
│       │   └── Responsibilities:
│       │       ├── Load .env
│       │       ├── Validate values
│       │       ├── Export config object
│       │       └── Define alternate RPCs
│       │
│       ├── 🔗 solana/                # Solana Blockchain Integration
│       │   │
│       │   ├── connection.ts         # RPC Connection Management
│       │   │   └── Features:
│       │   │       ├── Get/set connection
│       │   │       ├── Retry logic
│       │   │       ├── Test connection
│       │   │       ├── Fallback handling
│       │   │       └── URL masking
│       │   │
│       │   ├── wallet.ts             # Wallet Operations
│       │   │   └── Features:
│       │   │       ├── Load base58 keypair
│       │   │       ├── Cache keypair
│       │   │       ├── Get public key
│       │   │       └── Mask private key
│       │   │
│       │   ├── token.ts              # SPL Token Operations
│       │   │   └── Features:
│       │   │       ├── Get token balance
│       │   │       ├── Get SOL balance
│       │   │       ├── Get decimals
│       │   │       ├── Format amounts
│       │   │       └── Get balance info
│       │   │
│       │   └── tx.ts                 # Transaction Handling
│       │       └── Features:
│       │           ├── Send & confirm tx
│       │           ├── Versioned tx support
│       │           ├── Explorer URL generation
│       │           ├── Shorten signature
│       │           └── Shorten address
│       │
│       ├── 💰 fee/                   # Fee Management
│       │   │
│       │   └── claim.ts              # Fee Claims
│       │       └── Features:
│       │           ├── Claim SOL
│       │           ├── Claim SPL tokens
│       │           ├── Safety checks
│       │           ├── Reserve protection
│       │           └── ATA creation
│       │
│       ├── 🔄 buyback/               # Buyback Operations
│       │   │
│       │   └── buyback.ts            # Buyback Execution
│       │       └── Features:
│       │           ├── Execute buyback
│       │           ├── Balance validation
│       │           ├── Quote preview
│       │           ├── Slippage warnings
│       │           └── Dry-run mode
│       │
│       ├── 🔀 swap/                  # DEX Integration
│       │   │
│       │   └── jupiter.ts            # Jupiter Aggregator
│       │       └── Features:
│       │           ├── Get quote
│       │           ├── Get swap tx
│       │           ├── Execute swap
│       │           ├── Route detection
│       │           └── Price impact
│       │
│       ├── 📡 feed/                  # Trade Feed
│       │   │
│       │   └── tradeFeed.ts          # Trade Detection
│       │       └── Features:
│       │           ├── Fetch signatures
│       │           ├── Parse transactions
│       │           ├── Analyze balances
│       │           ├── Detect buy/sell
│       │           ├── Identify DEX
│       │           └── Format output
│       │
│       ├── 📋 logs/                  # Logging
│       │   │
│       │   └── logger.ts             # Logging System
│       │       └── Features:
│       │           ├── Winston file logs
│       │           ├── Console logs
│       │           ├── Color coding
│       │           ├── Symbol prefixes
│       │           └── Log rotation
│       │
│       ├── 🎨 ui/                    # User Interface
│       │   │
│       │   ├── banner.ts             # ASCII Banner
│       │   │   └── Features:
│       │   │       ├── Figlet ASCII art
│       │   │       ├── Gradient colors
│       │   │       └── Warning banner
│       │   │
│       │   └── pretty.ts             # Pretty Output
│       │       └── Features:
│       │           ├── Boxen boxes
│       │           ├── Tables
│       │           ├── Number formatting
│       │           └── Color helpers
│       │
│       └── 🔧 utils/                 # Utilities
│           │
│           └── retry.ts              # Retry Logic
│               └── Features:
│                   ├── Exponential backoff
│                   ├── Error detection
│                   ├── Retryable check
│                   └── Sleep helper
│
└── 🏗️ Built Output (Auto-generated)
    └── dist/
        ├── index.js                  # Compiled entry point (with shebang)
        ├── cli.js                    # Compiled CLI
        ├── config.js                 # Compiled config
        ├── solana/                   # Compiled Solana modules
        ├── fee/                      # Compiled fee modules
        ├── buyback/                  # Compiled buyback modules
        ├── swap/                     # Compiled swap modules
        ├── feed/                     # Compiled feed modules
        ├── logs/                     # Compiled logging modules
        ├── ui/                       # Compiled UI modules
        ├── utils/                    # Compiled utilities
        └── **/*.d.ts                 # TypeScript declarations
        └── **/*.js.map               # Source maps
```

---

## Module Dependencies

```
index.ts
  └─→ ui/banner.ts
  └─→ cli.ts
      ├─→ solana/connection.ts
      │     └─→ config.ts
      │     └─→ utils/retry.ts
      │     └─→ logs/logger.ts
      ├─→ solana/wallet.ts
      │     └─→ config.ts
      │     └─→ logs/logger.ts
      ├─→ solana/token.ts
      │     └─→ utils/retry.ts
      │     └─→ logs/logger.ts
      ├─→ fee/claim.ts
      │     ├─→ solana/wallet.ts
      │     ├─→ solana/token.ts
      │     ├─→ solana/tx.ts
      │     ├─→ logs/logger.ts
      │     └─→ config.ts
      ├─→ buyback/buyback.ts
      │     ├─→ solana/wallet.ts
      │     ├─→ solana/token.ts
      │     ├─→ swap/jupiter.ts
      │     │     ├─→ config.ts
      │     │     ├─→ logs/logger.ts
      │     │     └─→ utils/retry.ts
      │     ├─→ logs/logger.ts
      │     └─→ config.ts
      ├─→ feed/tradeFeed.ts
      │     ├─→ logs/logger.ts
      │     ├─→ utils/retry.ts
      │     └─→ solana/tx.ts
      └─→ ui/pretty.ts
```

---

## File Sizes (Typical)

```
Source Code (src/):
  index.ts              ~1 KB
  cli.ts                ~10 KB
  config.ts             ~2 KB
  solana/*              ~8 KB total
  fee/*                 ~6 KB total
  buyback/*             ~5 KB total
  swap/*                ~4 KB total
  feed/*                ~7 KB total
  logs/*                ~2 KB total
  ui/*                  ~2 KB total
  utils/*               ~1 KB total
  
  TOTAL:                ~48 KB

Documentation:
  README.md             ~20 KB
  QUICKSTART.md         ~5 KB
  EXAMPLES.md           ~15 KB
  DEPLOYMENT.md         ~15 KB
  TESTING.md            ~12 KB
  PROJECT_SUMMARY.md    ~10 KB
  
  TOTAL:                ~77 KB

Built Output (dist/):
  *.js files            ~80 KB
  *.d.ts files          ~30 KB
  *.map files           ~100 KB
  
  TOTAL:                ~210 KB

Dependencies (node_modules/):
  TOTAL:                ~50 MB (varies)

Total Project Size:     ~50 MB
```

---

## Key Files Explained

### 🔑 Must Edit
- **env.example** → Copy to `.env` and configure

### 🚀 Entry Points
- **src/index.ts** → Main entry point
- **dist/index.js** → Compiled executable (has shebang)

### ⚙️ Configuration
- **config.ts** → Loads and validates .env
- **tsconfig.json** → TypeScript compiler settings
- **package.json** → Dependencies and scripts

### 📖 Documentation
- **README.md** → Start here
- **QUICKSTART.md** → Fast setup
- **EXAMPLES.md** → Usage examples

### 🔧 Scripts
- **scripts/keypair-to-base58.js** → Convert keypair format

### 💾 Runtime
- **data/state.json** → Optional state storage
- **logs/turnbackbot.log** → Application logs

---

## Import Patterns

### Absolute Imports (from root)
```typescript
import { config } from '../config';
import { logger } from '../logs/logger';
```

### Relative Imports (within module)
```typescript
import { loadWallet } from './wallet';
import { getConnection } from './connection';
```

### Third-Party Imports
```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import chalk from 'chalk';
```

---

## Build Process

```
src/ (TypeScript)
  ↓
[tsc compiler]
  ↓
dist/ (JavaScript)
  ├─ *.js         (Executable code)
  ├─ *.d.ts       (Type declarations)
  └─ *.js.map     (Source maps)
```

Commands:
```bash
npm run clean   # Remove dist/
npm run build   # Compile TypeScript
npm start       # Run compiled code
npm run dev     # Run TypeScript directly (dev mode)
```

---

## File Naming Conventions

- **PascalCase**: Not used (all lowercase)
- **camelCase**: File names (connection.ts, tradeFeed.ts)
- **kebab-case**: Scripts (keypair-to-base58.js)
- **UPPERCASE**: Documentation (README.md, LICENSE)

---

## Code Organization Principles

1. **Separation of Concerns**: Each module has one responsibility
2. **Layered Architecture**: CLI → Services → Blockchain
3. **Dependency Injection**: Pass dependencies explicitly
4. **Error Boundaries**: Handle errors at boundaries
5. **Logging**: Comprehensive logging at all levels
6. **Type Safety**: Strict TypeScript throughout

---

## Adding New Features

### New Command
1. Add command handler in `cli.ts`
2. Create business logic in appropriate module
3. Add documentation to README
4. Add examples to EXAMPLES.md
5. Add tests to TESTING.md

### New Module
1. Create file in `src/`
2. Export functions/types
3. Import in relevant files
4. Update this FILE_STRUCTURE.md
5. Document in README

### New Utility
1. Create in `src/utils/`
2. Keep it generic and reusable
3. Add type definitions
4. Use throughout codebase

---

## Generated Files (Don't Edit)

- `dist/**/*` - Auto-generated by TypeScript compiler
- `node_modules/**/*` - Auto-installed by npm
- `package-lock.json` - Auto-managed by npm
- `logs/turnbackbot.log` - Auto-created at runtime
- `*.d.ts` - Auto-generated type declarations
- `*.js.map` - Auto-generated source maps

---

## Version Control (.gitignore)

**Ignored:**
- `node_modules/`
- `dist/`
- `.env` (secrets)
- `logs/` (runtime logs)
- `data/` (runtime state)

**Committed:**
- `src/` (source code)
- `scripts/` (helper scripts)
- `*.md` (documentation)
- `env.example` (template)
- `package.json` (dependencies)
- `tsconfig.json` (config)
- `LICENSE`

---

## File Permissions

### Executable Files
- `dist/index.js` - Has shebang, should be executable
- `scripts/keypair-to-base58.js` - Has shebang

### Regular Files
- All other files - Regular permissions

### On Linux/Mac
```bash
chmod +x dist/index.js
chmod +x scripts/keypair-to-base58.js
```

---

## Disk Usage Monitoring

```bash
# Check project size
du -sh .

# Check by directory
du -sh src/ dist/ node_modules/ logs/ data/

# Check logs size
du -sh logs/

# Clean up (removes dist/ and node_modules/)
npm run clean
rm -rf node_modules
```

---

**File structure is clean, organized, and production-ready! 🎯**
