DISCOVERY_LOCK = false;

async function get_feed_friends() {
	let req = await fetch('/feed/friends');
	let posts = await req.json();
	window.localStorage.setItem('friend-feed', JSON.stringify(posts));
}

async function get_feed_discovery(last_index) {
	if (DISCOVERY_LOCK) return false;
	DISCOVERY_LOCK = true;
	let req = await fetch(`/feed/discovery?last_index=${last_index}`);
	let res = await req.json();
	setTimeout(() => DISCOVERY_LOCK = false, 1000);
	if (last_index) return res;
	window.localStorage.setItem('discovery-feed', JSON.stringify(res));
}

async function check_code(code, {vonageRequestId, sessionInfo}) {
	let req = await fetch('/check_code', {
		body: JSON.stringify({code, vonageRequestId, sessionInfo}),
		headers: {'Content-Type': 'application/json'},
		method: 'POST'
	});
	return await req.json();
}

function lateInSecondsToString(lateInSeconds){
	if (!lateInSeconds) return '';
	var h = Math.floor(lateInSeconds / 3600);
    var m = Math.floor(lateInSeconds % 3600 / 60);
	return `${h||m} ${h?'hr':'min'} Late`;
}

async function latLongToString(lat, long, includeCountry){
	let res = await fetch(`https://nominatim.openstreetmap.org/reverse.php?lat=${lat}&lon=${long}&zoom=10&format=jsonv2`);
	let json = await res.json();
	let location = json?.name;
	
	if (includeCountry) { 
		let nameRes = await fetch(`https://nominatim.openstreetmap.org/reverse.php?lat=${lat}&lon=${long}&zoom=3&format=jsonv2`);
		let jsonRes = await nameRes.json();
		let countryLocation = jsonRes?.name;
		return `${location}, ${countryLocation}`;
	}

	return location;
}

// TODO: add vonage_id to database for concurrent verifications
// TODO: fix empty response for phone nums
async function login(phone_number) {
	let req = await fetch('/login', {
		body: JSON.stringify({phone_number}),
		headers: {'Content-Type': 'application/json'},
		method: 'POST'
	});
	let {error, vonageRequestId, sessionInfo, loggedin} = await req.json();

	if (error) return alert(`Error: ${error}`);
	if (loggedin) return window.location.reload();
	build_check_code_page({vonageRequestId, sessionInfo});
}


/* NICER ALERTS */

function iosAlert() {
try {
	var $alert = document.querySelector('.alert');
	$alert.parentElement.removeChild($alert);
} catch ($error) {}
const callback_fn = arguments[2];
var $alert = document.createElement('span');
if (arguments[1] == null) {
	arguments[1] = window.location.protocol + '//' + window.location.hostname;
}
$alert.innerHTML = '<div class="alert"><div class="inner"><div class="title">' + arguments[1] + '</div><div class="text">' + arguments[0] + '</div></div><div class="button">OK</div></div>';
document.querySelector('body').appendChild($alert);
setTimeout(function() {
	document.querySelector('.alert .button:last-child').addEventListener("click", function() {
		$alert.parentElement.removeChild($alert);
		callback_fn && typeof callback_fn === 'function' && callback_fn();
	});
});
return false;

}

function init_ffmpeg_wasm() {
	const { createFFmpeg, fetchFile } = FFmpeg;
	const ffmpeg = createFFmpeg({
	  corePath: './ffmpeg/ffmpeg-core.js',
	  log: true//false
	});
	// await ffmpeg.load();
	ffmpeg.load();
	return [ffmpeg, createFFmpeg, fetchFile];
}

