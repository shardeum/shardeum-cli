import { Command } from "commander"
import { createPublicClient, createWalletClient, http, formatEther, parseEther, parseGwei } from "viem"
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts"
import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import Table from "cli-table3"
import pc from 'picocolors'  // Replace chalk import

const CONFIG_DIR = path.join(os.homedir(), ".shardeum-cli")
const CONFIG_PATH = path.join(CONFIG_DIR, "config")

// Utility functions
const truncateString = (str: string, maxLength: number = 122): string => {
    return str.length > (maxLength - 2) ? `${str.substring(0, maxLength)}..` : str
}

const formatOutput = (data: any): void => {
    const table = new Table({
        head: ["Property", "Value"],
    })

    const formatValue = (value: any): string => {
        if (typeof value === "string") return truncateString(value)
        if (typeof value === "bigint") return value.toString()
        if (typeof value === "object" && value !== null) {
            // Convert any BigInt properties to strings in objects
            return JSON.stringify(value, (_, v) => 
                typeof v === "bigint" ? v.toString() : v
            )
        }
        return JSON.stringify(value)
    }

    if (typeof data === "object") {
        Object.entries(data).forEach(([key, value]) => {
            table.push([key, formatValue(value)])
        })
    } else {
        table.push(["Result", formatValue(data)])
    }
    
    console.log(table.toString())
}

const handleError = (error: any): void => {
    const table = new Table({
        head: ["Error Detail", "Value"],
        colWidths: [30, 120],
    })

    table.push(
        ["Message", error.message || "Unknown error"],
        ["Code", error.code || "N/A"],
        ["Reason", error.reason || "N/A"],
        ["Details", error.details || "N/A"]
    )

    console.error(table.toString())
}

// Configuration management
const loadConfig = (): { rpcUrl: string; privateKey: string } => {
    const defaultConfig = { rpcUrl: "https://atomium.shardeum.org", privateKey: "" }
    if (!fs.existsSync(CONFIG_PATH)) return defaultConfig
    try {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"))
    } catch {
        return defaultConfig
    }
}

const saveConfig = (config: Partial<{ rpcUrl: string; privateKey: string }>): void => {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
    const currentConfig = loadConfig()
    const newConfig = { ...currentConfig, ...config }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2))
}

// CLI Program
const program = new Command()

// Configuration commands
program
    .command("config:set-rpc")
    .description("Set RPC URL")
    .argument("<url>", "RPC URL")
    .action((url) => {
        saveConfig({ rpcUrl: url })
        formatOutput({ status: "RPC URL updated", url })
    })

program
    .command("config:set-key")
    .description("Set private key")
    .argument("<key>", "Private key")
    .action((key) => {
        saveConfig({ privateKey: key })
        formatOutput({ status: "Private key updated" })
    })

// Ethereum JSON-RPC commands
program
    .command("eth:blockNumber")
    .description("Get the latest block number")
    .action(async () => {
        try {
            const config = loadConfig()
            const client = createPublicClient({ transport: http(config.rpcUrl) })
            const result = await client.getBlockNumber()
            formatOutput({ blockNumber: result.toString() })
        } catch (error) {
            handleError(error)
        }
    })

program
    .command("eth:getBalance")
    .description("Get balance for an address")
    .argument("<address>", "Ethereum address")
    .action(async (address) => {
        try {
            const config = loadConfig()
            const client = createPublicClient({ transport: http(config.rpcUrl) })
            const balance = await client.getBalance({ address })
            formatOutput({
                address,
                balance: formatEther(balance),
            })
        } catch (error) {
            handleError(error)
        }
    })

// eth_getStorageAt
program
    .command("eth:getStorageAt")
    .description("Get storage value at address and position")
    .argument("<address>", "Contract address")
    .argument("<position>", "Storage position")
    .action(async (address, position) => {
        try {
            const config = loadConfig()
            const client = createPublicClient({ transport: http(config.rpcUrl) })
            const storage = await client.getStorageAt({ address, slot: position })
            formatOutput({ address, position, storage })
        } catch (error) {
            handleError(error)
        }
    })

