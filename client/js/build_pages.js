function build_info_popup(force) {
	let has_visited = localStorage.getItem('has-visited');
	if (has_visited && !force) return;
	if (!has_visited) localStorage.setItem('has-visited', 'true');
	document.querySelector('#info')?.remove();
	let div = document.createElement('div');
	div.id = 'info';
	div.style.position = 'fixed';
	div.style.width = '90%';
	div.style.background = '#5d5d5d';
	div.style.left = '5%';
	div.style.top = '5%';
	div.style.padding = '1rem';
	div.style.boxSizing = 'border-box';
	div.style.overflowY = 'scroll';
	div.style.zIndex = '999';
	div.style.maxHeight = '80vh';
	div.innerHTML = `
    <a href="#" style="float:right;" onclick="this.parentElement.remove();">CLOSE [x]</a>
    <h1 style="font-family: sans-serif; margin-top: 0; font-size: 28px;">
        Welcome to BeFake!
        <p style="font-size: 12pt; margin: 0; margin-top: -15px;">
            (join us on <a target="_blank" href="https://discord.gg/WrFzrpqKHg">Discord</a><img src="assets/discord.png" width="32" height="32" style="top: 10px; position: relative; margin: 0 3px;">)
        </p>
    </h1>
    <h2 style="font-family: sans-serif;">
        What is BeFake?
    </h2>
    <p>BeFake is a web clone of the BeReal app that uses its database, but allows some features that the app does not.</p>
    <h2 style="font-family: sans-serif;">
        What can I do with it?
    </h2>
    <p>This site is still a work-in-progress, but you can currently:</p>
    <ul style="list-style-type: none; padding-left: 15px;">
        <li>🎥 Upload any photo <i>or video</i> from your camera roll</li>
        <li>👀 View posts without having already posted</li>
        <li>🤫 Secretly screenshot or save posts</li>
    </ul>
    <h2 style="font-family: sans-serif;">
        Why is this a thing?
    </h2>
    <p>
        This was mostly created out of curiosity, also...
		<img width="300" height="100" style="margin-top:10px;" src="assets/bereal_appstore.png"/>
		<br><br>
        ⚠️ This isn't intended to take the fun out of BeReal. It's a great app and I'll happily take this down if it jeopardizes the beauty of the platform.
</p>
    <h2 style="font-family: sans-serif;">
        From the BeReal team?
    </h2>
    <p>
    Click <a href="mailto:the@reale.st">here</a> to offer me a job or <a target="_blank" href="https://storage.bere.al/Photos/rBBCVMZ5KUceXMji6pzXQBL3wDw1/bereal/some_name4.png">here</a> to send a cease and desist.
    </p>`;
	document.querySelector('#app').appendChild(div);
}

window.locationFillIns = null;
function build_login_page() {
	app.innerHTML = `
	<div class="App">
      ${HTML.BANNER}
      <div class="App-text">Create your account using your phone number</div>
      
      <div class="App-inputs">
      	<input inputmode="tel" placeholder="Your Phone" class="App-text-input">
      </div>

      <button class="App-continue-button">Continue</button>
    </div>`;

    let inp = app.querySelector('input');
    let btn = app.querySelector('button');
    inp.oninput = () => {
    	// // very basic phone number validation
    	// if (/^\+[0-9]{5,}$/.test(inp.value))
    	if (inp.value.length > 5)
    		btn.classList.add('enabled');
		else
			btn.classList.remove('enabled');
    }

    btn.onclick = async () => {
    	if (!btn.classList.contains('enabled')) return;

    	await login(inp.value);
    }
}

let locationQueue = [];
async function fetchLocationForPost(location, post_id, lateInSeconds, should_fetch_country){
	locationQueue.push(arguments);
}

async function fetchLocationForPostExecute(location, post_id, lateInSeconds, should_fetch_country){
	location_string = await latLongToString(location._latitude, location._longitude, should_fetch_country).catch(console.log);
	if (location_string) {
		let meta = [location_string, lateInSecondsToString(lateInSeconds)].filter(a=>a).join(' • ');
		let el = document.querySelector(`#sel-${post_id}-meta`);
		if (el) el.innerText = meta;
	}
}

