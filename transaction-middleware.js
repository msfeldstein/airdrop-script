// Add a layer around transactions so we can log them in a nice way
const StellarSdk = require("stellar-sdk");
module.exports = function(logFn) {
  const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");
  let ops = [];
  async function addOperation(txBuilder, opName, params, message) {
    ops.push({ name: opName, params, message });
    txBuilder.addOperation(StellarSdk.Operation[opName](params));
  }

  async function submitTransaction(tx) {
    try {
      logFn("Sending transaction with ops: ");
      logFn("  ----------");
      ops.forEach(op => {
        if (op.message) {
          logFn("  " + op.message);
        }
        logFn("  " + op.name);
        Object.keys(op.params).forEach(key => {
          logFn("    " + key + ": " + JSON.stringify(op.params[key]));
        });
        logFn("  ----------");
      });

      ops = [];
      await server.submitTransaction(tx);
      logFn("Transaction succeded");
    } catch (e) {
      console.error("Error submitting transaction");
      console.error(e);
      console.error(e.response.data.extras.result_codes);
    }
  }

  return {
    addOperation,
    submitTransaction
  };
};
