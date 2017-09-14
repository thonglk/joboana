// grab the packages we need
var firebase = require("firebase-admin");
var express = require('express');

var app = express();
var port = process.env.PORT || 8081;
var fs = require('fs');
var http = require('http')
var https = require('https')
var request = require('request');

var S = require('string');

var nodemailer = require('nodemailer');
var ses = require('nodemailer-ses-transport');
var schedule = require('node-schedule');
var Promise = require('promise');
var escape = require('escape-html');
var _ = require("underscore");
var async = require("async");
var cors = require('cors')
var graph = require('fbgraph');
var json2csv = require('json2csv');
var shortLinkData = {}

var privateKey = fs.readFileSync('server.key', 'utf8');
var certificate = fs.readFileSync('server.crt', 'utf8');

var credentials = {key: privateKey, cert: certificate};

var CONFIG;
var font = "'HelveticaNeue-Light','Helvetica Neue Light','Helvetica Neue',Helvetica,Arial,'Lucida Grande',sans-serif;"
var staticData = {
    disliked: 0,
    viewed: 0,
    liked: 0,
    shared: 0,
    rated: 0,
    rateAverage: 0,
    matched: 0,
    chated: 0,
    like: 0,
    share: 0,
    rate: 0,
    match: 0,
    chat: 0,
    timeOnline: 0,
    login: 1,
    profile: 0
}

//Mongo//
const MongoClient = require('mongodb');

var uri = 'mongodb://joboapp:joboApp.1234@ec2-54-157-20-214.compute-1.amazonaws.com:27017/joboapp';
var md, userCol, profileCol, storeCol, jobCol, notificationCol, staticCol;

// MongoClient.connect(uri, function (err, db) {
//     md = db
//     userCol = md.collection('user');
//     profileCol = md.collection('profile');
//     storeCol = md.collection('store');
//     jobCol = md.collection('job');
//     notificationCol = md.collection('notification');
//     staticCol = md.collection('static');
//
//     console.log("Connected correctly to server.");
//
//
// });


// TODO(DEVELOPER): Configure your email transport.


var mailTransport = nodemailer.createTransport(ses({
    accessKeyId: 'AKIAJHPP64MDOXMXAZRQ',
    secretAccessKey: 'xNzQL2bFyfCg6ZP2XsG8W6em3xiweNQArWUnnADW',
    region: 'us-east-1'
}));


app.use(cors());
app.use(function (req, res, next) {
    res.contentType('application/json');
    next();
});


firebase.initializeApp({
    credential: firebase.credential.cert('adminsdk.json'),
    databaseURL: "https://jobfast-359da.firebaseio.com"
});

var secondary = firebase.initializeApp({
    credential: firebase.credential.cert('adminsdk-jobo.json'),
    databaseURL: "https://jobo-b8204.firebaseio.com"
}, "secondary");


var publishChannel = {
    Jobo: {
        pageId: '385066561884380',
        token: 'EAAEMfZASjMhgBAOWKcfIFZBPvH1OSdZAg2VFH103o0cNimDFg0wxtcSn5E3eaY4C8sDGQYBiaSZAxY8WRpaIj51hB2UfYZAqk3Wd1UiUoc393wgRZBpkiFR1iEGjfb1oE272ZCxkxECLiT1x6UcqYRZCemdpVmt1TnPupJgL8jlcdgZDZD'
    },
    viecLamNhaHang: {
        pageId: '282860701742519',
        token: 'EAAEMfZASjMhgBAIeW7dEVfhrQjZCtKszDRfuzsn1nDhOTaZBsejy1Xf71XxbvZBlSSHaFBg5L9eSwmNTDURRxdAetC9V1cArFnV1dM7sISSZB7weBIycRagE2RZCGZCaiQbDpFuy2cXiVyynKWpDbz9SM29yU273UkynZCBgmxU74gZDZD'
    }
};


var db = secondary.database();
var firsttime;


var configRef = db.ref('config');
var actRef = db.ref('act');
var emailRef = db.ref('emailChannel');

var staticRef = db.ref('static');
var userRef = db.ref('user');
var profileRef = db.ref('profile');
var storeRef = db.ref('store');
var jobRef = db.ref('job');
var leadRef = db.ref('lead')

