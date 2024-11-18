import { Command } from "commander"
import { createPublicClient, createWalletClient, http, formatEther, parseEther, parseGwei } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import Table from "cli-table3"

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

program.parse(process.argv)
