require('dotenv').config();
const mongoose = require('mongoose');

const CONNECTION_STRING = process.env.DB_CONNECTION_STRING;

mongoose.connect(CONNECTION_STRING);
// {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
//   useFindAndModify: false,
//   useCreateIndex: true
// }

const connection = mongoose.connection;
connection.once('open', () => {
	console.log('MongoDB database connection established successfully');
});

module.exports.mongoose = mongoose;