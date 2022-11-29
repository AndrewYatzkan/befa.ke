module.exports = {
	PRICES: {
		POST_GIF_BEREAL: 100,
		UPLOAD_GIF_REALMOJI_INSTANT: 5,
		UPLOAD_GIF_REALMOJI_OTHER: 50,
		REMOVE_POST_WATERMARK: 50
	},

	ERRORS: {
		UNKNOWN_FILE_TYPE: 'One or more images not one of jpg, png, heic, or gif.',
		UNPERMITTED_GIF: 'Request with type "still" includes one or more gifs.',
		INSUFFICIENT_FUNDS: 'Insufficient funds.',
		STILLS_ONLY: 'Request with type "gif" includes only stills.',
		BAD_TYPE: 'Invalid type',
		NO_PHOTOS: 'Missing photo(s)',
		MISSING_PARAMS: 'Missing parameter(s)',
		INVALID_NUMBER: 'Invalid phone number'
	}
};