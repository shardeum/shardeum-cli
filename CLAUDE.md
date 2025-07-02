# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shardeum CLI is a command-line utility for interacting with the Shardeum blockchain. It provides commands for querying blockchain data and sending transactions via Ethereum JSON-RPC methods.

## Development Commands

### Building and Running
```bash
# Build TypeScript to JavaScript
npm run build

# Run the CLI from source
npm start <command>

# Install globally for development
npm run build && npm link
shardeum-cli <command>
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage report
npm test:coverage

# Run a specific test
npm test test/index.test.ts
```

### Code Quality
```bash
# Check code formatting
npm run format-check

# Fix code formatting
npm run format-fix
```

## Architecture

### Core Structure
- **src/index.ts**: Main entry point containing all CLI commands and logic
  - Configuration management (RPC URL, private key storage)
  - Command definitions using Commander.js
  - Client initialization with viem library
  - Error handling and output formatting

### Key Dependencies
- **viem**: Modern Ethereum library for blockchain interactions
- **commander**: CLI framework for command parsing
- **cli-table3**: Table formatting for command output
- **picocolors**: Terminal color output

### Configuration Storage
- Config files stored in `~/.shardeum-cli/config`
- JSON format storing `rpcUrl` and `privateKey`
- Default RPC URL: `https://atomium.shardeum.org`

### Command Categories
1. **Configuration**: `config:set-rpc`, `config:set-key`
2. **Ethereum RPC**: `eth:*` commands for blockchain queries
3. **Web3 Utilities**: `web3:*` commands for utilities
4. **Network**: `net:*` commands for network info
5. **Testing**: `test:network` for load testing

### Code Style
- Prettier formatting with:
  - Single quotes
  - No semicolons
  - 120 character line width
  - ES5 trailing commas
- TypeScript strict mode enabled
- Target: ES2016

## Testing Approach
- Jest with ts-jest for TypeScript support
- Test files in `test/` directory
- Coverage reports in `coverage/` directory
- Isolated modules mode for faster test execution