
/**
 * Module dependencies.
 */

var express = require('express')
  , Facebook = require('facebook-node-sdk')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , models = require('./models')
  ;

var app = express();
var facebook = new Facebook({ appId: '450447488359518', secret: '7f3be24adb6984ad0d3983904498f7ae' });

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(Facebook.middleware({ appId: '450447488359518', secret: '7f3be24adb6984ad0d3983904498f7ae' }));
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});


app.configure('development', function(){
  app.use(express.errorHandler());
});

function facebookGetUser(req, res) {
  return function(req, res, next) {
    req.facebook.getUser( function(err, user) {
      if (!user || err){
        res.redirect('/login')
        
      } else {
        req.user = user;
        next();
      }
    });
  }
}

app.get('/', facebookGetUser(), function (req, res) {
  models.User.find({id:req.session.user_id}).exec(function(err, cats){
    if (err)
      return console.log("error", err);
    req.facebook.api('/me/friends', function(err, friends) {
      var randfriend = Math.floor(Math.random()*(friends.data.length))
      var randfriendname = friends.data[randfriend].name
      console.log(randfriendname)
      req.facebook.api('/'+friends.data[randfriend].id+'/photos', function(err, timpics) {
        if (timpics.data.length == 0) {
          res.redirect('/')
        }
        var randimg = Math.floor(Math.random()*(timpics.data.length))
        var pic1 = timpics.data[randimg].source
        var cap1 = timpics.data[randimg].id
        req.session.cap1 = cap1
        res.render('index', {
          pic1:pic1,
          title:"profile", 
          photo:req.session.profpic, 
          first_name:req.session.first_name
        });
      });
    });
  });
});

app.post('/comment', function (req, res) {
  console.log('/'+req.session.cap1)
  req.facebook.api('/'+req.session.cap1 + "/comments", 'POST', {'message':req.body.message}, function (err, stuff) {
    if(err)
      return console.log("Can't post comment to photo");
    res.redirect('/');
  });
});

app.post('/friends', facebookGetUser(), function (req, res) {
  req.facebook.api('/me/friends', function(err, friends) {
    res.send(friends)
  }); 
})

app.get('/logout', function(req, res){
  models.User.find({id:req.session.user_id}).exec(function(err, cats){
    if (err)
      return console.log("error", err); 
    if (cats.length == 0) {
      var bob = new models.User({
        id: req.session.user_id,
        firstname:req.session.first_name,
        topfriend: req.session.friend,
        background:req.session.userdefinedbackground,
        profpic: req.session.profpic,
        profpicsize: req.session.ppicsize
      })
      bob.save(function (err) {
        req.session.destroy();
        res.redirect('/login');
      })
    }
    if (cats.length != 0) {
      models.User.update({id:req.session.user_id}, {
        $set: {background: req.session.userdefinedbackground, topfriend: req.session.friend, profpicsize: req.session.ppicsize}
      }).exec(function(err, cats) {
        if (err)
          return console.log("error",err);
        req.session.destroy();
        res.redirect('/login'); });     
    };
  });
});
app.get('/login', Facebook.loginRequired(), function(req, res){
  res.render('login', {title:'login'});
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});