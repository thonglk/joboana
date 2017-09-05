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


var db = firebase.database();
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

var ratingRef = db.ref('activity/rating');
var langRef = db.ref('tran/vi');
var buyRef = db.ref('activity/buy');
var dataUser, dataProfile, dataStore, dataJob, dataStatic, likeActivity, dataLog, dataNoti, dataLead,dataEmail, Lang
var groupRef = firebase.database().ref('groupData')

var groupData


function init() {

    groupRef.on('value', function (snap) {
        groupData = snap.val()

    })
    configRef.on('value', function (snap) {
        CONFIG = snap.val()
    })

    langRef.on('value', function (snap) {
        Lang = snap.val()
    })

    // staticRef.on('value', function (snap) {
    //     dataStatic = snap.val()
    // });
    //
    // userRef.on('value', function (snap) {
    //     dataUser = snap.val();
    //
    //     var fields = ['name', 'phone', 'email', 'type'];
    //     var myUser = []
    //     for (var i in dataUser) {
    //         var user = dataUser[i]
    //         if (user.phone) {
    //             var phoneStr = user.phone.toString()
    //             if (!phoneStr.match(/^0/g)) phoneStr = "0" + phoneStr;
    //         } else {
    //             var phoneStr = ''
    //         }
    //
    //         if (user.type == 2) {
    //             myUser.push({
    //                 name: user.name || '',
    //                 phone: phoneStr,
    //                 email: user.email || '',
    //                 type: user.type || ''
    //             })
    //         }
    //     }
    //     return new Promise(function (resolve, reject) {
    //         resolve(myUser)
    //     }).then(function (myUser) {
    //         var csv = json2csv({data: myUser, fields: fields});
    //
    //         fs.writeFile('jobseeker.csv', csv, function (err) {
    //             if (err) throw err;
    //             console.log('file saved');
    //         });
    //
    //     })
    //
    //     // analyticsUserToday()
    //
    //
    // });
    //
    // profileRef.on('value', function (snap) {
    //     dataProfile = snap.val()
    //     // var a = 0
    //     // for (var i in dataProfile) {
    //     //     var profileData = dataProfile[i]
    //     //     if (profileData.actData) {
    //     //         a++
    //     //         console.log(a)
    //     //         db.ref('profile/'+i).child('actData').remove()
    //     //     }
    //     // }
    //     profileRef.child('undefined').remove()
    //     // var profileCollection = md.collection('profile')
    //     // for(var i in dataProfile){
    //     //     var profileData = dataProfile[i]
    //     //     profileCollection.insert(profileData,function (err,suc) {
    //     //         console.log(err)
    //     //     })
    //     // }
    //
    //     // var fields = ['name','address'];
    //     // var myUser = []
    //     // for (var i in dataProfile) {
    //     //     var profileData = dataProfile[i]
    //     //     if(profileData.address && profileData.name)
    //     //         myUser.push({
    //     //             name: profileData.name || '',
    //     //             address: profileData.address,
    //     //         })
    //     // }
    //     // return new Promise(function (resolve, reject) {
    //     //     resolve(myUser)
    //     // }).then(function (myUser) {
    //     //     var csv = json2csv({data: myUser, fields: fields});
    //     //
    //     //     fs.writeFile('profilelocation.csv', csv, function (err) {
    //     //         if (err) throw err;
    //     //         console.log('file saved');
    //     //     });
    //     //
    //     // })
    //
    //
    // });
    //
    // jobRef.on('value', function (snap) {
    //     dataJob = snap.val()
    //
    //     //
    //     // var fields = ['email', 'phone','storeName'];
    //     // var myUser = []
    //     // for (var i in dataUser) {
    //     //     var user = dataUser[i];
    //     //     if(user.type == 1){
    //     //         var storeName = '';
    //     //         if(user.currentStore && dataStore[user.currentStore] && dataStore[user.currentStore].storeName){
    //     //             storeName = dataStore[user.currentStore].storeName
    //     //         }
    //     //         myUser.push({
    //     //             email: dataUser[i].email || '',
    //     //             phone: dataUser[i].phone,
    //     //             storeName: storeName
    //     //         })
    //     //     }
    //     //
    //     // }
    //     // return new Promise(function (resolve, reject) {
    //     //     resolve(myUser)
    //     // }).then(function (myUser) {
    //     //     var csv = json2csv({data: myUser, fields: fields});
    //     //
    //     //     fs.writeFile('file.csv', csv, function (err) {
    //     //         if (err) throw err;
    //     //         console.log('file saved');
    //     //     });
    //     //
    //     // })
    //     // for(var i in dataUser){
    //     //     if(dataUser[i].type == 1 && dataUser[i].package == 'premium'){
    //     //
    //     //         sendWelcomeEmailToStore(dataUser[i])
    //     //     }
    //     // }
    //
    //     // var fields = ['name','address','location'];
    //     // var myUser = []
    //     // for (var i in dataStore) {
    //     //     var storeData = dataStore[i]
    //     //     if(storeData.location && storeData.createdBy && dataUser[storeData.createdBy] && dataUser[storeData.createdBy].package == 'premium')
    //     //     myUser.push({
    //     //         name: dataStore[i].storeName || '',
    //     //         address: dataStore[i].address,
    //     //         location: dataStore[i].location
    //     //
    //     //     })
    //     // }
    //     // return new Promise(function (resolve, reject) {
    //     //     resolve(myUser)
    //     // }).then(function (myUser) {
    //     //     var csv = json2csv({data: myUser, fields: fields});
    //     //
    //     //     fs.writeFile('storelocation.csv', csv, function (err) {
    //     //         if (err) throw err;
    //     //         console.log('file saved');
    //     //     });
    //     //
    //     // })
    //
    //     // var storeCollection = md.collection('store')
    //     // for(var i in dataStore){
    //     //     var storeData = dataStore[i]
    //     //     storeCollection.insert(storeData,function (err,suc) {
    //     //         console.log(err)
    //     //     })
    //     // }
    //
    // });
    //
    // storeRef.on('value', function (snap) {
    //     dataStore = snap.val()
    //     storeRef.child('undefined').remove()
    //
    //     //
    //     // var fields = ['email', 'phone','storeName'];
    //     // var myUser = []
    //     // for (var i in dataUser) {
    //     //     var user = dataUser[i];
    //     //     if(user.type == 1){
    //     //         var storeName = '';
    //     //         if(user.currentStore && dataStore[user.currentStore] && dataStore[user.currentStore].storeName){
    //     //             storeName = dataStore[user.currentStore].storeName
    //     //         }
    //     //         myUser.push({
    //     //             email: dataUser[i].email || '',
    //     //             phone: dataUser[i].phone,
    //     //             storeName: storeName
    //     //         })
    //     //     }
    //     //
    //     // }
    //     // return new Promise(function (resolve, reject) {
    //     //     resolve(myUser)
    //     // }).then(function (myUser) {
    //     //     var csv = json2csv({data: myUser, fields: fields});
    //     //
    //     //     fs.writeFile('file.csv', csv, function (err) {
    //     //         if (err) throw err;
    //     //         console.log('file saved');
    //     //     });
    //     //
    //     // })
    //     // for(var i in dataUser){
    //     //     if(dataUser[i].type == 1 && dataUser[i].package == 'premium'){
    //     //
    //     //         sendWelcomeEmailToStore(dataUser[i])
    //     //     }
    //     // }
    //
    //     // var fields = ['name','address','location'];
    //     // var myUser = []
    //     // for (var i in dataStore) {
    //     //     var storeData = dataStore[i]
    //     //     if(storeData.location && storeData.createdBy && dataUser[storeData.createdBy] && dataUser[storeData.createdBy].package == 'premium')
    //     //     myUser.push({
    //     //         name: dataStore[i].storeName || '',
    //     //         address: dataStore[i].address,
    //     //         location: dataStore[i].location
    //     //
    //     //     })
    //     // }
    //     // return new Promise(function (resolve, reject) {
    //     //     resolve(myUser)
    //     // }).then(function (myUser) {
    //     //     var csv = json2csv({data: myUser, fields: fields});
    //     //
    //     //     fs.writeFile('storelocation.csv', csv, function (err) {
    //     //         if (err) throw err;
    //     //         console.log('file saved');
    //     //     });
    //     //
    //     // })
    //
    //     // var storeCollection = md.collection('store')
    //     // for(var i in dataStore){
    //     //     var storeData = dataStore[i]
    //     //     storeCollection.insert(storeData,function (err,suc) {
    //     //         console.log(err)
    //     //     })
    //     // }
    //
    // });
    //
    // likeActivityRef.on('value', function (snap) {
    //     likeActivity = snap.val()
    // });



    leadRef.on('value', function (data) {
        dataLead = data.val()
        console.log('done')
    })

    emailRef.on('value', function (data) {
        dataEmail = data.val()
    })

}

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

app.get('/api/lead', function (req, res) {


    var query = req.param('q')
    var param = JSON.parse(query)

    var page = req.param('p');


    var sorded = _.sortBy(dataLead, function (card) {
        return -card.createdAt
    })
    var sendData = getPaginatedItems(sorded, page)
    res.send(sendData)

});


// automate Job post facebook


// start the server
http.createServer(app).listen(port);
console.log('Server started!', port);
init();
