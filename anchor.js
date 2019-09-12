const StellarSdk = require("stellar-sdk");
const chalk = require("chalk");
const waitKey = require("./wait-key");
const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");

class Anchor {
	constructor() {}

	async init() {
		this.pair = StellarSdk.Keypair.random();
		this.log("Creating Issuer account " + this.pair.publicKey());
		await server.friendbot(this.pair.publicKey()).call();
	}

	async request(destinationAccountId, amount) {
		const destinationAccount = await server.loadAccount(destinationAccountId);
		const trustline = !!destinationAccount.balances.find(
			balance =>
				balance.asset_code === Anchor.ASSET_CODE &&
				balance.asset_issuer === this.pair.publicKey()
		);
		console.log("REQUEST");
		if (trustline) {
			this.log("There is already a trustline, we can just send it");
			await this.sendDirect(destinationAccount.accountId(), amount);
		} else {
			this.log(
				"There is an account but no trustline.  We need to create a temporary account for them to claim when they create their account."
			);
			await this.sendWithIntermediate(destinationAccount.accountId(), amount);
		}
	}

	async sendWithIntermediate(destinationAccountId, amount) {
		const intermediatePair = StellarSdk.Keypair.random();
		const intermediateKey = intermediatePair.publicKey();
		this.log("> Generated intermediate account " + intermediateKey);
		const asset = this.asset();
		const issuerAccount = await server.loadAccount(this.accountId());
		const { p90_accepted_fee: fee } = await server.feeStats();
		const tx = new StellarSdk.TransactionBuilder(issuerAccount, {
			fee,
			networkPassphrase: StellarSdk.Networks.TESTNET
		})
			// Create the intermediate account with some lumens to handle the trustline and reserve
			.addOperation(
				StellarSdk.Operation.createAccount({
					destination: intermediateKey,
					startingBalance: "2.00006" // 2.00006 because.... ?
				})
			)
			// Add a trustline to it
			.addOperation(
				StellarSdk.Operation.changeTrust({
					asset,
					amount,
					source: intermediateKey
				})
			)
			// Send the actual assets (you may want to withhold the cost of setting up the account)
			.addOperation(
				StellarSdk.Operation.payment({
					destination: intermediateKey,
					asset,
					amount
				})
			)
			// Replace the intermediate accounts signers from the anchor to the client
			.addOperation(
				StellarSdk.Operation.setOptions({
					source: intermediateKey,
					masterWeight: 0,
					signer: {
						ed25519PublicKey: destinationAccountId,
						weight: 1
					}
				})
			)
			.setTimeout(100)
			.build();
		tx.sign(this.pair);
		tx.sign(intermediatePair);
		await server.submitTransaction(tx);
	}

	async sendDirect(destinationAccountId, amount) {
		const issuerAccount = await server.loadAccount(this.accountId());
		const { p90_accepted_fee: fee } = await server.feeStats();
		const tx = new StellarSdk.TransactionBuilder(issuerAccount, {
			fee,
			networkPassphrase: StellarSdk.Networks.TESTNET
		})
			.addOperation(
				StellarSdk.Operation.payment({
					amount: String(amount),
					destination: destinationAccountId,
					asset: this.asset()
				})
			)
			.setTimeout(100)
			.build();
		tx.sign(this.pair);
		await server.submitTransaction(tx);
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
