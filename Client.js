// const logger = require('./logger');
const fetch = require('node-fetch');
const User = require('./models/User');
// const Transaction = require('./models/Transaction');
const Verification = require('./models/Verification');
const Event = require('./models/User');
const GOOGLE_KEY = 'AIzaSyDwjfEeparokD7sXPVQli9NsTuhT6fJ6iA';
const IOS_RECEIPT = 'AEFDNu9QZBdycrEZ8bM_2-Ei5kn6XNrxHplCLx2HYOoJAWx-uSYzMldf66-gI1vOzqxfuT4uJeMXdreGJP5V1pNen_IKJVED3EdKl0ldUyYJflW5rDVjaQiXpN0Zu2BNc1c';//'AEFDNu987tBYSzhLBHB89A411JsMbx1Pn5O_eQyqqAwQXPMiSalGTG8wGf6JKsNMJFBepITD6F01MwGySZ5HtTsO7AHfhnahB1E3DWWlXvkY4c8AsvxxI3JIktCsMMMaLYhC';

class Client {
	constructor(phone_number) {
		this.phone_number = phone_number;
	}

	/* ******* */
	/* Credits */
	/* ******* */
	async has_funds(amount) {
		return amount <= this.user.credits;
	}
	async withdraw_funds(amount) {
		if (amount == 0) return true;
		this.user.credits -= amount;
		await this.user.save();
	}

	/* ******** */
	/* Comments */
	/* ******** */
	async send_comment(content, owner_id) {
		if (content.length > 500) throw new Error('Max comment length is 500 characters.');
		let {error, result} = await this._set_comment_post(content, owner_id);
		if (error) throw new Error(error.message);
		return result;
	}

	async delete_comment(content, owner_id, photo_id) {
		let {error, result} = await this._remove_reaction(photo_id, owner_id, 'comment', null, null, content);
		if (error) throw new Error(error.message);
		return result;
	}
	
	// async _send_new_comment_push(fromUserID, photoURL, photoID /* ? */, fromUserName, ownerID, text) {
	// 	let req = await fetch(`https://us-central1-alexisbarreyat-bereal.cloudfunctions.net/setCommentPost`, {
	// 	  body: JSON.stringify({data: {fromUserID, photoURL, photoID, fromUserName, ownerID, text}}),
	// 	  headers: {
	// 	    'Authorization': `Bearer ${this.user.access_token}`,
	// 	    "Content-Type": "application/json",
	// 	  },
	// 	  method: "POST"
	// 	});
	// 	return await req.json();
	// }

	async _set_comment_post(text, userId) {
		let req = await fetch(`https://us-central1-alexisbarreyat-bereal.cloudfunctions.net/setCommentPost`, {
		  body: JSON.stringify({data: {text, userId}}),
		  headers: {
		    'Authorization': `Bearer ${this.user.access_token}`,
		    "Content-Type": "application/json",
		  },
		  method: "POST"
		});
		return await req.json();
	}

	async _remove_reaction(photo_id, owner_id, type, rtype, uri, text) {
		let username = (await this.get_user_names([this.user.user_id])).result[0].userName;
		let reaction_data = {
  			uid: this.user.user_id,
  			userName: username
  		};
  		if (rtype) reaction_data.type = rtype;
  		if (text) reaction_data.text = text;
  		if (uri) reaction_data.uri = uri; // ex: "https://storage.bere.al/Photos/3623WxNFjJY8SFNYJ0ZSplm8tln1/realmoji/3623WxNFjJY8SFNYJ0ZSplm8tln1-realmoji-surprised-1645913232.jpg"
		let req = await fetch(`https://us-central1-alexisbarreyat-bereal.cloudfunctions.net/removeReaction`, {
		  body: JSON.stringify({data: {
		  	id: photo_id,
		  	uid: owner_id,
		  	type,
		  	reactions: [reaction_data],
		  }}),
		  headers: {
		    'Authorization': `Bearer ${this.user.access_token}`,
		    "Content-Type": "application/json",
		  },
		  method: "POST"
		});
		let res = await req.json();
		return res;
	}

	/* **** */
	/* Feed */
	/* **** */
	async get_feed_friends() {
		let req = await fetch('https://mobile.bereal.com/api/feeds/friends', {
			headers: { 'Authorization': `Bearer ${this.user.access_token}` },
			method: 'GET'
		});
		let res = await req.json();
		if (res.error) throw new Error(res.error);
		return res;
	}

