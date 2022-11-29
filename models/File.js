const { mongoose } = require('../db');

const FileSchema = new mongoose.Schema({
	phone_number: {
		type: String,
		required: true
	},
	event: {
		type: String,
		required: true
	},
	info: {
		type: Object,
		default: {}
	}
}, {timestamps: true});

module.exports = mongoose.model('File', FileSchema);