function processCommentText(text){
	return text.replace(/(@[^\s]+)/g, '<span class="mention">$1</span>')
}

function deleteCommentPrompt(event, content, owner_id, post_id){
	event.preventDefault();

	// TODO: make this a button that slides up from the bottom like in the ios app
	window.iosAlert('This cannot be undone.', 'Delete comment?', () => {
		fetch(`/comments/delete`,	{
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				content: content,
				owner_id: owner_id,
				photo_id: post_id,
			})
		} ).then(res => res.text()).then(text => {
			if (text === 'OK'){	
				console.log('Comment successfully deleted');
				build_friend_feed_page(true, post_id);
			}
		})
	});
}
async function build_comment_section_page(comments, owner_id, post_id){
	let commentsStr = ``;
	if (comments) { 
	// TODO: Get username and calculate how long ago it was posted
	for (let comment of comments){
			commentsStr += `<div oncontextmenu="deleteCommentPrompt(event, '${comment.text}', '${owner_id}', '${post_id}')" class="comment">
			<img class="profile-photo" src="${proxy(comment.user?.profilePicture?.url)||'assets/default_pfp.jpg'}"/>
			<div class="leading-text">
				<h2 class="comment-author">${comment.user.username}</h2>
				<h2 class="comment-body">${processCommentText(comment.text)}</h2>
				<h2 class="comment-reply">Reply</h2>
			</div>
			<div class="trailing-text">
				<h2 class="comment-time">${moment(comment.creationDate._seconds*1000).fromNow()}</h2>
			</div>
		</div>`
		}
	}	
    app.innerHTML = `<div class="App" style="overflow-x: hidden;">
    <div class="top-name">
		<img class="menu-control" src="assets/arrow2.png"/>
    	<h1 class="top-name-text">${window.my_username}</h1>
		<img class="menu-options" src="assets/more.png"/>
    </div>
        <div class="page-menu">
            <div class="comments-tab selected-tab">
                <h2 class="tab-title">Comments (1)</h2>
            </div>
            <div class="realmojis-tab">
                <h2 class="tab-title">RealMojis</h2>
            </div>
        </div>
        <div class="comments-list">
			${commentsStr}
        </div>
        <div class="enter-comment">
            <input class="comment-input" type="text" placeholder="Add a comment..." /> 
            <h2 class="send-btn">Send</h2>
        </div>
    </div>`;
	app.querySelector('.menu-control').onclick = function(){
		build_friend_feed_page();
	}

	app.querySelector('.comment-input').onkeyup = function(event) {
			const {target: {value}} = event;
			if (value.trim() !== ''){
				app.querySelector('.send-btn').style.color = 'rgb(55, 125, 255)';
				app.querySelector('.send-btn').style.opacity = 0.9;
				window.canSendComment = true;
			} else {
				app.querySelector('.send-btn').style.color = 'white';
				app.querySelector('.send-btn').style.opacity = 0.4;
				window.canSendComment = false;
			}
	}

	app.querySelector('.send-btn').onclick = function(){
		fetch(`/comments/send`,	{
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				content: app.querySelector('.comment-input').value,
				owner_id: owner_id,
			})
		} ).then(res => res.text()).then(text => {
			if (text === 'OK'){
				console.log('Comment deleted successfully');
				build_friend_feed_page(true, post_id);
			}
		})
	}

	app.querySelector('.menu-options').onclick = function(){
		window.iosAlert('Reporting is not enabled on BeFake.', 'BeFake!');
	}
}