// eth_getTransactionCount
program
    .command("eth:getTransactionCount")
    .description("Get transaction count for address")
    .argument("<address>", "Account address")
    .action(async (address) => {
        try {
            const config = loadConfig()
            const client = createPublicClient({ transport: http(config.rpcUrl) })
            const count = await client.getTransactionCount({ address })
            formatOutput({ address, transactionCount: count.toString() })
        } catch (error) {
            handleError(error)
        }
    })

// eth_getCode
program
    .command("eth:getCode")
    .description("Get code at address")
    .argument("<address>", "Contract address")
    .action(async (address) => {
        try {
            const config = loadConfig()
            const client = createPublicClient({ transport: http(config.rpcUrl) })
            const code = await client.getBytecode({ address })
            formatOutput({ address, code })
        } catch (error) {
            handleError(error)
        }
    })

// eth_call
program
    .command("eth:call")
    .description("Execute contract call")
    .requiredOption("-t, --to <address>", "Contract address")
    .requiredOption("-d, --data <data>", "Call data")
    .option("-f, --from <address>", "From address")
    .action(async (options) => {
        try {
            const config = loadConfig()
            const client = createPublicClient({ transport: http(config.rpcUrl) })
            const result = await client.call({
                to: options.to,
                data: options.data,
                ...(options.from && { from: options.from }),
            })
            formatOutput({ result: result.data })
        } catch (error) {
            handleError(error)
        }
    })

// eth_estimateGas
program
    .command("eth:estimateGas")
    .description("Estimate gas for transaction")
    .requiredOption("-t, --to <address>", "To address")
    .requiredOption("-d, --data <data>", "Transaction data")
    .option("-f, --from <address>", "From address")
    .option("-v, --value <value>", "Value in wei")
    .action(async (options) => {
        try {
            const config = loadConfig()
            const client = createPublicClient({ transport: http(config.rpcUrl) })
            const gasEstimate = await client.estimateGas({
                to: options.to,
                data: options.data,
                ...(options.from && { from: options.from }),
                ...(options.value && { value: BigInt(options.value) }),
            })
            formatOutput({ gasEstimate: gasEstimate.toString() })
        } catch (error) {
            handleError(error)
        }
    })

// Block and Transaction related commands
program
    .command("eth:getBlockTransactionCountByHash")
    .description("Get block transaction count by hash")
    .argument("<hash>", "Block hash")
    .action(async (hash) => {
        try {
            const config = loadConfig()
            const client = createPublicClient({ transport: http(config.rpcUrl) })
            const count = await client.request({
                method: "eth_getBlockTransactionCountByHash",
                params: [hash],
            })
            formatOutput({ blockHash: hash, transactionCount: Number(count) })
        } catch (error) {
            handleError(error)
        }
    })



// Add remaining block and transaction commands
const blockCommands = [
    {
        name: "eth:getBlockByHash",
        description: "Get block by hash",
        method: "getBlock",
        params: (hash: string) => ({ blockHash: hash }),
    },
    {
        name: "eth:getBlockByNumber",
        description: "Get block by number",
        method: "getBlock",
        params: (number: string) => ({ blockNumber: BigInt(number) }),
    },
    {
        name: "eth:getTransactionByHash",
        description: "Get transaction by hash",
        method: "getTransaction",
        params: (hash: string) => ({ hash }),
    },
]

blockCommands.forEach(({ name, description, method, params }) => {
    program
        .command(name)
        .description(description)
        .argument("<value>", "Hash or block number")
        .action(async (value) => {
            try {
                const config = loadConfig()
                const client = createPublicClient({ transport: http(config.rpcUrl) })
                const result = await (client as any)[method](params(value))
                formatOutput(result)
            } catch (error) {
                handleError(error)
            }
        })
})