	async get_feed_discovery(last_index) {
		if (!/\d/.test(last_index)) last_index = false;
		let li = last_index ? `&lastIndex=${last_index}` : '';
		let req = await fetch(`https://mobile.bereal.com/api/feeds/discovery?limit=20${li}`, {
			headers: { 'Authorization': `Bearer ${this.user.access_token}` },
			method: 'GET'
		});
		var res = await req.json();
		if (res.error) throw new Error(res.error);
		return res;
	}

	/* ********* */
	/* RealMojis */
	/* ********* */
	// async set_realmoji(emoji, path) {}
	async send_realmoji(photoId, ownerId, uri, type, timeout=300) { // uri: 'Photos/48A6L8k5SOhCEUZC4IW2zQJjmCA2/bereal/filename.jpg'
		const controller = new AbortController();
		setTimeout(() => controller.abort(), timeout * 1000);

		let emoji = {'surprised': '😲', 'happy': '😃', 'up': '👍', 'neutral': '😐', 'confounded': '😖', 'laughing': '😂', 'instant': '⚡️'}[type];
		let req = await fetch(`https://us-central1-alexisbarreyat-bereal.cloudfunctions.net/sendRealMoji`, {
		  body: JSON.stringify({data: {
		  	photoId, ownerId, emoji, type, uri,
		  	action: 'add',
		  }}),
		  headers: {
		    'Authorization': `Bearer ${this.user.access_token}`,
		    "Content-Type": "application/json",
		  },
		  method: "POST",
		  signal: controller.signal
		});

		let {error, result} = await req.json();
		if (error) throw new Error(error.message);
		return result;
		// let res = await req.text();
		// try {
		// 	let {error, result} = JSON.parse(res);
		// 	if (error) throw new Error(error.message);
		// 	return result;
		// } catch (e) {
		// 	console.log(res);
		// 	throw new Error(e);
		// }
	}

	/* ************* */
	/* Uploads/Posts */
	/* ************* */
	async set_caption(caption) { // max length: 80
		let req = await fetch('https://us-central1-alexisbarreyat-bereal.cloudfunctions.net/setCaptionPost', {
		  body: JSON.stringify({data: { caption }}),
		  headers: {
		    'Authorization': `Bearer ${this.user.access_token}`,
		    "Content-Type": "application/json",
		  },
		  method: "POST"
		});
		let {error, result} = await req.json();
		if (error) throw new Error(error.message);
		return result;
	}

	async delete_post() {
		let req = await fetch('https://us-central1-alexisbarreyat-bereal.cloudfunctions.net/deleteBeReal', {
			body: '{"data": null}',
			headers: {
		    'Authorization': `Bearer ${this.user.access_token}`,
		    "Content-Type": "application/json",
		  },
		  method: "POST"
		});
		// console.log(await req.json());
		// return;
		let {error, success} = await req.json();
		if (error) throw new Error(error.message);
		return success; // TODO: was undefined on success?
	}