async function build_discovery_feed_page() {
	clearInterval(window.locationFillIns);
	locationQueue = [];
	window.locationFillIns = setInterval(() => {
		if (locationQueue.length !== 0) { 
			fetchLocationForPostExecute(...locationQueue.shift());
		}
	}, 1000);
	app.innerHTML = `
    <div class="App">
        <div class="App-header">
        ${HTML.INFO}
        ${HTML.BANNER}
        ${HTML.PROFILE}
        </div>
      <div class="App-tab-control">
      	<div id="friends" class="App-text muted" style="font-size: 15px;">My Friends</div>
      	<div class="App-text" style="font-size: 15px;">Discovery</div>
      </div>  
      <div class="App-br-posts-container"> 
      </div>
    </div>
	`;
	let friends = app.querySelector('#friends');
	friends.addEventListener('click', ()=>build_friend_feed_page());

	let posts_container = app.querySelector('.App-br-posts-container');
	posts_container.style.display = 'none';

	// TODO: be more thoughtful about loading
	let json = window.localStorage.getItem('discovery-feed');
	if (!json || JSON.parse(json).error) {
		await get_feed_discovery();
		json = window.localStorage.getItem('discovery-feed');
	} else {
		get_feed_discovery();
	}

	json = JSON.parse(json);
	let posts = json.posts;
	DISCOVERY_LAST_INDEX = json.lastIndex;

	for (let post of posts) {
		// TODO: change default pfp
		console.log(post);
		let pfp_url = proxy(post.user.profilePicture?.url) || 'assets/default_pfp.jpg';
		let location_string = ``;
		if (post.location) { 
			location_string = `Lat: ${post.location._latitude}, Lng: ${post.location._longitude}`;
			fetchLocationForPost(post.location, post.id, post.lateInSeconds, true).catch(console.log);
		}

		let div = post_html(post.id, post.ownerID, post.comment, pfp_url, post.user.username, post.photoURL, post.secondaryPhotoURL, post.caption, post.comment.length, location_string, post.lateInSeconds, window.hasPosted, true);
		posts_container.appendChild(div);
	}
}

app.addEventListener('scroll', async () => {
	let is_discovery = !!document.querySelector('#friends');
	if (!is_discovery) return;

	// append posts to discovery / infinite scrolling
	if (app.scrollHeight - app.scrollTop < app.offsetHeight * 5) {
		let json = await get_feed_discovery(DISCOVERY_LAST_INDEX);
		console.log(json);
		if (!json) return;
		DISCOVERY_LAST_INDEX = json.lastIndex;
		let posts_container = app.querySelector('.App-br-posts-container');
		for (let post of json.posts) {
			// TODO: change default pfp
			let pfp_url = proxy(post.user.profilePicture?.url) || 'assets/default_pfp.jpg';
			let location_string = ``;
			if (post.location) {
				location_string = `Lat: ${post.location._latitude}, Lng: ${post.location._longitude}`;
				fetchLocationForPost(post.location, post.id, post.lateInSeconds, true).catch(console.log);
			}
			let div = post_html(post.id, post.ownerID, post.comment, pfp_url, post.user.username, post.photoURL, post.secondaryPhotoURL, post.caption, post.comment.length, location_string, post.lateInSeconds, window.hasPosted);
			posts_container.appendChild(div);
		}
	}
});

