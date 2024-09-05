# shardeum-cli

A command line utility to query Shardeum's functions and send transactions

```
Usage: index [options] [command]

Shardeum CLI

Options:
  --debug                                                  Enable debug mode
  -V, --version                                            output the version number
  -h, --help                                               display help for command

Commands:
  set-private-key <key>                                    Set the private key
  set-public-key <key>                                     Set the public key
  get-balance <address>                                    Get balance for an address
  web3-client-version                                      Get web3 client version
  net-version                                              Get network version
  web3-sha3 <data>                                         Get web3 sha3 hash of data
  eth-chain-id                                             Get Ethereum chain ID
  eth-gas-price                                            Get current gas price
  eth-accounts                                             Get list of accounts
  eth-block-number                                         Get latest block number
  eth-get-storage-at <address> <position>                  Get storage at a given address and position
  eth-get-transaction-count <address>                      Get transaction count for an address
  eth-get-block-transaction-count-by-hash <blockHash>      Get transaction count in a block by block hash
  eth-get-block-transaction-count-by-number <blockNumber>  Get transaction count in a block by block number
  eth-send-transaction <to> <value>                        Send a transaction
  eth-call <to> <data>                                     Execute a new message call
  eth-estimate-gas <to> <data>                             Estimate gas for a transaction
  eth-get-block-by-hash <blockHash>                        Get block information by block hash
  eth-get-block-by-number <blockNumber>                    Get block information by block number
  eth-get-transaction-by-hash <txHash>                     Get transaction information by transaction hash
  eth-get-transaction-receipt <txHash>                     Get transaction receipt by transaction hash
  set-rpc-url <url>                                        Set the RPC URL (default: https://atomium.shardeum.org)
  get-rpc-url                                              Get the current RPC URL
  help [command]                                           display help for command

example: 
    npx ts-node src/index.ts eth-gas-price

Benchmark examples:
    npx ts-node src/index.ts eth-gas-price --benchmark 5
    npx ts-node src/index.ts eth-get-block-by-number 1000000 --benchmark 10


Running a benchmark will output the minimum, maximum, p95 and total time taken to execute the command
$ npx ts-node src/index.ts eth-gas-price --benchmark 5
Benchmark results (5 iterations):
Fastest: 50.05ms
Slowest: 80.34ms
P95: 80.34ms
```