// Network and utility commands
program
    .command("web3:clientVersion")
    .description("Get client version")
    .action(async () => {
        try {
            const config = loadConfig()
            const client = createPublicClient({ transport: http(config.rpcUrl) })
            const version = await client.request({ method: "web3_clientVersion" })
            formatOutput({ clientVersion: version })
        } catch (error) {
            handleError(error)
        }
    })

program
    .command("web3:sha3")
    .description("Calculate Keccak-256 hash")
    .argument("<data>", "Data to hash")
    .action(async (data) => {
        try {
            const config = loadConfig()
            const client = createPublicClient({ transport: http(config.rpcUrl) })
            const hash = await client.request({
                method: "web3_sha3",
                params: [data],
            })
            formatOutput({ input: data, hash })
        } catch (error) {
            handleError(error)
        }
    })

program
    .command("net:version")
    .description("Get network version")
    .action(async () => {
        try {
            const config = loadConfig()
            const client = createPublicClient({ transport: http(config.rpcUrl) })
            const version = await client.request({ method: "net_version" })
            formatOutput({ networkVersion: version })
        } catch (error) {
            handleError(error)
        }
    })

program
    .command("eth:protocolVersion")
    .description("Get Ethereum protocol version")
    .action(async () => {
        try {
            const config = loadConfig()
            const client = createPublicClient({ transport: http(config.rpcUrl) })
            const version = await client.request({ method: "eth_protocolVersion" })
            formatOutput({ protocolVersion: version })
        } catch (error) {
            handleError(error)
        }
    })

program
    .command("eth:sendTransaction")
    .description("Send a transaction")
    .requiredOption("-t, --to <address>", "To address")
    .option("-v, --value <value>", "Value in ether")
    .option("-d, --data <data>", "Transaction data")
    .option("-g, --gas <limit>", "Gas limit")
    .option("-p, --gasPrice <price>", "Gas price in gwei")
    .option("-n, --nonce <nonce>", "Nonce value")
    .action(async (options) => {
        try {
            const config = loadConfig()
            if (!config.privateKey) {
                throw new Error("Private key not configured. Use config:set-key to set it.")
            }

            const account = privateKeyToAccount(`0x${config.privateKey.replace("0x", "")}`)
            const client = createWalletClient({
                account,
                transport: http(config.rpcUrl)
            })

            const transaction = {
                to: options.to,
                ...(options.value && { value: parseEther(options.value) }),
                ...(options.data && { data: options.data }),
                ...(options.gas && { gas: BigInt(options.gas) }),
                ...(options.gasPrice && { gasPrice: parseGwei(options.gasPrice) }),
                ...(options.nonce && { nonce: Number(options.nonce) })
            }

            const hash = await client.sendTransaction(transaction)
            formatOutput({
                transactionHash: hash,
                from: account.address,
                ...transaction,
                ...(transaction.value && { 
                    value: `${options.value} ETH (${transaction.value.toString()} wei)`
                })
            })
        } catch (error) {
            handleError(error)
        }
    })

// Add these utility functions before the CLI commands
interface TestStats {
    sendTransaction: { success: number; error: number };
    getTransactionCount: { success: number; error: number };
    getBalance: { success: number; error: number };
    blockNumber: { success: number; error: number };
    getTransactionByHash: { success: number; error: number };
}