let [ffmpeg, createFFmpeg, fetchFile] = init_ffmpeg_wasm();
async function build_bereal_take_page(){
		window.toastRef?.hideToast();
		if (window.toastRef) window.toastRef.isHidden = true;
		app.innerHTML =  `<div class="App">
			<div class="my-dropzone"></div>
			<div class="img-src">
				<div class="img-upload-load">
					<div class="lds-ring"><div></div><div></div><div></div><div></div></div>
					<h1 class="loading-info wsy">We're sending your BeReal...</h1>
					<h3 class="loading-info pht">Please Hang Tight</h3>
				</div>
				<div class="img-outer-upload">
						<!-- <canvas class="img-outer-upload-canvas"></canvas> --> 
						<div class="img-inner-upload">
						<!-- <canvas class="img-inner-upload-canvas"></canvas> -->
						<div class="upload-instructions">
							Drag back image here
						</div>
						<img src="assets/upload-icon.png" class="upload-icon" />
					</div>
					<div class="upload-instructions">
						Drag front image here
					</div>
					<img src="assets/upload-icon.png" class="upload-icon" />
				</div>
			</div>
			<div id="post-br" class="submit-btn btn-grad">Post to BeReal</div>
			<div class="go-back">Nah, Go Back</div>
			<form id="img-input-form">
				<input style="display:none;" type="text" name="type" value="still"/>
			</form>
		</div>`;
		app.querySelector('.img-inner-upload').onclick = function(event){
            createInput('.img-inner-upload', 'front');
            event.stopPropagation();
        }

        app.querySelector('.img-outer-upload').onclick = function(){
            createInput('.img-outer-upload', 'back');
        }

		app.querySelector('.go-back').onclick = function(){
            build_friend_feed_page();
        }

		app.querySelector('#post-br').onclick =  postBtnOnClick;

		async function postBtnOnClick() {
			// let mainCanvas = document.querySelector('.img-outer-upload-canvas');
			// let secondaryCanvas = document.querySelector('.img-inner-upload-canvas');

			// let newParent = secondaryCanvas.parentNode.parentNode; 
			// secondaryCanvas.parentNode.removeChild(secondaryCanvas);
			// newParent.appendChild(secondaryCanvas);

			// mainCanvas.width = 1500;
			// mainCanvas.height = 2000;
			// mainCanvas.style.width = '1500px';
			// mainCanvas.style.height = '2000px';

			// secondaryCanvas.width = 1500;
			// secondaryCanvas.height = 2000;
			// secondaryCanvas.style.width = '1500px';
			// secondaryCanvas.style.height = '2000px';

			// mainCanvas.style.opacity = 0;
			// secondaryCanvas.style.opacity = 0;
			// document.querySelector('.img-outer-upload').style.opacity = 0;
			// document.querySelector('.img-upload-load').style.opacity = 1;
			// document.querySelector('.img-upload-load').style.display = 'flex'; 

			app.querySelector('#post-br').innerText = "Loading..";
			app.querySelector('#post-br').onclick = () => {};

			setTimeout( async () => { 
				let front = document.querySelector('input[name=front]').files[0];
				let back = document.querySelector('input[name=back]').files[0];

				let front_pos = document.querySelector('.img-outer-upload').style.backgroundPosition.split(' ').map(parseFloat);
				let back_pos = document.querySelector('.img-inner-upload').style.backgroundPosition.split(' ').map(parseFloat);

				const front_rect = document.querySelector('.img-outer-upload').getBoundingClientRect();
				const back_rect = document.querySelector('.img-outer-upload').getBoundingClientRect();

				let front_buf = await process_file(front, front_pos, front_rect);
				let back_buf = await process_file(back, back_pos, back_rect);

				let front_blob = new Blob([front_buf], { type: 'application/octet-stream' });
				let back_blob = new Blob([back_buf], { type: 'application/octet-stream' });
				let front_file = new File([front_blob], 'front', { type: 'application/octet-stream' });
				let back_file = new File([back_blob], 'back', { type: 'application/octet-stream' });
				let form_data = new FormData();
				form_data.append('front', front_file);
				form_data.append('back', back_file);

				console.log("FRONT:", URL.createObjectURL(front_file))
				console.log("BACK:", URL.createObjectURL(back_file))

				// let mainImgUrl = mainCanvas.toDataURL('image/jpeg', 0.3);
				// let secondaryImgUrl = secondaryCanvas.toDataURL('image/jpeg', 0.3);

				// let main_img_blob = await (await fetch(mainImgUrl)).blob();
				// let secondary_img_blob =  await (await fetch(secondaryImgUrl)).blob();

				// let front_file = new File([main_img_blob], 'front', { type: 'application/octet-stream' });
				// let back_file = new File([secondary_img_blob], 'back', { type: 'application/octet-stream' });
				
				// let form_data = new FormData();
				// form_data.append('front', front_file);
				// form_data.append('back', back_file);

				let req = await fetch('/post', {
					body: form_data,
					method: 'POST'
				});
				alert("Posted");
				build_friend_feed_page();

				setTimeout(() => {
					app.querySelector('#post-br').innerText = "Post to BeReal";
					app.querySelector('#post-br').onclick = postBtnOnClick;
				}, 1000);
			}, 1000);
		}
}

function build_new_post_toast(posts) {
	let friends_feed_active = !!document.querySelector('#discovery.muted');
	if (!friends_feed_active || posts?.length < 1) return;
	let toast = document.querySelector('.toast');
	toast.innerHTML = `${posts.length} new post(s). <button>Click to refresh</button>`;
	toast.querySelector('button').onclick = () => build_friend_feed_page();
}

