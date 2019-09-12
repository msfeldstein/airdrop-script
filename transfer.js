#!/bin/bash node
const StellarSdk = require("stellar-sdk");
const waitKey = require("./wait-key");
const Anchor = require("./anchor");
const TransactionMiddleware = require("./transaction-middleware");
const chalk = require("chalk");
const EventSource = require("eventsource");
const fetch = require("node-fetch");
const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");
const keys = {};
const anchor = new Anchor();
const { addOperation, submitTransaction } = TransactionMiddleware(msg =>
	console.log(chalk.hex("#729fcf")(msg))
);

const main = async () => {
	console.log(`transfer.js: Exhibit transfer of non-native assets to various accounts:
  - Account with a trustline (trivial)
  - Account with funds but no trustline
  - Account with no funds and no trustline
  - User with no account
  
  We will create an issuer account, and exhibit sending the ABC asset to these account types`);

	console.log(chalk.green("Green messages come from the anchor"));
	console.log(chalk.hex("#729fcf")("Blue messages come from the wallet"));

	await anchor.init();

	// await waitKey("[account with a trustline]");
	// await accountWithTrustline();

	await waitKey("[account with funds but no trustline]");
	await accountWithFundsButNoTrustline();
};

const createAccount = async ({ isFunded, hasTrustline }) => {
	const pair = StellarSdk.Keypair.random();
	walletLog("Generated account " + pair.publicKey());
	if (isFunded) {
		walletLog("Funding account");
		await server.friendbot(pair.publicKey()).call();
	}
	if (hasTrustline) {
		walletLog(`Adding trustline to ${anchor.asset()}`);
		const [account, { p90_accepted_fee: fee }] = await Promise.all([
			server.loadAccount(pair.publicKey()),
			server.feeStats()
		]);
		const txBuilder = new StellarSdk.TransactionBuilder(account, {
			fee,
			networkPassphrase: StellarSdk.Networks.TESTNET
		});
		addOperation(txBuilder, "changeTrust", {
			asset: anchor.asset()
		});
		const transaction = txBuilder.setTimeout(100).build();
		transaction.sign(pair);
		await submitTransaction(transaction);
	}
	return pair;
};

function walletLog(msg) {
	console.log(chalk.hex("#729fcf")(msg));
}

async function logBalance(msg, accountId) {
	console.log(">>> " + msg);
	let account = await server.loadAccount(accountId);
	const balance = account.balances.find(b => b.asset_code === "ABC");
	if (balance) {
		console.table({
			asset: balance.asset_code,
			amount: balance.balance,
			trustline: true
		});
	} else {
		console.table({ asset: "ABC", amount: 0, trustline: false });
	}
}

async function accountWithTrustline() {
	walletLog("> Creating account with a trustline");
	const pair = await createAccount({
		isFunded: true,
		hasTrustline: true
	});
	walletLog("> Requesting payment from anchor");
	let accountId = pair.publicKey();
	await logBalance("Before Request", accountId);
	await anchor.request(accountId, "100");
	await logBalance("After request", accountId);
}

async function accountWithFundsButNoTrustline() {
	const amount = "100";
	walletLog("> Creating a funded account without a trustline");
	const pair = await createAccount({
		isFunded: true,
		hasTrustline: false
	});
	const accountId = pair.publicKey();
	await logBalance("Before Request", accountId);
	const values = await Promise.all([
		await anchor.request(pair.publicKey(), amount),
		await waitForClaimableAccount(pair)
	]);
	const accountToClaim = values[1];
	walletLog("> Found claimable account: " + accountToClaim);
	await claimAccount(pair, accountToClaim, amount);
	await logBalance("After Request", accountId);
	console.log(
		`Issuer account: https://stellar.expert/explorer/testnet/account/${
			anchor.asset().issuer
		}`
	);
	console.log(
		`Claimed account: https://stellar.expert/explorer/testnet/account/${accountToClaim}`
	);
	console.log(
		`Wallet account https://stellar.expert/explorer/testnet/account/${accountId}`
	);
}

async function waitForClaimableAccount(pair) {
	return new Promise((resolve, reject) => {
		const signer = pair.publicKey();
		const accountsForSignerEndpoint = `https://horizon-testnet.stellar.org/accounts?signer=${signer}`;
		// Eventually this will use the js-sdk when accounts-for-signer endpoint is enabled
		console.log(accountsForSignerEndpoint);
		const eventSource = new EventSource(accountsForSignerEndpoint);
		walletLog("Listening for accounts where i am a signer");
		const refreshIntervalId = setInterval(async () => {
			const resp = await fetch(accountsForSignerEndpoint);
			const json = await resp.json();
			const claimableAccount = json._embedded.records.find(
				record => record.id != signer
			);
			if (claimableAccount) {
				resolve(claimableAccount.id);
				clearInterval(refreshIntervalId);
			}
		}, 1000);
	});
}

async function claimAccount(mainAccountPair, claimableAccountId, amount) {
	const asset = anchor.asset();
	const mainPK = mainAccountPair.publicKey();
	walletLog(
		"> Merge the temporary account created by the anchor for me into my main account"
	);
	const claimableAccount = await server.loadAccount(claimableAccountId);
	const { p90_accepted_fee: fee } = await server.feeStats();

	const mergeTxBuilder = new StellarSdk.TransactionBuilder(claimableAccount, {
		fee,
		networkPassphrase: StellarSdk.Networks.TESTNET
	});
	let accountToClaim;
	let needsTrustline = true;
	try {
		accountToClaim = await server.loadAccount(mainPK);
		walletLog(
			"> The main account exists, we need to check if it needs a trustline or already has one."
		);
		needsTrustline = !accountToClaim.balances.find(b => b.asset_code === "ABC");
	} catch (e) {
		console.log(e);
		walletLog(
			"> The main account doesn't exist yet.  We'll need to create it with the lumens in the claimable account"
		);
		addOperation(mergeTxBuilder, "createAccount", {
			destination: mainPK,
			startingBalance: "1.0"
		});
	}
	if (!needsTrustline) {
		walletLog(
			"> The main account has a trustline. We need to ensure it has enough lumens for one offer so we give it 0.5xlm"
		);
		console.error(">>> What is the 'one offer' for???");
		addOperation(mergeTxBuilder, "payment", {
			asset: StellarSdk.Asset.native(),
			amount: "0.5",
			source: claimableAccountId
		});
	} else {
		walletLog(
			"> The main account needs a trustline. We need to ensure it has enough lumens for one offer and one trustline so we give it 0.5xlm"
		);
		addOperation(mergeTxBuilder, "payment", {
			asset: StellarSdk.Asset.native(),
			amount: "1.0",
			source: claimableAccountId,
			destination: mainPK
		});
		addOperation(mergeTxBuilder, "changeTrust", {
			asset,
			source: mainPK
		});
	}

	addOperation(mergeTxBuilder, "payment", {
		asset,
		destination: mainPK,
		amount
	});
	addOperation(mergeTxBuilder, "setOptions", {
		signer: { weight: 0, ed25519PublicKey: mainPK }
	});
	addOperation(mergeTxBuilder, "changeTrust", { asset, limit: "0" });
	addOperation(mergeTxBuilder, "accountMerge", { destination: mainPK });
	const mergeTx = mergeTxBuilder.setTimeout(100).build();
	mergeTx.sign(mainAccountPair);
	await submitTransaction(mergeTx);
}
main();
