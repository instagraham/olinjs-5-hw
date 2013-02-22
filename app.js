
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
  console.log(req.session.user_id)
  models.User.find({id:req.session.user_id}).exec(function(err, cats){
    if (err)
      return console.log("error", err);
    if (cats.length>0) {
    console.log(cats, 'here')
    req.session.userdefinedbackground = cats[0].background
    req.session.ppicsize = cats[0].profpicsize
    req.session.friend = cats[0].topfriend
    req.session.profpic = cats[0].profpic
    req.session.first_name = cats[0].firstname
    }
    if (!req.session.userdefinedbackground) {
      req.session.userdefinedbackground = 'blue'
    }

    if (!req.session.ppicsize) {
      req.session.ppicsize = '/me/picture?redirect=false&type=large'
    }
    
    req.facebook.api(req.session.ppicsize, function(err, ppic) {
      req.session.profpic = ppic.data.url
      req.facebook.api('/me', function(err, data){
        req.session.first_name = data.first_name
        req.facebook.api('/me/friends', function(err, friends) {
          if (!req.session.friend) {
            req.session.friend = 280
          }
          if (req.body.changefriend == 'true') {
            req.session.friend = Math.floor(Math.random()*(friends.data.length))
          }
          req.facebook.api('/'+friends.data[req.session.friend].id+'/picture?redirect=false&type=large', function(err,fppic) {
            var friendpic = fppic.data.url
            var friendname = friends.data[req.session.friend].name
            res.render('index', {
              title:"profile", 
              photo:req.session.profpic, 
              first_name:req.session.first_name, 
              friendpic:friendpic, 
              friendname:friendname,
              userdefinedbackground:req.session.userdefinedbackground
            });
          });
        });
      });
    });
  });
});

app.post('/', facebookGetUser(), function (req, res) {
  if (req.body.userdefinedbackground) {
    req.session.userdefinedbackground = req.body.userdefinedbackground
  }
  if (req.body.ppicsize) {
    req.session.ppicsize = req.body.ppicsize
  }
  req.facebook.api(req.session.ppicsize, function(err, ppic) {
    var profpic = ppic.data.url
    req.facebook.api('/me/friends', function(err, friends) {
      if (req.body.changefriend == 'true') {
        req.session.friend = Math.floor(Math.random()*(friends.data.length))
      }
      req.facebook.api('/'+friends.data[req.session.friend].id+'/picture?redirect=false&type=large', function(err,fppic) {
        var friendpic = fppic.data.url
        var friendname = friends.data[req.session.friend].name
        res.render('index', {
          title:"profile", 
          photo:profpic, 
          first_name:req.session.first_name, 
          friendpic:friendpic, 
          friendname:friendname,
          userdefinedbackground:req.session.userdefinedbackground
        });
      })
    })
  })
})

app.get('/friends', facebookGetUser(), function (req, res) {
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