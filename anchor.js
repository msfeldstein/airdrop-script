const StellarSdk = require("stellar-sdk");
const chalk = require("chalk");
const TransactionMiddleware = require("./transaction-middleware");
const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");

const log = msg => console.log(chalk.green("[Anchor] " + msg));
const { addOperation, submitTransaction } = TransactionMiddleware(log);

class Anchor {
  constructor() {}

  async init() {
    this.pair = StellarSdk.Keypair.random();
    log("Creating Issuer account " + this.pair.publicKey());
    await server.friendbot(this.pair.publicKey()).call();
  }

  async request(destinationAccountId, amount) {
    log("Received asset request from account " + destinationAccountId);
    const intermediatePair = StellarSdk.Keypair.random();
    const intermediateKey = intermediatePair.publicKey();
    log(
      "Anchor needs to generate an intermediate account with the receiver as the only signer to hold the assets to be claimed"
    );
    log("Generated intermediate account keys " + intermediateKey);
    const asset = this.asset();
    const issuerAccount = await server.loadAccount(this.accountId());
    const { p90_accepted_fee: fee } = await server.feeStats();
    const txBuilder = new StellarSdk.TransactionBuilder(issuerAccount, {
      fee,
      networkPassphrase: StellarSdk.Networks.TESTNET
    });
    addOperation(
      txBuilder,
      "createAccount",
      {
        destination: intermediateKey,
        startingBalance: "4" // 2.00006 because.... ?
      },
      "Creating the intermediate account with a starting balance of 4 lumens to cover the reserve, trustline, future merge payment to the users main account, and possible account creation if the user doesn't have an account created yet"
    );
    addOperation(
      txBuilder,
      "changeTrust",
      {
        asset,
        amount,
        source: intermediateKey
      },
      "Adding the trustline to the intermediate account"
    );
    addOperation(
      txBuilder,
      "payment",
      {
        destination: intermediateKey,
        asset,
        amount
      },
      "Sending the assets to be transfered into the intermediate account"
    );
    addOperation(
      txBuilder,
      "setOptions",
      {
        source: intermediateKey,
        masterWeight: 0,
        signer: {
          ed25519PublicKey: destinationAccountId,
          weight: 1
        }
      },
      "Removing the anchors signing power over the intermediate account, and replacing that signer with the final destination account"
    );
    const tx = txBuilder.setTimeout(100).build();
    tx.sign(this.pair);
    tx.sign(intermediatePair);
    await submitTransaction(tx);
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
