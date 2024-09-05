#!/usr/bin/env node

const SHARDEUM_RPC_URL = "https://atomium.shardeum.org"

/*
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

example: npx ts-node src/index.ts eth-gas-price

Benchmark examples:
  npx ts-node src/index.ts eth-gas-price --benchmark 5
  npx ts-node src/index.ts eth-get-block-by-number 1000000 --benchmark 10
*/

import { program } from "commander"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import Web3 from "web3"
import Table from "cli-table3"
import dotenv from "dotenv"
import { performance } from "perf_hooks"

dotenv.config()

const configDir = path.join(os.homedir(), ".shardeum-cli")
const configFile = path.join(configDir, "config")

if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir)
}

let web3: Web3

function initWeb3() {
    const rpcUrl = getConfig("rpcUrl") || SHARDEUM_RPC_URL
    web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl))
}

function saveConfig(key: string, value: string) {
    let config: any = {}
    if (fs.existsSync(configFile)) {
        config = JSON.parse(fs.readFileSync(configFile, "utf8"))
    }
    config[key] = value
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2))
}

function getConfig(key: string): string | undefined {
    if (fs.existsSync(configFile)) {
        const config = JSON.parse(fs.readFileSync(configFile, "utf8"))
        return config[key]
    }
    return undefined
}

function displayResult(result: any) {
    const table = new Table()
    if (typeof result === "object") {
        Object.entries(result).forEach(([key, value]) => {
            table.push([key.toString(), value?.toString() ?? ""])
        })
    } else {
        table.push(["Result", result?.toString() ?? ""])
    }
    console.log(table.toString())
}

// Add this color utility object
const colors = {
    red: (text: string) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
    cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
    gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
}

let debugMode = false

program.option("--debug", "Enable debug mode").hook("preAction", (thisCommand) => {
    debugMode = thisCommand.opts().debug
})

function handleError(error: any) {
    console.error(colors.red("Error occurred:"))
    if (error.cause) {
        console.error(colors.yellow(`  Code: ${error.cause.code}`))
        console.error(colors.yellow(`  Message: ${error.cause.message}`))
    } else {
        console.error(colors.yellow(`  ${error.message || "Unknown error"}`))
    }
    if (error.request) {
        console.error(colors.cyan("Request details:"))
        console.error(colors.cyan(`  Method: ${error.request.method}`))
        console.error(colors.cyan(`  Params: ${JSON.stringify(error.request.params)}`))
    }
    if (debugMode) {
        console.error(colors.gray("Stack trace:"))
        console.error(colors.gray(error.stack))
    } else {
        console.error(colors.gray("For more details, run with --debug flag"))
    }
}

async function runBenchmark(fn: () => Promise<any>, iterations: number) {
    const times: number[] = []
    for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        try {
            await fn()
            const end = performance.now()
            times.push(end - start)
        } catch (error) {
            handleError(error)
            return // Exit the benchmark if an error occurs
        }
    }
    times.sort((a, b) => a - b)
    const fastest = times[0]
    const slowest = times[times.length - 1]
    const p95 = times[Math.floor(times.length * 0.95)]

    console.log(`Benchmark results (${iterations} iterations):`)
    console.log(`Fastest: ${fastest.toFixed(2)}ms`)
    console.log(`Slowest: ${slowest.toFixed(2)}ms`)
    console.log(`P95: ${p95.toFixed(2)}ms`)
}

function parseBenchmarkOption(): number | undefined {
    const benchmarkIndex = process.argv.indexOf("--benchmark")
    if (benchmarkIndex > -1 && benchmarkIndex < process.argv.length - 1) {
        const iterations = parseInt(process.argv[benchmarkIndex + 1])
        if (!isNaN(iterations)) {
            // Remove the benchmark option and its value from argv
            process.argv.splice(benchmarkIndex, 2)
            return iterations
        }
    }
    return undefined
}

const benchmarkIterations = parseBenchmarkOption()

program.version("1.0.0").description("Shardeum CLI")

program
    .command("set-private-key <key>")
    .description("Set the private key")
    .action((key) => {
        saveConfig("privateKey", key)
        console.log("Private key saved.")
    })

program
    .command("set-public-key <key>")
    .description("Set the public key")
    .action((key) => {
        saveConfig("publicKey", key)
        console.log("Public key saved.")
    })

program
    .command("get-balance <address>")
    .description("Get balance for an address")
    .action(async (address) => {
        initWeb3()
        const fn = async () => {
            try {
                const balance = await web3.eth.getBalance(address)
                if (!benchmarkIterations) {
                    displayResult({ address, balance: web3.utils.fromWei(balance, "ether") + " SHM" })
                }
            } catch (error) {
                handleError(error)
            }
        }

        if (benchmarkIterations) {
            await runBenchmark(fn, benchmarkIterations)
        } else {
            await fn()
        }
    })

