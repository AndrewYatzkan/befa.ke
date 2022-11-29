const { v4: uuid } = require('uuid');
const crypto = require('crypto');
const User = require('./models/User');

function gen_filename(secondary=false, realmoji=false) {
	return `${uuid()}-${realmoji ? 'realmoji-instant-': ''}${Math.floor(Date.now()/1000)}${secondary?'-secondary':''}.jpg`;

}

function get_extension(buffer) {
	let signatures = {
		'png': Buffer.from('\x89\x50\x4E\x47\x0D\x0A\x1A\x0A', 'ascii'),
		'jpg': Buffer.from('\xFF\xD8\xFF', 'ascii'), // beginning of all 5 kinds
		'gif': Buffer.from('\x47\x49\x46\x38', 'ascii'), // beginning of both kinds
		'heic': Buffer.from('\x00\x00\x00') // probably
	};
	for (let ext of Object.keys(signatures)) {
		let buf = signatures[ext];
		if (buffer.subarray(0, buf.length).compare(buf) == 0) return ext;
	}
	return 'unknown';
}

async function one_time_code(hash) {
	if (hash.length != 32) return false;
	for await (const user of User.find()) {
		let hash_ = crypto.createHash('md5').update(user.access_token).digest('hex');
		if (hash_ === hash) return user.phone_number;
	}
	return false;

}

module.exports = { gen_filename, get_extension, one_time_code };