module.exports = function(tx) {
	const operations = tx.operations;
	operations.forEach(op => {
		const name = op.body()._switch.name;
	});
};