program
    .command("web3-client-version")
    .description("Get web3 client version")
    .action(async () => {
        initWeb3()
        const fn = async () => {
            try {
                const version = await web3.eth.getNodeInfo()
                if (!benchmarkIterations) {
                    displayResult({ version })
                }
            } catch (error) {
                handleError(error)
            }
        }

        if (benchmarkIterations) {
            await runBenchmark(fn, benchmarkIterations)
        } else {
            await fn()
        }
    })

program
    .command("net-version")
    .description("Get network version")
    .action(async () => {
        initWeb3()
        const fn = async () => {
            try {
                const version = await web3.eth.net.getId()
                if (!benchmarkIterations) {
                    displayResult({ version })
                }
            } catch (error) {
                handleError(error)
            }
        }

        if (benchmarkIterations) {
            await runBenchmark(fn, benchmarkIterations)
        } else {
            await fn()
        }
    })

program
    .command("web3-sha3 <data>")
    .description("Get web3 sha3 hash of data")
    .action((data) => {
        initWeb3()
        const fn = async () => {
            try {
                const hash = web3.utils.sha3(data)
                if (!benchmarkIterations) {
                    displayResult({ hash })
                }
            } catch (error) {
                handleError(error)
            }
        }

        if (benchmarkIterations) {
            runBenchmark(fn, benchmarkIterations)
        } else {
            fn()
        }
    })

program
    .command("eth-chain-id")
    .description("Get Ethereum chain ID")
    .action(async () => {
        initWeb3()
        const fn = async () => {
            try {
                const chainId = await web3.eth.getChainId()
                if (!benchmarkIterations) {
                    displayResult({ chainId })
                }
            } catch (error) {
                handleError(error)
            }
        }

        if (benchmarkIterations) {
            await runBenchmark(fn, benchmarkIterations)
        } else {
            await fn()
        }
    })

program
    .command("eth-gas-price")
    .description("Get current gas price")
    .action(async () => {
        initWeb3()
        const fn = async () => {
            try {
                const gasPrice = await web3.eth.getGasPrice()
                if (!benchmarkIterations) {
                    displayResult({ gasPrice: web3.utils.fromWei(gasPrice, "gwei") + " Gwei" })
                }
            } catch (error) {
                handleError(error)
            }
        }

        if (benchmarkIterations) {
            await runBenchmark(fn, benchmarkIterations)
        } else {
            await fn()
        }
    })

program
    .command("eth-accounts")
    .description("Get list of accounts")
    .action(async () => {
        initWeb3()
        const fn = async () => {
            try {
                const accounts = await web3.eth.getAccounts()
                if (!benchmarkIterations) {
                    displayResult({ accounts })
                }
            } catch (error) {
                handleError(error)
            }
        }

        if (benchmarkIterations) {
            await runBenchmark(fn, benchmarkIterations)
        } else {
            await fn()
        }
    })

program
    .command("eth-block-number")
    .description("Get latest block number")
    .action(async () => {
        initWeb3()
        const fn = async () => {
            try {
                const blockNumber = await web3.eth.getBlockNumber()
                if (!benchmarkIterations) {
                    displayResult({ blockNumber })
                }
            } catch (error) {
                handleError(error)
            }
        }

        if (benchmarkIterations) {
            await runBenchmark(fn, benchmarkIterations)
        } else {
            await fn()
        }
    })

program
    .command("eth-get-storage-at <address> <position>")
    .description("Get storage at a given address and position")
    .action(async (address, position) => {
        initWeb3()
        const fn = async () => {
            try {
                const storage = await web3.eth.getStorageAt(address, position)
                if (!benchmarkIterations) {
                    displayResult({ address, position, storage })
                }
            } catch (error) {
                handleError(error)
            }
        }

        if (benchmarkIterations) {
            await runBenchmark(fn, benchmarkIterations)
        } else {
            await fn()
        }
    })

program
    .command("eth-get-transaction-count <address>")
    .description("Get transaction count for an address")
    .action(async (address) => {
        initWeb3()
        const fn = async () => {
            try {
                const count = await web3.eth.getTransactionCount(address)
                if (!benchmarkIterations) {
                    displayResult({ address, transactionCount: count })
                }
            } catch (error) {
                handleError(error)
            }
        }

        if (benchmarkIterations) {
            await runBenchmark(fn, benchmarkIterations)
        } else {
            await fn()
        }
    })

program
    .command("eth-get-block-transaction-count-by-hash <blockHash>")
    .description("Get transaction count in a block by block hash")
    .action(async (blockHash) => {
        initWeb3()
        const fn = async () => {
            try {
                const count = await web3.eth.getBlockTransactionCount(blockHash)
                if (!benchmarkIterations) {
                    displayResult({ blockHash, transactionCount: count })
                }
            } catch (error) {
                handleError(error)
            }
        }

        if (benchmarkIterations) {
            await runBenchmark(fn, benchmarkIterations)
        } else {
            await fn()
        }
    })