function proxy(url) {
	if (!url) return false;
	url = url.replace(/^https:\/\/storage\.bere\.al\//, 'proxy/');
	url = url.replace(/^https:\/\/cdn\.bereal\.network\//, 'proxy/');
	return url;
}


async function get_extension(file) {
	let buf = await file.arrayBuffer();
	let arr = new Uint8Array(buf);
	arr = Array.from(arr).map(b => b.toString(16).padStart(2, '0').toUpperCase())
	console.log(arr);
	let signatures = {
		'png': '89504E470D0A1A0A',
		'jpg': 'FFD8FF', // beginning of all 5 kinds
		'gif': '47494638', // beginning of both kinds
		'heic': '000000' // probably
	};
	for (let ext of Object.keys(signatures)) {
		buf = signatures[ext];
		console.log(arr.slice(0, buf.length), buf);
		if (arr.slice(0, buf.length/2).join('') === buf) return ext;
	}
	return 'unknown';
}

async function process_file(file, offset, rect/*, username='-'*/) {
	if (offset !== null) {
	  if (isNaN(offset[0])) offset[0] = 0;
	  if (isNaN(offset[1])) offset[1] = 0;
	  offset = offset.map(x => Math.round(x, 5));
	}

  let { name } = file;
  let ext = await get_extension(file);
  if (ext == 'unknown') ext = name.substr(name.lastIndexOf('.') + 1).toLowerCase();

  if (ext == 'heic') {
  	let res = await heic2any({
          blob: file,
          toType: 'image/jpeg'
    });
    file = new File([res], 'out.jpeg', {type: 'image/jpeg'});
    ext = 'jpeg';
  }
  name = `input.${ext}`;
  ffmpeg.FS('writeFile', name, await fetchFile(file));


  ffmpeg.setProgress(({ ratio }) => {
    console.log(ratio);
  });

  // await ffmpeg.run('-i', name, '-vf', 'crop=1500:2000:0:0', 'output.gif');
  // console.log(offset, rect);
  // return;
  // console.log(offset, rect);
  // console.log(offset, rect);
  try {
  	// throw new Error("test");
  	if (offset !== null)
	  	var crop = `crop='if(gt(iw/3*4,ih),ih/4*3,iw)':'if(gt(iw/3*4,ih),ih,iw/3*4)':'if(gt(iw/3*4,ih),ih*${Math.abs(offset[0]/rect.width)},0)':'if(gt(iw/3*4,ih),0,iw*${Math.abs(offset[1]/rect.height)})'`;
	  else
	  	var crop = `crop='if(gt(iw,ih),ih,iw)':'if(gt(iw,ih),ih,iw)':0:0`;
	  // let crop = Math.abs(offset[0]) > 0 ? `crop=ih/4*3:ih:ih*${Math.abs(offset[0]/rect.width)}:0` : `crop=iw:iw/3*4:0:iw*${Math.abs(offset[1]/rect.height)}`;
	  var cropped = 'cropped-' + name;
	  let x = await ffmpeg.run('-i', name, '-vf', crop, cropped);
	} catch (e) {
		// TODO: FIX CROPPING ERROR
		cropped = name;
	}
	// let authorized = [];
	if (true || offset !== null)// && !authorized.includes(username))
  	var watermarkBuffer = await fetch('assets/befake-watermark.png').then(r => r.arrayBuffer());
  else
  	var watermarkBuffer = await fetch('assets/befake-watermark-empty.png').then(r => r.arrayBuffer());
  ffmpeg.FS('writeFile', 'watermark.png', new Uint8Array(watermarkBuffer, 0, watermarkBuffer.length));
  let data;
  if (/\.(mp4|mov)$/i.test(name)) {
    // video to crap quality gif
    await ffmpeg.run('-i', cropped, '-vf', 'scale=220:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse', 'output1.gif');

    // gif to watermarked gif
    await ffmpeg.run('-i', 'output1.gif', '-i', 'watermark.png', '-filter_complex', '[1][0]scale2ref=w=oh*mdar:h=ih*1.0[logo][video];[video][logo]overlay=10:main_h-overlay_h-10', 'output2.gif');

    data = ffmpeg.FS('readFile', 'output2.gif');
  } else if (/\.gif$/i.test(cropped)) {
    // gif to watermarked gif
    // await ffmpeg.run('-i', cropped, '-i', 'watermark.png', '-filter_complex', '[1]scale=iw/2:-1[b];[0:v][b] overlay', 'output2.gif');
    await ffmpeg.run('-i', cropped, '-i', 'watermark.png', '-filter_complex', '[1][0]scale2ref=w=oh*mdar:h=ih*1.0[logo][video];[video][logo]overlay=10:main_h-overlay_h-10', 'output2.gif');

    data = ffmpeg.FS('readFile', 'output2.gif');
  } else {
    // assume still image
    // still image to watermarked jpg
    await ffmpeg.run('-i', cropped, '-i', 'watermark.png', '-filter_complex', '[1][0]scale2ref=w=oh*mdar:h=ih*1.0[logo][video];[video][logo]overlay=10:main_h-overlay_h-10', 'output2.jpg');


    data = ffmpeg.FS('readFile', 'output2.jpg');
  }

  // var enc = new TextDecoder('ascii');
  // return enc.decode(data.buffer);

  // video.src = URL.createObjectURL(new Blob([data.buffer], { type: 'image/gif' }));
  return data.buffer;
}

function createInput(selector, name){
	var input = document.createElement('input');
	input.name = name;
	input.type = 'file';
	input.accept = ".png, .webp, .jpg, .gif, .jpeg, .mov, .mp4, .heic";

	input.addEventListener('change', async function(){
		let file = input.files[0];
		const url =  URL.createObjectURL(file);
		document.querySelector(`${selector}`).style.backgroundImage = `url("${url}")`;
		document.querySelector(`${selector}`).style.backgroundSize = `cover`;
		document.querySelector(`${selector}`).style.border = `2px solid rgba(255,255,255,0.8)`;
		document.querySelector(`${selector}>.upload-instructions`).style.display = `none`;
		document.querySelector(`${selector}>.upload-icon`).style.display = `none`;
		document.querySelector(`${selector}`).onclick = (event) => {
			event.stopPropagation();
		};
		$(selector).backgroundDraggable();
	});
	
	input.style.display = `none`;
	input.id = selector.substring(1,);
	document.querySelector('#img-input-form').appendChild(input);
	
	input.click();
}

function createInputCanvas(selector, name){
	var input = document.createElement('input');
	input.name = name;
	input.type = 'file';
	input.accept = ".png, .webp, .jpg, .gif, .jpeg, .mov, .mp4, .heic";

	input.addEventListener('change', async function(){


		const file = input.files[0];
		const isVideo = file.type.includes('video');
		const url =  URL.createObjectURL(file);
		// document.querySelector(`${selector}`).style.backgroundImage = `url("${url}")`;
		// document.querySelector(`${selector}`).style.backgroundSize = `cover`;
		document.querySelector(`${selector}`).style.border = `2px solid rgba(255,255,255,0.8)`;
		document.querySelector(`${selector}>.upload-instructions`).style.display = `none`;
		document.querySelector(`${selector}>.upload-icon`).style.display = `none`;
		document.querySelector(`${selector}`).onclick = (event) => {
			event.stopPropagation();
		};

		let canvas = document.querySelector(`${selector}-canvas`);
		canvas.style.display = `inline-block`;

		const {width, height} = canvas.getBoundingClientRect();
		canvas.width = width;
		canvas.height = height;
		let baseX = width*0.025;
		let baseY =  height*0.9;

		let baseImgPos = {x: 0, y: 0};
		var dragBase = {
			x: 0,
			y: 0
		}

		let imgX = 0;
		let imgY = 0;

		var mouseDown = false;
		document.addEventListener('mousemove', (e) => {
			// var rect = canvas.getBoundingClientRect();
			if (mouseDown) { 
				imgX = baseImgPos.x + (e.x - dragBase.x);
				imgY = baseImgPos.y + (e.y - dragBase.y);
			}
		})
		canvas.addEventListener('mousedown', (e) => {
			mouseDown = true;
			baseImgPos = {x: imgX, y: imgY};
			dragBase = {
				x: e.x,
				y: e.y
			}
		})
		document.addEventListener('mouseup', () => {
			mouseDown = false;
		})

		let mediaElement = isVideo ? document.createElement('video') : document.createElement('img');
		mediaElement.src = url;

		if (isVideo){
			mediaElement.type = "video/mp4";
			mediaElement.loop = true;
			mediaElement.muted = true;
			mediaElement.setAttribute('isVideo', true)
			mediaElement.className = `${selector}-media`;
		}

		let ogWidth = width;
		let ogHeight = height;

		function loop() { 
			const {width, height} = canvas.getBoundingClientRect();

			if (width != ogWidth){
				imgX = imgX * (width/ogWidth);
				ogWidth = width;
			}

			if (height != ogHeight){
				imgY = imgY * (height/ogHeight);
				ogHeight = height;
			}
			baseX = width*0.025;
			baseY =  height*0.9;
			let ctx = canvas.getContext("2d");
			ctx.clearRect(0,0,width, height);

			ctx.drawImage(mediaElement, imgX, imgY, width, ((mediaElement.videoHeight || mediaElement.naturalHeight) / (mediaElement.videoWidth || mediaElement.naturalWidth)) * width);
			
			const watermarkHeight = height/537.59375*40;
			const watermarkWidth = width/393.296875*100;
			const watermarkFontSize = height/537.59375*25;


			ctx.fillStyle='#000';
			ctx.fillRect(baseX, baseY, watermarkWidth, watermarkHeight);

			ctx.fillStyle = '#fff';
			ctx.font = `${watermarkFontSize}px sans-serif`;
			let lineHeight = ctx.measureText('M').width;
			let lineWidth = ctx.measureText('befa.ke').width;
			ctx.fillText('befa.ke', baseX+(watermarkWidth-lineWidth)/2, baseY+(watermarkHeight-lineHeight/2));
		}

		function moveLoop(){
			loop();
			requestAnimationFrame(moveLoop);
		}
		
		let mediaIsPlaying = false;
		if (isVideo){
			mediaElement.play(); 
			mediaElement.addEventListener('loadeddata', function() {
				moveLoop(); //Start rendering
			});
			document.querySelector(`${selector}`).onclick = function(event){
				if (!mediaIsPlaying) { 
					mediaElement.play();
					mediaIsPlaying = true;
				}
				event.stopPropagation();
			};
		} else { 
			moveLoop();
		}

		// $(selector).backgroundDraggable();
	});
	
	input.style.display = `none`;
	input.id = selector.substring(1,);
	document.querySelector('#img-input-form').appendChild(input);
	
	input.click();
}
// async function process_file(file, offset, rect) {
// 	var fr = new FileReader;
// 	fr.onload = function() { // file is loaded
//     var img = new Image;

//     img.onload = async function() {
// 		const factor = img.height / rect.height;
// 		let { name } = file;

// 		if (name.substr(name.lastIndexOf('.') + 1).toLowerCase() == 'heic') {
// 			let res = await heic2any({
// 				blob: file,
// 				toType: 'image/jpeg'
// 			});
// 			file = new File([res], 'out.jpeg', {type: 'image/jpeg'});
// 		}
// 		ffmpeg.FS('writeFile', name, await fetchFile(file));


// 		ffmpeg.setProgress(({ ratio }) => {
// 			console.log(ratio);
// 		});


// 		await ffmpeg.run('-i', name, '-vf', `crop=${1500/2000 * img.height}:${img.height}:${offset[0]*factor}:${offset[1]*factor}`, 'output.gif');
// 		const watermarkBuffer = await fetch('assets/befake-watermark.png').then(r => r.arrayBuffer());
// 		ffmpeg.FS('writeFile', 'watermark.png', new Uint8Array(watermarkBuffer, 0, watermarkBuffer.length));
// 		let data;
// 		if (/\.(mp4|mov)$/i.test(name)) {
// 			// video to crap quality gif
// 			await ffmpeg.run('-i', name, '-vf', 'scale=220:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse', 'output1.gif');

// 			// gif to watermarked gif
// 			await ffmpeg.run('-i', 'output1.gif', '-i', 'watermark.png', '-filter_complex', '[1]scale=iw/2:-1[b];[0:v][b] overlay', 'output2.gif');

// 			data = ffmpeg.FS('readFile', 'output2.gif');
// 		} else if (/\.gif$/i.test(name)) {
// 			// gif to watermarked gif
// 			await ffmpeg.run('-i', name, '-i', 'watermark.png', '-filter_complex', '[1]scale=iw/2:-1[b];[0:v][b] overlay', 'output2.gif');

// 			data = ffmpeg.FS('readFile', 'output2.gif');
// 		} else {
// 			// assume still image
// 			// still image to watermarked jpg
// 			await ffmpeg.run('-i', name, '-i', 'watermark.png', '-filter_complex', '[1]scale=iw/2:-1[b];[0:v][b] overlay', 'output2.jpg');

// 			data = ffmpeg.FS('readFile', 'output2.jpg');
// 		}

// 		// var enc = new TextDecoder('ascii');
// 		// return enc.decode(data.buffer);

// 		// video.src = URL.createObjectURL(new Blob([data.buffer], { type: 'image/gif' }));
// 		return data.buffer;

// 	};

// 	img.src = fr.result; // is the data URL because called with readAsDataURL
// 	};
// 	fr.readAsDataURL(file); 
// }