async function build_friend_feed_page(forceRefresh, focusPost) {
	clearInterval(window.locationFillIns);
	clearInterval(window.refreshFriendFeed);
	locationQueue = [];
	window.locationFillIns = setInterval(() => {
		if (locationQueue.length !== 0) { 
			fetchLocationForPostExecute(...locationQueue.shift());
		}
	}, 1000);
	app.innerHTML = `
    <div class="App">
        <div class="App-header">
        ${HTML.INFO}
        ${HTML.BANNER}
        ${HTML.PROFILE}
        </div>
      <div class="App-tab-control">
      	<div class="App-text" style="font-size: 15px;">My Friends</div>
      	<div id="discovery" class="App-text muted" style="font-size: 15px;">Discovery</div>
      </div>
      <div class="toast"></div>
      <div class="App-br-posts-container"> 
      </div>
    </div>
	`;
	let discovery = app.querySelector('#discovery');
	discovery.addEventListener('click', build_discovery_feed_page);

	let posts_container = app.querySelector('.App-br-posts-container');
	posts_container.style.display = 'none';

	// TODO: be more thoughtful about loading
	let posts = window.localStorage.getItem('friend-feed');
	if (!posts || JSON.parse(posts).error || forceRefresh) {
		await get_feed_friends();
		posts = window.localStorage.getItem('friend-feed');
	}

	// TODO: doesn't work when signing into new account?
	async function new_posts() {
		let old_posts = window.localStorage.getItem('friend-feed');
		await get_feed_friends();
		let new_posts = window.localStorage.getItem('friend-feed');
		if (new_posts !== old_posts) {// new post
			old_posts = JSON.parse(old_posts);
			new_posts = JSON.parse(new_posts);
			new_posts = new_posts.filter(post => old_posts.map(x => x.id).indexOf(post.id) < 0);
			build_new_post_toast(new_posts);
		}
	}
	window.refreshFriendFeed = setInterval(new_posts, 10 * 1000);

	posts = JSON.parse(posts);
	window.hasPosted = posts.map(p=>p.user.id).includes(window.user_id);
	if (window.toastRef && window.toastRef.isHidden){
		window.toastRef.showToast();
	} else if (!window.hasPosted && !window.hasToasted){
		window.hasToasted = true;
		let toastDiv = document.createElement('div');
		toastDiv.innerHTML = `
		<div class="toast-node">
			<img src="assets/logo.png" class="toast-logo"/>
			<h3 class="toast-node-text">Want to view posts?</h3>
			
			<button class="unlock-now">Unlock Now</button>
		</div>
		`;
		window.toastRef = Toastify({
			text: "Want to view posts?",
			node: toastDiv,
			duration: -1,
			newWindow: true,
			close: false,
			avatar: "assets/logo.png",
			gravity: "bottom", // `top` or `bottom`
			position: "center", // `left`, `center` or `right`
			stopOnFocus: true, // Prevents dismissing of toast on hover
			style: {
			  background: "black",
			  border: '2px solid rgba(255,255,255,0.1)',
			  fontFamily: 'sans-serif',
			},
			onClick: function(){
				window.bfake_unlocked = true;
				build_friend_feed_page();
				window.toastRef.hideToast();
			} // Callback after click
		  }).showToast();
		
	}
	// window.hasPosted = true;

	for (let post of posts) {
		// TODO: change default pfp
		let pfp_url = proxy(post.user.profilePicture?.url) || 'assets/default_pfp.jpg';
		let location_string = ``;
		if (post.location) { 
			location_string = `Lat: ${post.location._latitude}, Lng: ${post.location._longitude}`;
			fetchLocationForPost(post.location, post.id, post.lateInSeconds, false).catch(console.log);
		}
		let div = post_html(post.id, post.ownerID, post.comment, pfp_url, post.user.username, post.photoURL, post.secondaryPhotoURL, post.caption, post.comment.length, location_string, post.lateInSeconds, window.hasPosted);
		posts_container.appendChild(div);

		if (post.id === focusPost){
			build_comment_section_page(post.comment, post.ownerID, post.id);
			return;
		}
	}

	console.log(posts);
	if (posts.length === 0){
		let postPromptDiv = document.createElement('div');
		postPromptDiv.innerHTML = `
			<div class="post-prompt-container">
				<h2 class="post-prompt-message">Your friends haven't posted their BeReal yet, be the first one.</h2>
				<div class="post-btn">
				<button id="take-bereal-button" class="App-post-late-br">Take your BeReal</button>
				</div>
			</div>
		`;
		posts_container.appendChild(postPromptDiv);
		posts_container.querySelector('#take-bereal-button').onclick = function(){
			build_bereal_take_page();
		}
		posts_container.style.display = 'block';
	} 
}

