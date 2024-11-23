# shardeum-cli

A command line utility to query Shardeum's functions and send transactions
## Installation

```bash
# Build from source
npm run build
npm start
# run with 
npm start <command>

# Or install globally
npm run build
npm link
# run with
shardeum-cli <command>
```
```
Usage: index [options] [command]

Options:
  -h, --help                                 display help for command

Commands:
  config:set-rpc <url>                       Set RPC URL
  config:set-key <key>                       Set private key
  eth:blockNumber                            Get the latest block number
  eth:getBalance <address>                   Get balance for an address
  eth:getStorageAt <address> <position>      Get storage value at address and position
  eth:getTransactionCount <address>          Get transaction count for address
  eth:getCode <address>                      Get code at address
  eth:call [options]                         Execute contract call
  eth:estimateGas [options]                  Estimate gas for transaction
  eth:getBlockTransactionCountByHash <hash>  Get block transaction count by hash
  eth:getBlockByHash <value>                 Get block by hash
  eth:getBlockByNumber <value>               Get block by number
  eth:getTransactionByHash <value>           Get transaction by hash
  web3:clientVersion                         Get client version
  web3:sha3 <data>                           Calculate Keccak-256 hash
  net:version                                Get network version
  eth:protocolVersion                        Get Ethereum protocol version
  eth:sendTransaction [options]              Send a transaction
  test:network [options]                     Run network test
  shm:stake [options]                        Stake SHM tokens
  shm:unstake [options]                      Unstake SHM tokens
  help [command]                             display help for command

```