const createTestAccounts = () => {
    return Array(4).fill(0).map(() => {
        const privateKey = generatePrivateKey()
        return privateKeyToAccount(privateKey)
    })
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface QueuedRequest {
    type: keyof TestStats;
    operation: () => Promise<void>;
}

const updateStats = (stats: TestStats, lines: number) => {
    // Find the longest key length for padding
    const maxKeyLength = Math.max(...Object.keys(stats).map(k => k.length))
    
    process.stdout.write(`\x1b[${lines - 1}A\x1b[0J`)
    console.log("Test Progress:")
    Object.entries(stats).forEach(([key, value]) => {
        const paddedKey = key.padEnd(maxKeyLength)
        const successText = pc.green(value.success.toString())
        const errorText = pc.red(value.error.toString())
        console.log(`${paddedKey}: ${successText} / ${errorText}`)
    })
}

// Add this before the test:network command
interface AccountNonce {
    [address: string]: number;
}

const initializeNonces = async (
    client: ReturnType<typeof createPublicClient>,
    accounts: ReturnType<typeof privateKeyToAccount>[]
): Promise<AccountNonce> => {
    const nonces: AccountNonce = {};
    await Promise.all(
        accounts.map(async (account) => {
            nonces[account.address] = await client.getTransactionCount({
                address: account.address,
            });
        })
    );
    return nonces;
};

// Add the test command
program
    .command("test:network")
    .description("Run network test")
    .requiredOption("-t, --tps <number>", "Transactions per second")
    .requiredOption("-d, --duration <seconds>", "Test duration in seconds")
    .action(async (options) => {
        try {
            const config = loadConfig()
            if (!config.privateKey) {
                throw new Error("Private key not configured")
            }

            const tps = parseInt(options.tps)
            const duration = parseInt(options.duration)
            const requestsPerTick = Math.ceil(tps / 4)
            const mainAccount = privateKeyToAccount(`0x${config.privateKey.replace("0x", "")}`)
            const testAccounts = createTestAccounts()
            const client = createPublicClient({ transport: http(config.rpcUrl) })
            const walletClient = createWalletClient({
                account: mainAccount,
                transport: http(config.rpcUrl),
            })

            // Initialize test accounts with some funds
            console.log("\n=== Initializing Test Accounts ===")
            for (const account of testAccounts) {
                try {
                    const hash = await walletClient.sendTransaction({
                        to: account.address,
                        value: parseEther("0.01"),
                        chain: null,
                    })
                    console.log(`Funded ${account.address} (tx: ${hash})`)
                    await wait(1000) // Wait for transaction to be processed
                } catch (error) {
                    console.error(`Failed to fund ${account.address}:`, error)
                }
            }

            // Rest of initialization code remains the same...
            console.log("\n=== Initializing Nonces ===")
            const nonceManager = new NonceManager();
            await nonceManager.initialize(client, [...testAccounts, mainAccount]);

            console.log("\n=== Starting Network Test ===")
            // ...existing logging code...

            const stats: TestStats = {
                sendTransaction: { success: 0, error: 0 },
                getTransactionCount: { success: 0, error: 0 },
                getBalance: { success: 0, error: 0 },
                blockNumber: { success: 0, error: 0 },
                getTransactionByHash: { success: 0, error: 0 }
            }

            // Initialize display
            Object.entries(stats).forEach(() => console.log())
            const statsLines = Object.keys(stats).length + 2

            let lastStatsUpdate = Date.now()
            const startTime = Date.now()
            const endTime = startTime + (duration * 1000)

            // Modified request execution
            while (Date.now() < endTime) {
                const batchPromises = []
                for (let i = 0; i < requestsPerTick; i++) {
                    const targetAccount = testAccounts[Math.floor(Math.random() * testAccounts.length)]
                    const senderAccount = testAccounts[Math.floor(Math.random() * testAccounts.length)]
                    const operations: QueuedRequest[] = []

                    // Add a transaction
                    operations.push({
                        type: 'sendTransaction' as keyof TestStats,
                        operation: async () => {
                            const senderClient = createWalletClient({
                                account: senderAccount,
                                transport: http(config.rpcUrl),
                            })
                            const nonce = await nonceManager.getNextNonce(senderAccount.address)
                            await senderClient.sendTransaction({
                                to: targetAccount.address,
                                value: parseEther("0.0001"),
                                chain: null,
                                nonce
                            })
                        }
                    })

                    // Add a random additional operation
                    const op = Math.floor(Math.random() * 4)
                    switch (op) {
                        case 0:
                            operations.push({
                                type: 'getTransactionCount' as keyof TestStats,
                                operation: () => client.getTransactionCount({ address: targetAccount.address }).then(() => {})
                            })
                            break
                        case 1:
                            operations.push({
                                type: 'getBalance' as keyof TestStats,
                                operation: () => client.getBalance({ address: targetAccount.address }).then(() => {})
                            })
                            break
                        case 2:
                            operations.push({
                                type: 'blockNumber' as keyof TestStats,
                                operation: () => client.getBlockNumber().then(() => {})
                            })
                            break
                        case 3:
                            operations.push({
                                type: 'getTransactionByHash' as keyof TestStats,
                                operation: async () => {
                                    const senderClient = createWalletClient({
                                        account: senderAccount,
                                        transport: http(config.rpcUrl),
                                    })
                                    const nonce = await nonceManager.getNextNonce(senderAccount.address)
                                    const hash = await senderClient.sendTransaction({
                                        to: targetAccount.address,
                                        value: parseEther("0.0001"),
                                        chain: null,
                                        nonce
                                    })
                                    await client.getTransaction({ hash })
                                }
                            })
                            break
                    }

                    // Execute operations
                    for (const { type, operation } of operations) {
                        batchPromises.push(
                            operation()
                                .then(() => { stats[type].success++ })
                                .catch(() => { stats[type].error++ })
                        )
                    }
                }

                // Wait for batch to complete
                await Promise.allSettled(batchPromises)

                // Update stats display
                const now = Date.now()
                if (now - lastStatsUpdate >= 1000) {
                    updateStats(stats, statsLines)
                    lastStatsUpdate = now
                }

                // Add small delay to prevent overwhelming the node
                await wait(250)
            }

            // Rest of cleanup code remains the same...
            console.log("\n=== Test Complete ===")
            console.log("Returning balances to main account...")

            // Return balances
            for (const account of testAccounts) {
                try {
                    const balance = await client.getBalance({ address: account.address })
                    if (balance > 0) {
                        const gasPrice = await client.getGasPrice()
                        const gasLimit = 21000
                        const gasCost = gasPrice * BigInt(gasLimit)
                        const transferAmount = balance - gasCost

                        if (transferAmount > 0) {
                            const nonce = await nonceManager.getNextNonce(account.address)
                            const hash = await walletClient.sendTransaction({
                                to: mainAccount.address,
                                value: transferAmount,
                                account,
                                chain: null,
                                nonce
                            })
                            console.log(`Returned ${formatEther(transferAmount)} ETH from ${account.address}`)
                        }
                    }
                } catch (error) {
                    if (error instanceof Error) {
                        console.error(`Failed to return balance from ${account.address}:`, error.message)
                    } else {
                        console.error(`Failed to return balance from ${account.address}:`, error)
                    }
                }
            }

            const finalBalance = await client.getBalance({ address: mainAccount.address })
            console.log(`\nMain account final balance: ${formatEther(finalBalance)} ETH`)

        } catch (error) {
            handleError(error)
        }
    })

program.parse(process.argv)

class NonceManager {
    private nonces: { [address: string]: number } = {};
    private locks: { [address: string]: Promise<void> } = {};

    async initialize(client: ReturnType<typeof createPublicClient>, accounts: ReturnType<typeof privateKeyToAccount>[]) {
        await Promise.all(accounts.map(async (account) => {
            this.nonces[account.address] = await client.getTransactionCount({
                address: account.address,
            });
            this.locks[account.address] = Promise.resolve();
        }));
    }

    async getNextNonce(address: string): Promise<number> {
        // Wait for any pending operations on this address
        await this.locks[address];
        
        // Create a new lock
        let resolveLock!: () => void;
        const newLock = new Promise<void>(resolve => { resolveLock = resolve; });
        this.locks[address] = newLock;

        try {
            const nonce = this.nonces[address]++;
            return nonce;
        } finally {
            resolveLock();
        }
    }
}
