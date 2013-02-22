var mongoose = require('mongoose');

mongoose.connect(process.env.MONGOLAB_URI||'localhost')

var schema = mongoose.Schema({
	id: String,
	firstname: String,
	background: String,
	profpic: String,
	profpicsize: String,
	topfriend: Number
})

exports.User = mongoose.model('user', schema);