const { mongoose } = require('../db');

const TransactionSchema = new mongoose.Schema({
	phone_number: {
		type: String,
		required: true
	},
	method: { // 'venmo' or 'referral'
		type: String,
		required: true
	},
	receipt: { // venmo receipt url or phone number of referred
		type: String,
		required: true
	},
	amount: {
		type: Number,
		required: true
	},
	starting_balance: {
		type: Number,
		required: true
	},
	final_balance: {
		type: Number,
		required: true
	}
}, {timestamps: true});

module.exports = mongoose.model('Transaction', TransactionSchema);