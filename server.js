require('dotenv').config();
const express = require('express');
const app = express();
const fileUpload = require('express-fileupload');
const { mongoose } = require('./db');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const port = 8080;
const Event = require('./models/Event');

const { gen_filename, get_extension, one_time_code } = require('./utils');
const { PRICES, ERRORS } = require('./constants');
const { parsePhoneNumber } = require('libphonenumber-js');

const Client = require('./Client');

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 * 30 * 6 // 2 mo.
    },
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
    	client: mongoose.connection.getClient(),
    	ttl: 1000 * 60 * 60 * 24 * 30 * 6
    })
});

// required for ffmpeg wasm (https://github.com/ffmpegwasm/ffmpeg.wasm)
app.use((_, res, next) => {
	res.header('Cross-Origin-Opener-Policy', 'same-origin');
	res.header('Cross-Origin-Embedder-Policy', 'require-corp');
  	next();
});

app.use(sessionMiddleware);
app.use(express.json());
app.use(fileUpload({ limits: 25 * 1024 * 1024 })); // 25 mb limit (same as BeReal)

// if (process.argv[2] === 'dev') { 
	app.use(express.static('public'));
// },

app.use((req, res, next) => {
	if (req.method === 'POST' && ['/login', '/check_code'].includes(req.url)) return next();
	if (!req.session.phone_number) return res.status(401).send({error: 'Not signed in.'});
	next();
});

// // FOR TESTING
// app.get('/test', async (req, res) => {
// 	let client = new Client(req.session.phone_number);
// 	await client.sign_in();
// 	// res.send(await client.send_comment('comment content! 3', '48A6L8k5SOhCEUZC4IW2zQJjmCA2'))
// 	res.send(await client.delete_comment('comment content! 3', '48A6L8k5SOhCEUZC4IW2zQJjmCA2', 'hyS-qFEXloynCslHu8WvX'))
// });

var request = require('request');

app.get('/proxy/*', (req, res) => {
	request(`https://storage.bere.al/${req.params[0]}`, {}, () => {
		if (!res.headersSent) res.sendStatus(500);
	}).pipe(res);
});

/* ************** */
/* Authentication */
/* ************** */
app.get('/me', async (req, res) => {
	try {
		var client = new Client(req.session.phone_number);
		await client.sign_in();
	} catch (e) {
		req.session.destroy();
		return res.status(401).send({error: 'Not signed in.'});
	}
	return res.send({
		phone_number: req.session.phone_number,
		user_id: client?.user?.user_id,
		profile_picture_url: client?.user?.profile_picture_url,
		username: await client.get_own_username()
	});
});
app.post('/login', async (req, res) => {
	let { phone_number } = req.body;
	if (!phone_number) return res.status(400).send({error: ERRORS.MISSING_PARAMS});
	if (req.session.phone_number) return res.status(400).send({error: 'Already signed in'});


	let number = await one_time_code(phone_number.trim());
	if (number) {
		req.session.phone_number = number;
		return res.status(200).send({loggedin: true, phone_number: number});
	}

	try {
		phone_number = parsePhoneNumber(phone_number);
	} catch (e) {
		// try {
			// phone_number = parsePhoneNumber('+' + phone_number);
		// } catch (e) {
			try {
				phone_number = parsePhoneNumber(phone_number, 'US');
			} catch (e) {
				return res.status(400).send({error: ERRORS.INVALID_NUMBER});
			}
		// }
	}
	phone_number = phone_number.number;

	let client = new Client(phone_number);
	try {
		var {vonageRequestId, sessionInfo} = await client.sign_in(true); // true => force verify
	} catch ({message}) {
		return res.status(400).send({error: message});
	}

	res.status(200).send({vonageRequestId, sessionInfo});
});

app.get('/logout', (req, res) => {
	req.session.destroy();
	return res.send({success: true});
});