var notificationRef = db.ref('notification')
var likeActivityRef = db.ref('activity/like');
var logRef = db.ref('log')
var facebookPostRef = db.ref('facebookPost');

var ratingRef = db.ref('activity/rating');
var langRef = db.ref('tran/vi');
var buyRef = db.ref('activity/buy');
var dataUser, dataProfile, dataStore, dataJob, dataStatic, likeActivity, dataLog, dataNoti, dataLead, dataEmail, Lang
var groupRef = firebase.database().ref('groupData')

var groupData,facebookAccount;
var a = 0, b = 0;


function init() {

    groupRef.on('value', function (snap) {
        groupData = snap.val()

    })
    configRef.on('value', function (snap) {
        CONFIG = snap.val()
        facebookAccount = CONFIG.facebookToken

    })

    langRef.on('value', function (snap) {
        Lang = snap.val()
    })

    notificationRef.once('value', function (snap) {
        dataNoti = snap.val()
    })

    var now = Date.now();
    var startTime = now;
    var endTime = now + 86400 * 1000;


    facebookPostRef.on('child_added', function (snap) {
        var content = snap.val()
        if (content && content.time > startTime && content.time < endTime) {
            console.log('facebook', b++);

            schedule.scheduleJob(content.time, function () {
                PublishFacebook(content.to, content.content, content.poster, content.postId)
            })
        }
    })

}
function PublishFacebook(to, content, poster, postId) {
    console.log('scheduleJob_PublishFacebook_run', to, poster, postId)

    var accessToken = facebookAccount[poster]
    if (to && content && accessToken) {
        if (content.image) {
            graph.post(to + "/photos?access_token=" + accessToken,
                {
                    "url": content.image,
                    "caption": content.text
                },
                function (err, res) {
                    // returns the post id
                    if (err) {
                        console.log(err.message, to, poster);
                        facebookPostRef.child(postId).update({sent_error: err.message})
                    } else {
                        var id = res.id;
                        console.log(id);
                        facebookPostRef.child(postId).update({id, sent: Date.now()})

                    }

                });
        } else {
            graph.post(to + "/feed?access_token=" + accessToken,
                {"message": content.text},
                function (err, res) {
                    // returns the post id
                    if (err) {
                        console.log(err.message, to, poster);
                        facebookPostRef.child(postId).update({sent_error: err.message})
                    } else {
                        var id = res.id;
                        console.log(id);
                        facebookPostRef.child(postId).update({id, sent: Date.now()})

                    }

                });
        }
    }
}
app.get('/', function (req, res) {
    res.send('Will Send '+ b);
});
function PublishPost(userId, text, accessToken) {
    if (userId && text && accessToken) {
        graph.post(userId + "/feed?access_token=" + accessToken,
            {
                "message": text.text,
                "link": text.link
            },
            function (err, res) {
                // returns the post id
                console.log(res, err);


            });
    } else {
        console.log('PublishPost error')
    }
}

function PublishPhoto(userId, text, accessToken) {
    if (userId && text && accessToken) {

        graph.post(userId + "/photos?access_token=" + accessToken,
            {
                "url": text.image,
                "caption": text.text
            },
            function (err, res) {
                // returns the post id
                console.log(res, err);
            });
    } else {
        console.log('PublishPhoto error')

    }
}

function PublishComment(postId, text, accessToken) {
    if (postId && text && accessToken) {
        graph.post(postId + "/comments?access_token=" + accessToken,
            {
                "message": text
            },
            function (err, res) {
                // returns the post id
                console.log(res, err);
            }
        )

    } else {
        console.log('PublishComment error')
    }
}

function getPaginatedItems(items, page) {
    var page = page || 1,
        per_page = 15,
        offset = (page - 1) * per_page,
        paginatedItems = _.rest(items, offset).slice(0, per_page);
    return {
        page: page,
        per_page: per_page,
        total: items.length,
        total_pages: Math.ceil(items.length / per_page),
        data: paginatedItems
    };
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(Number(lat2) - Number(lat1));  // deg2rad below
    var dLon = deg2rad(Number(lon2) - Number(lon1));
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var x = R * c; // Distance in km
    var n = parseFloat(x);
    x = Math.round(n * 10) / 10;
    return Number(x);
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}



// automate Job post facebook


// start the server
http.createServer(app).listen(port);
console.log('Server started!', port);
init();