	async post_bereal(back_path, front_path, location=null) {
		let req = await fetch(`https://mobile.bereal.com/api/content/post`, {
			body: JSON.stringify({
				takenAt: "9999-01-01T00:00:00.000Z",
				isPublic: false,
				isLate: false,
				retakeCounter: 0,
				location,
				frontCamera : {
					path: front_path, // "Photos/SHmWiC7oVEaT5JAXnbQ3XIu0JwR2/bereal/blink.jpg",
					width: 1500,
					bucket: 'storage.bere.al',
					height: 2000
				},
				backCamera : {
					path: back_path,
					width: 1500,
					bucket: 'storage.bere.al',
					height: 2000
				}
			}),
			headers: {
				'Authorization': `Bearer ${this.user.access_token}`,
				'Content-Type': 'application/json'
			},
			method: 'POST'
		});

		// TODO: ... handle errors and success
		var res = await req.json();
		return res;
	}
	async upload_to_bucket(filename, buffer, type='bereal') {
		let req = await fetch(`https://firebasestorage.googleapis.com:443/v0/b/storage.bere.al/o/${encodeURIComponent(`Photos/${this.user.local_id}/${type}/${filename}`)}?uploadType=resumable&name=${encodeURIComponent(`Photos/${filename}`)}`, {
			body: JSON.stringify({
				"metadata":{type},
				"contentType":"image\/jpeg",
				"cacheControl":"public,max-age=172800",
				"name": `Photos\/${this.user.local_id}\/${type}\/${filename}`
			}),
			headers: {
				'Authorization': `Firebase ${this.user.access_token}`,
				'X-Goog-Upload-Command': 'start',
				'X-Goog-Upload-Content-Type': 'image/jpeg',
				'X-Goog-Upload-Protocol': 'resumable'
			},
			method: 'POST'
		});

		let upload_id = await req.headers.get('x-guploader-uploadid');
		req = await fetch(`https://firebasestorage.googleapis.com:443/v0/b/storage.bere.al/o/${encodeURIComponent(`Photos/${this.user.local_id}/${type}/${filename}`)}?uploadType=resumable&name=${encodeURIComponent(`Photos/${filename}`)}&upload_id=${upload_id}&upload_protocol=resumable`, {
			body: buffer,
			headers: {
				'X-Goog-Upload-Command': 'upload, finalize',
				'X-Goog-Upload-Offset': '0'
			},
			method: 'PUT'
		});
		let res = await req.text();
		if (res == 'Not Found') throw new Error(res);
		let {error, name} = JSON.parse(res);
		if (error) throw new Error(error.message);

		return name;
	}

	/* ************** */
	/* Authentication */
	/* ************** */
	async sign_in(force_verify) { // authenticates
		let user = force_verify ? null : await User.findOne({ phone_number: this.phone_number });
		if (user === null)
			return await this.send_sms(); // returns {vonageRequestId, sessionInfo}

		this.user = user;

		try {
			if (this.user.expires_at < Date.now()) throw new Error('expired');
			await this.get_account_info(); // throws error if access token has actually expired somehow
		} catch (e) { // access token has probably expired

			// use refresh token
			let {access_token, expires_in} = await this.use_refresh_token();

			this.user.access_token = access_token;
			this.user.expires_at = Date.now() + parseInt(expires_in) * 1000;
			await this.user.save();
		}
	}

	async use_refresh_token() {
		let req = await fetch(`https://securetoken.googleapis.com/v1/token?key=${GOOGLE_KEY}`, {
			body: JSON.stringify({
				grantType: 'refresh_token',
				refreshToken: this.user.refresh_token
			}),
			method: 'POST'
		});
		let {error, access_token, expires_in/*, user_id*/} = await req.json();
		// if (error) throw new Error(error.message);

		return {access_token, expires_in};
	}

	async send_sms() {
		let req = await fetch('https://auth.bereal.team/api/vonage/request-code', {
			body: JSON.stringify({
				phoneNumber: this.phone_number,
				deviceId: ' '
			}),
			headers: { 'Content-Type': 'application/json' },
			method: 'POST'
		});

		var {error, errorText, status, vonageRequestId} = await req.json();

		// TODO: test this
		// if (status == '10') {
		// 	let verification = await Verification.findOne({phone_number: this.phone_number});
		// 	if (verification.expires_at < Date.now()) await Verification.deleteOne({phone_number: this.phone_number});
		// 	else vonageRequestId = verification.vonage_id;
		// }

		if (!vonageRequestId) {
			req = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/sendVerificationCode?key=${GOOGLE_KEY}`, {
				body: JSON.stringify({
					iosReceipt: IOS_RECEIPT,
					// "iosSecret":"U9sAvLKb2TI-d6UM",
					phoneNumber: this.phone_number
				}),
				headers: {
					'X-Ios-Bundle-Identifier': 'AlexisBarreyat.BeReal'
				},
				method: 'POST'
			});

			var {sessionInfo, error} = await req.json();
			if (!sessionInfo) throw new Error(error?.message || errorText || 'Bad number');
			return {sessionInfo};
		}
		
		// errorKey == 'missing' = 'Bad Request'
		// errorKey == null = blocked phone number?
		// status == '0' is good
		// status == '10' means Concurrent verifications to the same number are not allowed

		// TODO: test this
		// await Verification.updateOne({phone_number: this.phone_number}, {
		// 	vonage_id: vonageRequestId,
		// 	expires_at: Date.now() + 5 * 60 * 1000 // 5 minutes
		// }, {upsert: true});

		return {vonageRequestId};
	}

	async check_code(code, {vonageRequestId, sessionInfo}, {idToken, refreshToken, expiresIn}) { // idToken = access_token
		if (vonageRequestId) {
			var req = await fetch('https://auth.bereal.team/api/vonage/check-code', {
				body: JSON.stringify({
					code: code.toString(),
					vonageRequestId
				}),
				headers: { 'Content-Type': 'application/json' },
				method: 'POST'
			});
			var {errorKey, error_text, status, token, uid} = await req.json();
			if (status !== '0') throw new Error(error_text || errorKey || status || 'Invalid code');
		} else if (sessionInfo) {
			var req = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPhoneNumber?key=${GOOGLE_KEY}`, {
				body: JSON.stringify({
					code: code.toString(),
					operation: 'SIGN_UP_OR_IN',
					sessionInfo
				}),
				method: 'POST'
			});
			var {errorKey, error_text, error, idToken, refreshToken, expiresIn, localId} = await req.json();
			var token = idToken;
			if (errorKey || error_text || error) throw new Error(error?.message || errorKey || error_text || 'Unknown error'); // guessing at these params
		} else {
			var token = idToken;
		}
		