app.post('/check_code', async (req, res) => {
	let { code, vonageRequestId, sessionInfo } = req.body;
	if (!code || (!vonageRequestId && !sessionInfo)) return res.status(400).send({error: ERRORS.MISSING_PARAMS});
	if (req.session.phone_number) return res.status(400).send({error: 'Already signed in'});

	let client = new Client();
	try {
		await client.check_code(code, {vonageRequestId, sessionInfo}, {})
	} catch ({message}) {
		return res.status(400).send({error: message});
	}

	req.session.phone_number = client.phone_number;
	return res.status(200).send({success: true, phone_number: client.phone_number});
});

/* **** */
/* Feed */
/* **** */

// TODO: possible error? force new access token on any Forbidden
// TODO: fix 400 Forbidden on first sign in (without refresh)
app.get('/feed/friends', async (req, res) => {
	let client = new Client(req.session.phone_number);
	await client.sign_in();

	try {
		var feed = await client.get_feed_friends();
	} catch ({message}) {
		return res.status(400).send({error: message});
	}
	return res.status(200).send(feed);
});

/* req.body.last_index
 */
app.get('/feed/discovery', async (req, res) => {
	let last_index = req.query.last_index;
	let client = new Client(req.session.phone_number);
	await client.sign_in();

	try {
		var feed = await client.get_feed_discovery(last_index);
	} catch ({message}) {
		return res.status(400).send({error: message});
	}
	return res.status(200).send(feed);
});

/* ******** */
/* Comments */
/* ******** */

/* req.body.content: comment content
 * req.body.owner_id: post owner's id
 */
app.post('/comments/send', async (req, res) => {
	let { content, owner_id } = req.body;
	if (!content || !owner_id) return res.status(400).send({error: ERRORS.MISSING_PARAMS});
	let client = new Client(req.session.phone_number);
	await client.sign_in();

	try {
		await client.send_comment(content, owner_id);
	} catch ({message}) {
		return res.status(400).send({error: message});
	}
	return res.sendStatus(200);
});

/* req.body.content: comment content
 * req.body.owner_id: post owner's id
 * req.body.photo_id: post/photo id
 */
app.post('/comments/delete', async (req, res) => {
	let { content, owner_id, photo_id } = req.body;
	console.log(content, owner_id, photo_id);
	if (!content || !owner_id || !photo_id) return res.status(400).send({error: ERRORS.MISSING_PARAMS});
	let client = new Client(req.session.phone_number);
	await client.sign_in();

	try {
		await client.delete_comment(content, owner_id, photo_id);
	} catch ({message}) {
		return res.status(400).send({error: message});
	}
	return res.sendStatus(200);
});

/* ********* */
/* RealMojis */
/* ********* */

// /* Endpoint for sending RealMojis.
//  * Note: 'instant' RealMojis are sent via /realmoji/upload
//  * req.body.emoji: which emoji
//  * TODO: other params here..
//  */
// app.post('/realmoji/send', async (req, res) => {
// 	let { emoji } = req.body;
// 	if (!emoji) return res.status(400).send({error: ERRORS.MISSING_PARAMS});

// 	// await client.send_realmoji(...);
// 	// TODO: finish this..
// });

/* req.files.realmoji: realmoji photo
 * req.body.emoji: which emoji, or instant
 * req.body.type: 'still' or 'gif'
 * req.body.photo_id: photoId (if emoji=instant)
 * req.body.owner_id: ownerId (if emoji=instant)
 */
