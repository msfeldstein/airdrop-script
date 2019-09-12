const StellarSdk = require("stellar-sdk");
const chalk = require("chalk");
const waitKey = require("./wait-key");
const TransactionMiddleware = require("./transaction-middleware");
const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");

const { addOperation, submitTransaction } = TransactionMiddleware(msg =>
	console.log(chalk.green(msg))
);

class Anchor {
	constructor() {}

	async init() {
		this.pair = StellarSdk.Keypair.random();
		this.log("Creating Issuer account " + this.pair.publicKey());
		await server.friendbot(this.pair.publicKey()).call();
	}

	async request(destinationAccountId, amount) {
		const intermediatePair = StellarSdk.Keypair.random();
		const intermediateKey = intermediatePair.publicKey();
		this.log("> Generated intermediate account " + intermediateKey);
		const asset = this.asset();
		const issuerAccount = await server.loadAccount(this.accountId());
		const { p90_accepted_fee: fee } = await server.feeStats();
		const txBuilder = new StellarSdk.TransactionBuilder(issuerAccount, {
			fee,
			networkPassphrase: StellarSdk.Networks.TESTNET
		});
		addOperation(txBuilder, "createAccount", {
			destination: intermediateKey,
			startingBalance: "4" // 2.00006 because.... ?
		});
		addOperation(txBuilder, "changeTrust", {
			asset,
			amount,
			source: intermediateKey
		});
		addOperation(txBuilder, "payment", {
			destination: intermediateKey,
			asset,
			amount
		});
		addOperation(txBuilder, "setOptions", {
			source: intermediateKey,
			masterWeight: 0,
			signer: {
				ed25519PublicKey: destinationAccountId,
				weight: 1
			}
		});
		const tx = txBuilder.setTimeout(100).build();
		tx.sign(this.pair);
		tx.sign(intermediatePair);
		await submitTransaction(tx);
	}

	async sendDirect(destinationAccountId, amount) {
		const issuerAccount = await server.loadAccount(this.accountId());
		const { p90_accepted_fee: fee } = await server.feeStats();
		const txBuilder = new StellarSdk.TransactionBuilder(issuerAccount, {
			fee,
			networkPassphrase: StellarSdk.Networks.TESTNET
		});
		addOperation(txBuilder, "payment", {
			amount: String(amount),
			destination: destinationAccountId,
			asset: this.asset()
		});
		const tx = txBuilder.setTimeout(100).build();
		tx.sign(this.pair);
		await submitTransaction(tx);
	}

	log(msg) {
		console.log(chalk.green(msg));
	}

	accountId() {
		return this.pair.publicKey();
	}

	asset() {
		return new StellarSdk.Asset("ABC", this.pair.publicKey());
	}
}

Anchor.ASSET_CODE = "ABC";

module.exports = Anchor;
