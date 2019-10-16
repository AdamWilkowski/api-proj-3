'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var cors = require('cors');
var dns = require('dns');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/
mongoose.connect(process.env.MONGOLAB_URI, (err)=>{
  if(err) {
    console.log('Database connection failed.', err);
    return;
  }
  console.log('Database connection successful!');
});

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

var shorterSchema = new mongoose.Schema({
  url: {
    type: String,
    required: 'URL is required!',
    unique: true
  },
  short: Number
});

var ShortURL = mongoose.model('ShortURL', shorterSchema);

var createShortURL = (url, done) => {
  ShortURL.countDocuments({}).then((count)=>{
    var short = new ShortURL({
      url: url,
      short: count
    });
    short.save((err, data)=>{
      if(err) return done(err);
      done(null, data);
    });
  })
  .catch((err)=>{
    console.log(err);
    throw err;
  });
};

var findURL = (url, done) => {
  ShortURL.find({url: url}, (err, data)=>{
    if(err) return done(err);
    done(null, data);
  });
};

app.post("/api/shorturl/new", function (req, res) {
  var regex = RegExp('^https?:\/\/');
  var url = req.body.url;
  // cut 'http(s)://' so the dns.lookup works
  if(regex.test(url)) {
    url = url.replace(regex, '');
  }
  // validate URL
  dns.lookup(url, (err)=>{
    if(err) {
      console.log(err);
      return res.json({error: 'Invalid URL'});
    }
    // create shortened URL
    createShortURL(url, (err, data)=>{
      if(err) {
        console.log(err);
        return;
      }
      console.log('Document created!');
      res.json({original_url: data.url, short_url: data.short});
    });
  });
});

// redirect to the original URL
app.get("/api/shorturl/:short", (req, res)=>{
  ShortURL.find({short: req.params.short}, (err, data)=>{
    if(err) {
      console.log(err);
      return;
    }
    console.log('Redirecting to ' + data[0].url);
    var regex = RegExp('^https?:\/\/');
    // attach 'http(s)://' so the res.redirect works
    res.redirect('https://' + data[0].url);
  });
});

app.listen(port, function () {
  console.log('Node.js listening ...');
});