function build_realmoji_popup(name, post_id, owner_id){
	let realMojiPopup = document.createElement('div');
	realMojiPopup.id = 'screen-cover';
	document.querySelector('.App').style.filter = `blur(30px)`;

	// const realMojiPopupContent = `
	// 	<h1 class="rm-title">RealMoji</h1>
	// 	<p class="rm-txt">Choose a RealMoji to react to ${name}'s BeReal.</p>
	// `;
	const realMojiPopupContent = `
		<h1 class="rm-title" style="font-size: 1.5rem;">RealMoji</h1>
		<p class="rm-txt" style="font-size: 2rem;">Click here to upload a RealMoji.</p>
	`;
	realMojiPopup.innerHTML = realMojiPopupContent;
	let btn = realMojiPopup.querySelector('.rm-txt');
	let clicked = false;
	btn.onclick = e => {
		e.stopPropagation();
		if (clicked) return;
		clicked = true;
		btn.innerText = '';
		var input = document.createElement('input');
		input.name = "realmoji";
		input.type = 'file';
		input.accept = ".png, .webp, .jpg, .gif, .jpeg, .mov, .mp4, .heic";

		input.addEventListener('change', async function(){
			let file = input.files[0];
			btn.innerText = 'Loading...';
			console.log(file);

			let buf = await process_file(file, null, null);
			let blob = new Blob([buf], { type: 'application/octet-stream' });
			file = new File([blob], 'realmoji', { type: 'application/octet-stream' });

			let form_data = new FormData();
			form_data.append('realmoji', file);
			form_data.append('emoji', 'instant');
			form_data.append('type', '?');
			form_data.append('photo_id', post_id);
			form_data.append('owner_id', owner_id);
			let req = await fetch('/realmoji/upload', {
				body: form_data,
				method: 'POST'
			});

			let res = await req.json();
			alert(res?.emoji ? 'Success' : 'Error uploading RealMoji');
			realMojiPopup.remove();
			document.querySelector('.App').style.filter = `blur(0px)`;
		});
		
		input.style.display = `none`;
		btn.appendChild(input);
		
		console.log('onclick')
		input.click();
		console.log("Done");
	}
	realMojiPopup.onclick = function(){
		realMojiPopup.remove();
		document.querySelector('.App').style.filter = `blur(0px)`;
	}
	document.body.appendChild(realMojiPopup);
}

function openBottomSheet(){
	let bottomSheet = document.createElement('div');
	bottomSheet.innerHTML = `
			

	`;
}

