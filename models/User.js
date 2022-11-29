const { mongoose } = require('../db');

const UserSchema = new mongoose.Schema({
	phone_number: {
		type: String,
		index: true
	},
	user_id: {
		type: String,
		required: true
	},
	profile_picture_url: {
		type: Object,
		default: null
	},
	local_id: {
		type: String,
		required: true
	},
	refresh_token: {
		type: String,
		required: true
	},
	access_token: {
		type: String,
		required: true
	},
	expires_at: {
		type: Date,
		default: 0
	},
	credits: {
		type: Number,
		default: 0
	}
}, {timestamps: true});

module.exports = mongoose.model('User', UserSchema);