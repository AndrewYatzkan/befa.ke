let splash = document.querySelector('#splash');
let app = document.querySelector('#app');

var HTML = {
	BANNER: `<img class="App-logo" src="assets/logo.png">`,
	INFO: `<img class="App-group" src="assets/info.png" onclick="build_info_popup(true);">`,
	PROFILE: `<img class="App-user-profile" src='assets/default_pfp.jpg'>`
};

(async () => {
	try {
		let req = await fetch('/me');
		let res = await req.json();
		let {phone_number, profile_picture_url, user_id, username} = res;
		window.user_id = user_id;
		window.my_username = username;
		var signed_in = !!phone_number;
		if (profile_picture_url) {
			let pfp =  'proxy/' + profile_picture_url;
			HTML.PROFILE = HTML.PROFILE.replace('assets/default_pfp.jpg', pfp);
		}
		// var signed_in = true;
	} catch (e) {
		var signed_in = false;
	}

	if (!signed_in) {
		// navigate to login page
		build_login_page();

		build_info_popup(true);
	} else {
		// navigate to main page/friend feed
		build_friend_feed_page();

		build_info_popup();
		// build_bereal_take_page();
	}
})();

// TODO: deal with flickering later
show_app();
function show_app() {
	splash.style.zIndex = -1;
}

// const pageAccessedByReload = (
//   (window.performance.navigation && window.performance.navigation.type === 1) ||
//     window.performance
//       .getEntriesByType('navigation')
//       .map((nav) => nav.type)
//       .includes('reload')
// );

// alert(pageAccessedByReload);