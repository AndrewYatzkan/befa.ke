const { mongoose } = require('../db');

const VerificationSchema = new mongoose.Schema({
	phone_number: {
		type: String,
		index: true
	},
	vonage_id: {
		type: String,
		required: true
	},
	expires_at: {
		type: Date,
		required: true
	}
}, {timestamps: true});

module.exports = mongoose.model('Verification', VerificationSchema);