app.post('/realmoji/upload', async (req, res) => {
	let { emoji, type, photo_id, owner_id } = req.body;
	if (!req.files.realmoji || !emoji || !type) return res.status(400).send({error: ERRORS.MISSING_PARAMS});
	if (emoji !== 'instant') return res.status(400).send({error: 'Only allowing instant reactions for now.'});
	if (emoji == 'instant' && (!photo_id || !owner_id)) return res.status(400).send({error: ERRORS.MISSING_PARAMS});
	// if (type != 'still' && type != 'gif') return res.status(400).send({error: ERRORS.BAD_TYPE});

	let ext = get_extension(req.files.realmoji.data);

	if (ext == 'unknown') return res.status(400).send({error: ERRORS.UNKNOWN_FILE_TYPE});
	// if (type == 'gif' && ext != 'gif') return res.status(400).send({error: ERRORS.UNPERMITTED_GIF});

	// let gif_price = emoji == 'instant' ? PRICES.UPLOAD_GIF_REALMOJI_INSTANT : PRICES.UPLOAD_GIF_REALMOJI_OTHER;
	// if (type == 'gif' && !(await client.has_funds(gif_price)))
		// return res.status(400).send({error: ERRORS.INSUFFICIENT_FUNDS});

	try {
		let client = new Client(req.session.phone_number);
		await client.sign_in();
		let path = await client.upload_to_bucket(gen_filename(false, true), req.files.realmoji.data, 'realmoji');
		if (emoji == 'instant')
			var response = await client.send_realmoji(photo_id, owner_id, path, 'instant');
		else
			var response = await client.set_realmoji(emoji, path);

		// if (type == 'gif') {
		// 	// TODO: attach message to Transaction or Event
		// 	await client.withdraw_funds(gif_price);
		// 	response.new_balance = client.user.credits;
		// }

		await Event.create({
			phone_number: req.session.phone_number,
			event: 'realmoji',
			info: response
		});
		res.status(200).send(response);
	} catch ({message}) {
		return res.status(500).send({message});
	}
});

/* ***** */
/* Posts */
/* ***** */
app.post('/delete_post', async (req, res) => {
	let client = new Client(req.session.phone_number);
	await client.sign_in();

	try {
		let success = await client.delete_post();
		// TODO: success is false if it worked?
		if (!success) throw new Error('Delete post unsuccessful');
	} catch ({message}) {
		return res.status(400).send({error: message});
	}
	return res.sendStatus(200);
});

// TODO: look into png's
/* req.files.back: back/primary photo
 * req.files.front: front/selfie/secondary photo
 * --nevermind--req.body.type: 'still' (both jpg/png/heic) or 'gif' (at least one gif)
 * --nevermind--req.body.watermark: bool (default true)
 */
app.post('/post', async (req, res) => {
	// let { type, watermark } = req.body;
	if (!req.files.back || !req.files.front) return res.status(400).send({error: ERRORS.NO_PHOTOS});
	// if (type != 'still' && type != 'gif') return res.status(400).send({error: ERRORS.BAD_TYPE});
	let client = new Client(req.session.phone_number);
	await client.sign_in();

	let front_ext = get_extension(req.files.front.data);
	let back_ext = get_extension(req.files.back.data);
	if (front_ext == 'unknown' || back_ext == 'unknown')
		return res.status(400).send({error: ERRORS.UNKNOWN_FILE_TYPE});

	// if (type != 'gif' && front_ext == 'gif' || back_ext == 'gif')
		// return res.status(400).send({error: ERRORS.UNPERMITTED_GIF});

	// if (type == 'gif' && front_ext != 'gif' && back_ext != 'gif')
		// return res.status(400).send({error: ERRORS.STILLS_ONLY});

	// let price = 0;
	// if (type == 'gif') price += PRICES.POST_GIF_BEREAL;
	// if (watermark === false) price += PRICES.REMOVE_POST_WATERMARK;
	// if (!(await client.has_funds(price)))
		// return res.status(400).send({error: ERRORS.INSUFFICIENT_FUNDS});

	let back_data = req.files.back.data;
	let front_data = req.files.front.data;
	// if (watermark !== false) {
		// back_data = add_watermark(back_data);
		// front_data = add_watermark(front_data);
	// }

	let post;
	try {
		let back = await client.upload_to_bucket(gen_filename(), back_data);
		let front = await client.upload_to_bucket(gen_filename(true), front_data);
		post = await client.post_bereal(back, front);
		var response = {post};

		console.log(post.user.username, 'posted');
		console.log('primary', post.primary.url);
		console.log('secondary', post.secondary.url);
		console.log('');

		await Event.create({
			phone_number: req.session.phone_number,
			event: 'post',
			info: post
		});

		// // TODO: attach message to Transaction or Event
		// await client.withdraw_funds(price); // remove funds after successful post
		// if (price > 0) response.new_balance = client.user.credits;
	} catch ({message}) {
		return res.status(500).send(response);
	}

	if (post) { 
		// return res.status(200).send({post, new_balance: client.user.credits});
		return res.redirect('/');
	}
	return res.status(500).send(response);
});

app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});