program
    .command("eth-get-block-transaction-count-by-number <blockNumber>")
    .description("Get transaction count in a block by block number")
    .action(async (blockNumber) => {
        initWeb3()
        const fn = async () => {
            try {
                const count = await web3.eth.getBlockTransactionCount(blockNumber)
                if (!benchmarkIterations) {
                    displayResult({ blockNumber, transactionCount: count })
                }
            } catch (error) {
                handleError(error)
            }
        }

        if (benchmarkIterations) {
            await runBenchmark(fn, benchmarkIterations)
        } else {
            await fn()
        }
    })

program
    .command("eth-send-transaction <to> <value>")
    .description("Send a transaction")
    .action(async (to, value) => {
        initWeb3()
        const fn = async () => {
            try {
                const privateKey = getConfig("privateKey")
                if (!privateKey) {
                    console.error("Private key not set. Use set-private-key command first.")
                    return
                }
                const account = web3.eth.accounts.privateKeyToAccount(privateKey)
                web3.eth.accounts.wallet.add(account)
                web3.eth.defaultAccount = account.address

                const tx = {
                    from: account.address,
                    to,
                    value: web3.utils.toWei(value, "ether"),
                    gas: 21000,
                }

                const receipt = await web3.eth.sendTransaction(tx)
                if (!benchmarkIterations) {
                    displayResult(receipt)
                }
            } catch (error) {
                handleError(error)
            }
        }

        if (benchmarkIterations) {
            await runBenchmark(fn, benchmarkIterations)
        } else {
            await fn()
        }
    })

program
    .command("eth-call <to> <data>")
    .description("Execute a new message call")
    .action(async (to, data) => {
        initWeb3()
        const fn = async () => {
            try {
                const result = await web3.eth.call({ to, data })
                if (!benchmarkIterations) {
                    displayResult({ result })
                }
            } catch (error) {
                handleError(error)
            }
        }

        if (benchmarkIterations) {
            await runBenchmark(fn, benchmarkIterations)
        } else {
            await fn()
        }
    })

program
    .command("eth-estimate-gas <to> <data>")
    .description("Estimate gas for a transaction")
    .action(async (to, data) => {
        initWeb3()
        const fn = async () => {
            try {
                const gasEstimate = await web3.eth.estimateGas({ to, data })
                if (!benchmarkIterations) {
                    displayResult({ gasEstimate })
                }
            } catch (error) {
                handleError(error)
            }
        }

        if (benchmarkIterations) {
            await runBenchmark(fn, benchmarkIterations)
        } else {
            await fn()
        }
    })

program
    .command("eth-get-block-by-hash <blockHash>")
    .description("Get block information by block hash")
    .action(async (blockHash) => {
        initWeb3()
        const fn = async () => {
            try {
                const block = await web3.eth.getBlock(blockHash)
                if (!benchmarkIterations) {
                    displayResult(block)
                }
            } catch (error) {
                handleError(error)
            }
        }

        if (benchmarkIterations) {
            await runBenchmark(fn, benchmarkIterations)
        } else {
            await fn()
        }
    })

program
    .command("eth-get-block-by-number <blockNumber>")
    .description("Get block information by block number")
    .action(async (blockNumber) => {
        initWeb3()
        const fn = async () => {
            try {
                const block = await web3.eth.getBlock(blockNumber)
                if (!benchmarkIterations) {
                    displayResult(block)
                }
            } catch (error) {
                handleError(error)
            }
        }

        if (benchmarkIterations) {
            await runBenchmark(fn, benchmarkIterations)
        } else {
            await fn()
        }
    })

program
    .command("eth-get-transaction-by-hash <txHash>")
    .description("Get transaction information by transaction hash")
    .action(async (txHash) => {
        initWeb3()
        const fn = async () => {
            try {
                const tx = await web3.eth.getTransaction(txHash)
                if (!benchmarkIterations) {
                    displayResult(tx)
                }
            } catch (error) {
                handleError(error)
            }
        }

        if (benchmarkIterations) {
            await runBenchmark(fn, benchmarkIterations)
        } else {
            await fn()
        }
    })

program
    .command("eth-get-transaction-receipt <txHash>")
    .description("Get transaction receipt by transaction hash")
    .action(async (txHash) => {
        initWeb3()
        const fn = async () => {
            try {
                const receipt = await web3.eth.getTransactionReceipt(txHash)
                if (!benchmarkIterations) {
                    displayResult(receipt)
                }
            } catch (error) {
                handleError(error)
            }
        }

        if (benchmarkIterations) {
            await runBenchmark(fn, benchmarkIterations)
        } else {
            await fn()
        }
    })

program
    .command("set-rpc-url <url>")
    .description("Set the RPC URL (default: " + SHARDEUM_RPC_URL + ")")
    .action((url) => {
        saveConfig("rpcUrl", url)
        console.log(`RPC URL set to: ${url}`)
    })

// Add this near the end of the file, before program.parse(process.argv)
program
    .command("get-rpc-url")
    .description("Get the current RPC URL")
    .action(() => {
        const rpcUrl = getConfig("rpcUrl") || SHARDEUM_RPC_URL
        console.log(`Current RPC URL: ${rpcUrl}`)
    })

program.parse(process.argv)