function post_html(post_id, owner_id, comments, pfp_url, username, primary_photo, secondary_photo, caption, num_comments, location, lateInSeconds, unlocked=true, discovery=false) {
	if (window.bfake_unlocked) {
		unlocked = true;
	}
	const isOwnPost = window.hasPosted && owner_id === window.user_id;
	const hideIfOwnPost = isOwnPost?"style='display:none;'":"";
	let div = document.createElement('div');
	div.classList = `App-br-post ${isOwnPost?'App-own-post':''}`;
	div.id = `pid-${post_id}`;
	div.insertAdjacentHTML('beforeend', `
	        <div ${hideIfOwnPost} class="App-br-post-header">
	            <img class="App-user-profile" src=${pfp_url} />
	            <div class="App-user-info">
	            	<div id="username" class="App-text" style="font-size: 14px; font-weight: 500;"></div>
	            	<div id="sel-${post_id}-meta" class="App-text muted" style="font-size: 11px; font-weight: 500;">${[location, lateInSecondsToString(lateInSeconds)].filter(a=>a).join(' • ')}</div>
	            </div>
	            <img class="App-dots" src="assets/dots.png"/>
	        </div>
	        <div class="App-br-post-content ${isOwnPost ?  'own-content' : ''}">
	            <div ${hideIfOwnPost} class=${unlocked ? "App-realmoji-info" : "App-post-warning"}>
	                ${unlocked ? '<img id="realmoji-popup" class="App-view-realmojis" src="assets/smile.png"/>' : `
	                <div>
	                    <img class="App-invisible-img" src="assets/invisible.png"/>
	                    <div class="App-text" style="font-weight: 500; margin-top: 5px">Post to View</div>
	                    <div class="App-text" style="font-size: 12px; font-weight: 200; margin-top: 5px">To view some public BeReal, take your BeReal.</div>
	                    <button id="post-late-br" class="App-post-late-br">Post a Late BeReal.</button>
	                </div>`}
	            </div>
	            <img class="App-post-secondary-img ${unlocked ? 'App-secondary-img-unlocked' : 'App-post-blurred'} ${isOwnPost ? 'own-secondary-img' : ''}" src="${proxy(secondary_photo)}"/>
	            <img onload="$('.App-br-posts-container').css({display: 'block'});" class="App-post-main-img ${unlocked ? '' : 'App-post-blurred'} ${isOwnPost ? 'own-main-img' : ''}" src="${proxy(primary_photo)}"/>
	        </div> 
			<div ${isOwnPost?'':'style="display:none;'} class="own-post-timestamp">
				<h1 class="App-text muted" style="font-size: 12px; font-weight: 500;">${lateInSecondsToString(lateInSeconds)}</h1>
				<img class="App-dots app-own-dots" src="assets/dots.png"/>
			</div>
	        <div ${hideIfOwnPost} class="App-caption-holder">
	        	<div id="caption" class="App-text" style="font-size: 12.5px;"></div>
	        	<div id="view-comments" class="App-text view-comments" style="font-size: 12.5px; font-weight: 400;">${num_comments ? `View all ${num_comments} comments` : (discovery ? '' : 'Add a comment...')}</div>
	        </div>`);
	div.querySelector('#caption').innerText = caption || '';
	div.querySelector('#username').innerText = username;
	if (isOwnPost){
		div.onclick = function(){
			openBottomSheet();
		}
	}
		if (unlocked) { 
		div.querySelector('.App-dots').onclick = function(){
			window.iosAlert('Reporting is not enabled on BeFake.', 'BeFake!');
		}
		div.querySelector('#realmoji-popup').onclick = function(){
			build_realmoji_popup(username, post_id, owner_id);
		}
        div.querySelector('#view-comments').onclick = function(){
            build_comment_section_page(comments, owner_id, post_id);
        }
		// Image swapping 
		div.querySelector('.App-post-secondary-img').onclick = function(e) {
			if (isOwnPost) return;
			let currentSrc = e.currentTarget.src;
			let otherSrc = div.querySelector('.App-post-main-img').src;

			e.currentTarget.src = otherSrc;
			div.querySelector('.App-post-main-img').src = currentSrc;
		};

		// Draggable secondary img
		const draggable = new Draggable.Draggable(div, {
			draggable: '.App-post-secondary-img',

		});

		draggable.on('drag:move', (evt) => {
			let right = evt.data.sensorEvent.data.clientX > window.innerWidth / 2;
			evt.data.originalSource.style.right = right ? '2vw' : '';
		})

	} else {
		div.querySelector('#post-late-br').onclick = function(){
            build_bereal_take_page();
        }
	}
    return div;
}

function build_check_code_page({vonageRequestId, sessionInfo}) {
	app.innerHTML = `
	<div class="App">
      ${HTML.BANNER}
      <div class="App-text">Enter verification code</div>
      
      <div class="App-inputs">
      	<input inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" placeholder="Your Code" class="App-text-input">
      </div>
      <div class="errors" style="color: red;"></div>
    </div>`;

    let inp = app.querySelector('input');
    let btn = app.querySelector('button');
    let errs = app.querySelector('.errors');
    inp.oninput = async () => {
    	if (!(/^[0-9]{6}$/.test(inp.value))) return;
    	let {error} = await check_code(inp.value, {vonageRequestId, sessionInfo});
    	if (error) return errs.innerText = error;
    	window.location.reload();
    }
}