		// status codes (for vonageRequestId method):
		// errorKey == null // ?
		// status == '16' // 'The code provided does not match the expected value'
		// status == '6' // Request not found or verified already
		// status == '3' // invalid value for param request_id
		// status == '0' // success

		if (vonageRequestId)
			var {refreshToken, expiresIn, idToken} = await this.refresh_from_access(token);
		var {localId, providerUserInfo} = await this.get_account_info(idToken);
		var uid = localId;
		let {result} = await this.get_user_profile({uid}, idToken);

		this.phone_number = providerUserInfo[0].phoneNumber;
		await User.updateOne({phone_number: this.phone_number}, {
			user_id: uid,
			local_id: localId,
			profile_picture_url: result?.photoURL || null,
			refresh_token: refreshToken,
			access_token: token,
			credits: 50
			// expires_at: Date.now() + parseInt(expiresIn) * 1000
		}, {upsert: true, setDefaultsOnInsert: true});
		this.user = await User.findOne({ phone_number: this.phone_number });
	}

	async refresh_from_access(access_token) {
		let req = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyCustomToken?key=${GOOGLE_KEY}`, {
			body: JSON.stringify({
				token: access_token,
				returnSecureToken: true
			}),
			method: 'POST'
		});
		let {error, refreshToken, expiresIn, idToken/*, kind, isNewUser*/} = await req.json();
		if (error) throw new Error(error.message);

		return {refreshToken, expiresIn, idToken};
	}

	async get_account_info(idToken=this.user.access_token) {
		let req = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${GOOGLE_KEY}`, {
			body: JSON.stringify({idToken}),
			method: 'POST'
		});
		let {error, users} = await req.json();
		if (error) throw new Error(error.message);

		return users[0];
	}

	async get_user_profile({uid, userName}, access_token) {
		try {
			let body = {data:{}};
			if (uid) body.data.uid = uid;
			if (userName) body.data.userName = userName;
			let req = await fetch(`https://us-central1-alexisbarreyat-bereal.cloudfunctions.net/getUserProfile`, {
				body: JSON.stringify(body),
				headers: {
			    'Authorization': `Bearer ${access_token || this.user.access_token}`,
			    "Content-Type": "application/json",
			  },
			  method: "POST"
			});
			let res = await req.json();
			return res;
		} catch(e) {
			return {};
		}
	}

	async get_user_names(uids) {
		let req = await fetch(`https://us-central1-alexisbarreyat-bereal.cloudfunctions.net/getUserNames`, {
		  body: JSON.stringify({data: { uids }}),
		  headers: {
		    'Authorization': `Bearer ${this.user.access_token}`,
		    "Content-Type": "application/json",
		  },
		  method: "POST"
		});
		console.log(await req.text())
		let res = await req.json();
		return res;
	}

	async get_own_username() {
		try {
			return (await this.get_user_names([this.user.user_id]))?.result[0]?.userName;
		} catch (e) {
			return '';
		}
	}
}

module.exports = Client;