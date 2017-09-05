// grab the packages we need
var firebase = require("firebase-admin");
var express = require('express');

var app = express();
var port = process.env.PORT || 8080;
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
// Configure the email transport using the default SMTP transport and a GMail account.
// See: https://nodemailer.com/
// For other types of transports (Amazon SES, Sendgrid...) see https://nodemailer.com/2-0-0-beta/setup-transporter/
// var mailTransport = nodemailer.createTransport('smtps://<user>%40gmail.com:<password>@smtp.gmail.com');
//
// var mailTransport = nodemailer.createTransport(ses({
//     accessKeyId: 'AKIAJB7IJS2GP6NGLFSQ',
//     secretAccessKey: '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',
//     region: 'us-west-2'
// }));

var mailTransport = nodemailer.createTransport(ses({
    accessKeyId: 'AKIAJHPP64MDOXMXAZRQ',
    secretAccessKey: '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',
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

var facebookAccount = {
    thuythuy: 'EAAEMfZASjMhgBAOclOeUBjP8fZAKUkjev4VzkbBGGCPTCoQexAKpe8nnGs2EAXcPbipcS8RN8bL0eE9CsAZCCL4ujTEgxKs5oAyznqE2IY7wr8OZCptYaJxF3ymOpIQZA1pHi8mEbU4r2nDVTDgEoOBkBztcDT8kZD',
    thong: 'EAAEMfZASjMhgBAD60T6ytMYX2ZBdbZCkgxoZA2XpXLKattHNquxWgPjGqlCMWDX3CE28rx6NRuDbxhVITTUM6AqQW9UcZA3LrMvnsIAWjwl4a1BZAOQjbBagcbyTSyIB8fjgzZBA05ZAl7Ih8ElCGe0jZCf8ZA0i7IxQOCfAYZBe0pmGsjr1wtqc4Hm',
    thao2: 'EAAEMfZASjMhgBAKZBYPtpKzBtdnmeGzDv3RR1VN0Hqa5BZAhRMpHLjcEfjSN0MA1m4aUVi3zkT68lX4gWdN7RHl6dMVWz3DVIx9xAFFzQjLy84eKmFkPRL1QyZA4WvXfCHNXDBCnnGb63FoPXtNGMbLv74XLktkZD',
    toi: 'EAAEMfZASjMhgBAKbZBRnVyD2HBurOAlVCOTLWweBA5zLqa3fCexZCQFsIPZAZC9gZAZACWWR2Na8Oz4IGiXwycQ965e9QMFnbipFAlHSaGbZCXGVQmgZAlqFfVunfikRi8Yhx7eOyhHEoIZCqufqNJTr2q5RwrE9kZBb5MZD',
    thythy: 'EAAEMfZASjMhgBADcRIvfJo0Dd3CPpwpvQ6ZBJL23d0ZCoJ2VEvTgxLwId7OJs9ZA0FNkKlZAKfsU8AvDQTYntYAzZAFnamq8OuzVvSOvflRD8C0X11ZAmRsF0HKwiSSEnNxCWak5pPTghw0sDDO9pP438fhpe2ZCBrgZD',
    khanh: 'EAAEMfZASjMhgBADZA8LfYxe8NnnZCcrdwuaAaZBtZBu7yfEPZAMiGFl6QR9UXASc33kDm7BcFvPCbzvyQg4OoLe9fCZBW4uskKTNIToZC1BegoOuCrFS09dTmec2G9BrmZBl5tP2AfQKcRabs5dnpxSHHXxPSXfosa00oDjPtaETo7gZDZD',
    dieulinh: 'EAAEMfZASjMhgBAFwhTXIVkqpR0mEECEywxegp8ZAJBTvvoZAcaA1jQZCTg8fGiymt1ghhJmhlbhFtLObhK9qBgjRnHIyFLQS1eD7SadwkNncUldvBnRWZARvn8eiXVEOEnD1PzpXgXaKkZCWfkeWkwXglbUqOGAvsZD',
    maitran: 'EAAEMfZASjMhgBAA2pqgWiMXiOOWLZAK8zQhfW8oTjRk3JU9HpSY7bp4SZB6G3nxU3toFLovy3WeUSuegG3NT2PPNxMJngCbIxInWDAfbu50LqGiUMMpkRhqg5o2xa6rFrfzGXp62Buiff0Blv0ZACLnZCYMvuPIEZD',
    dong: 'EAAEMfZASjMhgBACOKlVYotjjofqacqTPlnZBG1jeYp6ZCRtui6UhJuxl1uMLn7H1wS0ZBFHSNwI3Guvn8JYpF4edb6UHQpHTK1aOLv0MUpxZBSljadiOYDyAORXeonLxHAHKhG3EZAHbUS0RyMbBZC2UaHhMVPIIGUZD',
    mailinh: 'EAAEMfZASjMhgBAIISEn1Yn1DGN4pSjjps3Mz6aJXA7nZB2YoIZAaWs14PjhZCxtpDWgxsQXZAeEtpsDsSvykG5GglPriUSZBdDxjdDAi0csh82MVKcH6ZBGAy02zJGLhU1dZBk7Dl3FpDGVMsKWCKcRREbdlesdGEyoZD',
    myhuyen2: 'EAAEMfZASjMhgBABnevkeEJ5RXMhYA96qhX2Rd1MfZAG3zX0l7e1M0R65TZAHWFytHUcg7WgAsG3L805ZAY3Vf2RQLR0PPj2qT1vRL6pCst4nnzEsAtA7gcASmmAyf0CMAGDJenwkrlsdZAokGlvrDqB0fDoqa6d5EyBr9FZAaYsAZDZD',
    thao: 'EAAEMfZASjMhgBAIWepEFMrjHchnbap0BmIU9w1LyE8XUj2szruCm9PZCG3xlS2VTVmdheu7ABVUKHtCvWRFtaAZC6Onibuntj1vZB5M9oOQWgeVubGa6mz4nGX2RHt4bmspmd1qmZAUDhA5hZAVZAoIejLH48ZCvZBfQZD'

}

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

var groupData, groupArray
groupRef.once('value', function (snap) {
    groupData = snap.val()
    groupArray = _.toArray(groupData)

    var a = 0

    function loop() {
        var groupDataObj = groupArray[a]
        var poster = []
        for (var i in groupDataObj) {
            if (groupDataObj[i] == true) {
                poster.push(i)
            }
        }
        console.log(poster)
        groupDataObj.poster = poster
        if (groupDataObj.groupId) {
            groupRef.child(groupDataObj.groupId).update(groupDataObj)
        }
        a++
        if (a < groupArray.length) {
            loop()
        }

    }

    loop()


    var fields = ['name', 'groupId', 'link', 'finder', 'job', 'area', 'poster', 'thuythuy', 'thong', 'thao2', 'toi', 'thythy', 'khanh', 'dieulinh', 'maitran', 'dong', 'mailinh', 'myhuyen2', 'thao'];
    var myUser = []
    for (var i in groupData) {
        var group = groupData[i]
        myUser.push(group)
    }
    return new Promise(function (resolve, reject) {
        resolve(myUser)
    }).then(function (myUser) {
        var csv = json2csv({data: myUser, fields: fields});

        fs.writeFile('groupActive.csv', csv, function (err) {
            if (err) throw err;
            console.log('file saved');
        });

    })


})

function init() {

    configRef.on('value', function (snap) {
        CONFIG = snap.val()
    })

    langRef.on('value', function (snap) {
        Lang = snap.val()
    })

    staticRef.on('value', function (snap) {
        dataStatic = snap.val()
        // var staticCollection = md.collection('static')
        // for(var i in dataStatic){
        //     var staticData = dataStatic[i]
        //     staticCollection.insert(staticData,function (err,suc) {
        //         console.log(err)
        //     })
        // }
    });

    userRef.on('value', function (snap) {
        dataUser = snap.val();

        var fields = ['name', 'phone', 'email', 'type'];
        var myUser = []
        for (var i in dataUser) {
            var user = dataUser[i]
            if (user.phone) {
                var phoneStr = user.phone.toString()
                if (!phoneStr.match(/^0/g)) phoneStr = "0" + phoneStr;
            } else {
                var phoneStr = ''
            }

            if (user.type == 2) {
                myUser.push({
                    name: user.name || '',
                    phone: phoneStr,
                    email: user.email || '',
                    type: user.type || ''
                })
            }
        }
        return new Promise(function (resolve, reject) {
            resolve(myUser)
        }).then(function (myUser) {
            var csv = json2csv({data: myUser, fields: fields});

            fs.writeFile('jobseeker.csv', csv, function (err) {
                if (err) throw err;
                console.log('file saved');
            });

        })

        // analyticsUserToday()


    });

    profileRef.on('value', function (snap) {
        dataProfile = snap.val()
        // var a = 0
        // for (var i in dataProfile) {
        //     var profileData = dataProfile[i]
        //     if (profileData.actData) {
        //         a++
        //         console.log(a)
        //         db.ref('profile/'+i).child('actData').remove()
        //     }
        // }
        profileRef.child('undefined').remove()
        // var profileCollection = md.collection('profile')
        // for(var i in dataProfile){
        //     var profileData = dataProfile[i]
        //     profileCollection.insert(profileData,function (err,suc) {
        //         console.log(err)
        //     })
        // }

        // var fields = ['name','address'];
        // var myUser = []
        // for (var i in dataProfile) {
        //     var profileData = dataProfile[i]
        //     if(profileData.address && profileData.name)
        //         myUser.push({
        //             name: profileData.name || '',
        //             address: profileData.address,
        //         })
        // }
        // return new Promise(function (resolve, reject) {
        //     resolve(myUser)
        // }).then(function (myUser) {
        //     var csv = json2csv({data: myUser, fields: fields});
        //
        //     fs.writeFile('profilelocation.csv', csv, function (err) {
        //         if (err) throw err;
        //         console.log('file saved');
        //     });
        //
        // })


    });

    jobRef.on('value', function (snap) {
        dataJob = snap.val()

        //
        // var fields = ['email', 'phone','storeName'];
        // var myUser = []
        // for (var i in dataUser) {
        //     var user = dataUser[i];
        //     if(user.type == 1){
        //         var storeName = '';
        //         if(user.currentStore && dataStore[user.currentStore] && dataStore[user.currentStore].storeName){
        //             storeName = dataStore[user.currentStore].storeName
        //         }
        //         myUser.push({
        //             email: dataUser[i].email || '',
        //             phone: dataUser[i].phone,
        //             storeName: storeName
        //         })
        //     }
        //
        // }
        // return new Promise(function (resolve, reject) {
        //     resolve(myUser)
        // }).then(function (myUser) {
        //     var csv = json2csv({data: myUser, fields: fields});
        //
        //     fs.writeFile('file.csv', csv, function (err) {
        //         if (err) throw err;
        //         console.log('file saved');
        //     });
        //
        // })
        // for(var i in dataUser){
        //     if(dataUser[i].type == 1 && dataUser[i].package == 'premium'){
        //
        //         sendWelcomeEmailToStore(dataUser[i])
        //     }
        // }

        // var fields = ['name','address','location'];
        // var myUser = []
        // for (var i in dataStore) {
        //     var storeData = dataStore[i]
        //     if(storeData.location && storeData.createdBy && dataUser[storeData.createdBy] && dataUser[storeData.createdBy].package == 'premium')
        //     myUser.push({
        //         name: dataStore[i].storeName || '',
        //         address: dataStore[i].address,
        //         location: dataStore[i].location
        //
        //     })
        // }
        // return new Promise(function (resolve, reject) {
        //     resolve(myUser)
        // }).then(function (myUser) {
        //     var csv = json2csv({data: myUser, fields: fields});
        //
        //     fs.writeFile('storelocation.csv', csv, function (err) {
        //         if (err) throw err;
        //         console.log('file saved');
        //     });
        //
        // })

        // var storeCollection = md.collection('store')
        // for(var i in dataStore){
        //     var storeData = dataStore[i]
        //     storeCollection.insert(storeData,function (err,suc) {
        //         console.log(err)
        //     })
        // }

    });

    storeRef.on('value', function (snap) {
        dataStore = snap.val()
        storeRef.child('undefined').remove()

        //
        // var fields = ['email', 'phone','storeName'];
        // var myUser = []
        // for (var i in dataUser) {
        //     var user = dataUser[i];
        //     if(user.type == 1){
        //         var storeName = '';
        //         if(user.currentStore && dataStore[user.currentStore] && dataStore[user.currentStore].storeName){
        //             storeName = dataStore[user.currentStore].storeName
        //         }
        //         myUser.push({
        //             email: dataUser[i].email || '',
        //             phone: dataUser[i].phone,
        //             storeName: storeName
        //         })
        //     }
        //
        // }
        // return new Promise(function (resolve, reject) {
        //     resolve(myUser)
        // }).then(function (myUser) {
        //     var csv = json2csv({data: myUser, fields: fields});
        //
        //     fs.writeFile('file.csv', csv, function (err) {
        //         if (err) throw err;
        //         console.log('file saved');
        //     });
        //
        // })
        // for(var i in dataUser){
        //     if(dataUser[i].type == 1 && dataUser[i].package == 'premium'){
        //
        //         sendWelcomeEmailToStore(dataUser[i])
        //     }
        // }

        // var fields = ['name','address','location'];
        // var myUser = []
        // for (var i in dataStore) {
        //     var storeData = dataStore[i]
        //     if(storeData.location && storeData.createdBy && dataUser[storeData.createdBy] && dataUser[storeData.createdBy].package == 'premium')
        //     myUser.push({
        //         name: dataStore[i].storeName || '',
        //         address: dataStore[i].address,
        //         location: dataStore[i].location
        //
        //     })
        // }
        // return new Promise(function (resolve, reject) {
        //     resolve(myUser)
        // }).then(function (myUser) {
        //     var csv = json2csv({data: myUser, fields: fields});
        //
        //     fs.writeFile('storelocation.csv', csv, function (err) {
        //         if (err) throw err;
        //         console.log('file saved');
        //     });
        //
        // })

        // var storeCollection = md.collection('store')
        // for(var i in dataStore){
        //     var storeData = dataStore[i]
        //     storeCollection.insert(storeData,function (err,suc) {
        //         console.log(err)
        //     })
        // }

    });

    likeActivityRef.on('value', function (snap) {
        likeActivity = snap.val()
    });

    logRef.on('value', function (snap) {
        dataLog = snap.val()
        // var logCollection = md.collection('log')
        // var logcount = 0
        // for(var i in dataLog){
        //     logcount++
        //     console.log(logcount)
        //     var logData = dataLog[i]
        //     logCollection.insert(logData,function (err,suc) {
        //         console.log(err)
        //     })
        // }

    });

    notificationRef.on('value', function (snap) {
        dataNoti = snap.val()
        var now = new Date().getTime();

        // var i = 0
        // for (var i in data) {
        //     i++
        //     console.log(i)
        //     var mail = data[i]
        //     sendNotification(dataUser[i], mail, true, true, true, true, mail.time)
        // }

    });

    leadRef.on('value', function (data) {
        dataLead = data.val()

    })

    emailRef.on('value', function (data) {
        dataEmail = data.val()
    })

    return new Promise(function (resolve, reject) {
        resolve(dataProfile)
    }).then(function () {
        startList()
        Email_happyBirthDayProfile()


    })
}


app.get('/lookalike', function (req, res) {
    var job = req.param('job')

    var fields = ['name', 'phone', 'email', 'type'];
    var myUser = []
    var a = 0

    for (var i in dataProfile) {
        var profile = dataProfile[i]
        if (profile.job && profile.job[job] && dataUser[i]) {
            var user = dataUser[i]
            a++
            if (user.phone) {
                var phoneStr = user.phone.toString()
                if (phoneStr.charAt(0) == '0') {
                    phoneStr = phoneStr.replace("0", "84");
                } else {
                    phoneStr = "84" + phoneStr
                }
            } else {
                var phoneStr = ''
            }

            if (user.type == 2) {
                myUser.push({
                    name: user.name || '',
                    phone: phoneStr,
                    email: user.email || '',
                    type: user.type || ''
                })
            }


        }
    }
    return new Promise(function (resolve, reject) {
        resolve(myUser)
    }).then(function (myUser) {
        var csv = json2csv({data: myUser, fields: fields});

        fs.writeFile('jobseeker_' + job + '.csv', csv, function (err) {
            if (err) throw err;
            console.log('file saved');
            res.send('file saved ' + a)

        });

    })

})

function createListPremiumStore() {
    var jobHN = "HN \n"
    var jobHCM = " \n SG \n"

    for (var i in dataStore) {
        var storeData = dataStore[i]
        if (storeData.createdBy
            && dataUser[storeData.createdBy]
            && dataUser[storeData.createdBy].package == 'premium') {
            var disToHN = getDistanceFromLatLonInKm(storeData.location.lat, storeData.location.lng, CONFIG.address.hn.lat, CONFIG.address.hn.lng)
            var disToSG = getDistanceFromLatLonInKm(storeData.location.lat, storeData.location.lng, CONFIG.address.sg.lat, CONFIG.address.sg.lng)
            if (disToHN < 100) {
                jobHN = jobHN + '◆ ' + getStringJob(storeData.job) + ' | ' + storeData.storeName + ' | ' + shortAddress(storeData.address) + ' ' + i + ' \n'
            } else if (disToSG < 100) {
                jobHCM = jobHCM + '◆ ' + getStringJob(storeData.job) + ' | ' + storeData.storeName + ' | ' + shortAddress(storeData.address) + ' ' + i + ' \n'
            }
        }

    }
    return jobHN + jobHCM
}

var today = new Date().getTime()

function getShortPremiumJob(ref) {
    for (var i in dataJob) {
        var job = dataJob[i]
        if (job.createdBy && job.storeId
            && dataUser[job.createdBy]
            && dataUser[job.createdBy].package == 'premium'
            && dataStore[job.storeId]
            && job.deadline
            && job.deadline > today
        ) {
            var longURL = CONFIG.WEBURL + '/view/store/' + job.storeId + '?job=' + job.job + '#ref=' + ref + job.storeId + job.job;
            console.log(longURL)
            shortenURL(longURL, i)
        }
    }
}

function createListPremiumJob(where) {
    var jobHN = "";
    var jobHCM = "";
    var today = new Date().getTime()

    for (var i in dataJob) {
        var job = dataJob[i]
        if (job.createdBy && job.storeId
            && dataUser[job.createdBy]
            && dataUser[job.createdBy].package == 'premium'
            && dataStore[job.storeId]
            && job.deadline
            && job.deadline > today
        ) {
            var jobname = Lang[job.job] || job.other
            var storeData = dataStore[job.storeId]
            var disToHN = getDistanceFromLatLonInKm(storeData.location.lat, storeData.location.lng, CONFIG.address.hn.lat, CONFIG.address.hn.lng)
            var disToSG = getDistanceFromLatLonInKm(storeData.location.lat, storeData.location.lng, CONFIG.address.sg.lat, CONFIG.address.sg.lng)
            if (disToHN < 100) {

                jobHN = jobHN + '◆ ' + jobname + ' | ' + storeData.storeName + ' | ' + shortAddress(storeData.address) + ' | ' + shortLinkData[i] + ' \n'
            } else if (disToSG < 100) {
                jobHCM = jobHCM + '◆ ' + jobname + ' | ' + storeData.storeName + ' | ' + shortAddress(storeData.address) + ' | ' + shortLinkData[i] + ' \n'
            }

        }

    }
    if (where == 'hn') {
        return jobHN
    } else if (where == 'hcm') {
        return jobHCM
    } else {
        return jobHN + jobHCM
    }
}

function shortenURL(longURL, key) {
    var shorturl = '';

    var options = {
        url: 'https://api-ssl.bitly.com/v3/shorten?access_token=3324d23b69543241ca05d5bbd96da2b17bf523cb&longUrl=' + longURL + '&format=json',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    }


// Start the request
    request(options, function (error, response, body) {
        if (body) {
            var res = JSON.parse(body)
            if (res.data && res.data.url) {
                shorturl = res.data.url
                shortLinkData[key] = shorturl

            }
        }
    })
    return new Promise(function (resolve, reject) {
        resolve(shorturl)
    })
}

function createJDJob(jobId) {
    var Job = dataJob[jobId]
    var text = '';
    if (Job) {
        if (Job.jobName) {
            text = text + '☕ ' + Job.jobName + '\n \n'
        }
        if (Job.working_type) {
            text = text + '◆ Hình thức: ' + Lang[Job.working_type] + '\n'
        }
        if (Job.salary) {
            text = text + '◆ Mức lương: ' + Job.salary + ' triệu đồng/tháng \n'
        }
        if (Job.unit) {
            text = text + '◆ Số lượng: ' + Job.unit + '\n'
        }
        if (Job.sex) {
            text = text + '◆ Giới tính: ' + Lang[Job.sex] + '\n'
        }


        var link = CONFIG.WEBURL + '/view/store/' + Job.storeId + '?job=' + Job.job + '#ref=push'

        text = text + '➡ Ứng tuyển tại: ' + link + '\n  \n '

        return text
    }
}

app.get('/createJDStore', function (req, res) {
    var storeId = req.param('storeId')
    res.send(createJDStore(storeId))
})

function createJDStore(storeId) {
    var storeData = dataStore[storeId];
    storeData.jobData = _.where(dataJob, {storeId: storeId});

    var text = '';
    var a = Math.round(Math.random() * 2);
    var today = new Date().getTime()

    if (a == 0) {
        text = text + storeData.storeName + ' tuyển dụng ' + getStringJob(storeData.job) + '\n \n'
        if (storeData.address) {
            text = text + '🛣 ' + shortAddress(storeData.address) + '\n \n '
        }

        if (storeData.description) {
            text = text + storeData.description + '\n \n'
        }

        text = text + '► Vị trí cần tuyển \n'

        for (var i in storeData.jobData) {

            var Job = storeData.jobData[i]
            if (Job.deadline > today) {
                var jobId = Job.storeId + ':' + Job.job
                text = text + createJDJob(jobId)
            }
        }

        var link = CONFIG.WEBURL + '/view/store/' + storeData.storeId + '#ref=type0'
        text = text + `Xem thông tin chi tiết tại ${link} hoặc gọi trực tiếp SĐT 01662002900 (My)`
        if (storeData.photo) {
            storeData.photo.push(storeData.avatar)
        } else {
            storeData.photo = [storeData.avatar]
        }

        var randomphoto = Math.round(Math.random() * (storeData.photo.length - 1));

        return {
            text: text,
            link: link,
            image: storeData.photo[randomphoto]
        }
    } else if (a == 1) {

        var random = Math.round(Math.random() * storeData.jobData.length)
        var Job = storeData.jobData[random]
        if (Job) {
            var link = CONFIG.WEBURL + '/view/store/' + storeData.storeId

            var link = CONFIG.WEBURL + '/view/store/' + storeData.storeId + '#ref=type1'

            text = `Hiện tại ${storeData.storeName} ở ${shortAddress(storeData.address)} đang cần tuyển ${Job.unit || ''} bạn làm ${Lang[Job.job]}`

            if (Job.salary) {
                text = text + ` lương tháng ${Job.salary}tr `
            }
            if (Job.working_type) {
                text = text + `, ưu tiên các bạn muốn làm ${Job.working_type},`
            }
            if (Job.figure) {
                text = text + 'cần ngoại hình ưa nhìn cởi mở 😊,'
            }
            text = text + ` bạn nào muốn làm liện hệ với mình hoặc số : +84 968269860 A Thông, hoặc ứng tuyển qua Jobo tại link ${link}.\n \n
            Mình đang sử dụng Jobo để tuyển nhân viên, ứng dụng Jobo giúp các bạn trẻ định hướng và tìm các việc phù hợp, cam kết miễn phí, khuyên các bạn tìm việc dùng thử ứng dụng này https://joboapp.com`
            if (storeData.photo) {
                storeData.photo.push(storeData.avatar)
            } else {
                storeData.photo = [storeData.avatar]
            }

            var randomphoto = Math.round(Math.random() * (storeData.photo.length - 1));

            return {
                text: text,
                link: link,
                image: storeData.photo[randomphoto]
            }

        }


    }
    else {
        var link = CONFIG.WEBURL + '/view/store/' + storeData.storeId + '#ref=type2'

        text = `${storeData.storeName} TUYỂN DỤNG - TẠI ${shortAddress(storeData.address)}
📢  📢 Bạn năng động và ham học hỏi? Hãy tham gia vào chuỗi ${storeData.storeName} để có những trải nghiệm thú vị, kinh nghiệm mới và cơ hội được đào tạo nhiều kỹ năng chuyên nghiệp.
👉 ${storeData.storeName} đang cần tuyển nhân viên cho chi nhánh mới với mức lương rất hấp dẫn, hãy nhanh chóng ứng tuyển ngay các vị trí sau:`
        for (var i in storeData.jobData) {
            var Job = storeData.jobData[i]
            if (Job.deadline > today) {
                text = text + `${Job.unit} ${Lang[Job.job]} `
            }
        }

        text = text + `
        👉 Ưu tiên ứng viên qua hoặc nộp hồ sơ online qua ${link}
👉 Mọi thắc mắc vui lòng liên hệ số điện thoại: 0968269860 hoặc  01662002900 gặp Mrs My để được giải đáp nhé!`

        if (storeData.photo) {
            storeData.photo.push(storeData.avatar)
        } else {
            storeData.photo = [storeData.avatar]
        }

        var randomphoto = Math.round(Math.random() * (storeData.photo.length - 1));

        return {
            text: text,
            link: link,
            image: storeData.photo[randomphoto]
        }
    }


}


function checkInadequate() {
    jobRef.once('value', function (a) {
        var dataJobs = a.val()
        for (var i in dataJobs) {
            var job = dataJobs[i];
            if (!job.storeId) {
                var array = i.split(':')

                console.log('checkInadequateStoreIdInJob_deadline', i)
                jobRef.child(i).update({storeId: array[0]})
            }
            if (!job.deadline) {
                console.log('checkInadequateStoreIdInJob_deadline', i)
                jobRef.child(i).update({deadline: new Date().getTime() + 1000 * 60 * 60 * 24 * 7})
            }
        }
    })
    profileRef.once('value', function (a) {
        var dataProfiles = a.val()

        for (var i in dataProfiles) {
            var profile = dataProfiles[i]
            if (!profile.userId) {
                console.log('thieu dataProfile', i)
                profileRef.child(i).update({
                        userId: i
                    }
                )
            }
        }
    })
}

function shortAddress(fullAddress) {
    if (fullAddress) {
        var mixAddress = fullAddress.split(",")
        if (mixAddress.length < 3) {
            return fullAddress
        } else {
            var address = mixAddress[0] + ', ' + mixAddress[1] + ', ' + mixAddress[2]
            return address
        }

    }
}

function checkInadequateProfile() {
    var refArray = {}
    var a = 0, b = 0, c = 0, d = 0
    var aa = 0, bb = 0, cc = 0, dd = 0
    var jobseeker = {
        hn: 0,
        sg: 0,
        other: 0
    };
    var time = new Date().getTime() - 86400 * 1000 * 1
    for (var i in dataUser) {
        if (dataUser[i].createdAt > time) {
            if (dataProfile[i] && dataUser[i].type == 2) {
                a++

            } else if (!dataProfile[i] && dataUser[i].type == 2) {
                b++
            } else if (dataUser[i].currentStore && dataUser[i].type == 1) {
                c++
            } else if (!dataUser[i].currentStore && dataUser[i].type == 1) {
                d++
            }
        }

        if (dataProfile[i] && dataUser[i].type == 2) {

            if (dataProfile && dataProfile[i] && dataProfile[i].location) {
                var disToHn = getDistanceFromLatLonInKm(dataProfile[i].location.lat, dataProfile[i].location.lng, CONFIG.address.hn.lat, CONFIG.address.hn.lng)
                if (disToHn < 100) {
                    jobseeker.hn++
                } else {
                    var disToSg = getDistanceFromLatLonInKm(dataProfile[i].location.lat, dataProfile[i].location.lng, CONFIG.address.sg.lat, CONFIG.address.sg.lng)
                    if (disToSg < 100) {
                        jobseeker.sg++
                    } else {
                        jobseeker.other++
                    }
                }
            }


        } else if (!dataProfile[i] && dataUser[i].type == 2) {
            bb++
        } else if (dataUser[i].currentStore && dataUser[i].type == 1) {
            cc++
        } else if (!dataUser[i].currentStore && dataUser[i].type == 1) {
            dd++
        }
        if (dataUser[i].ref) {
            if (!refArray[dataUser[i].ref]) {
                refArray[dataUser[i].ref] = 1
            } else {
                refArray[dataUser[i].ref]++
            }
        }
    }
    return new Promise(function (res, rej) {
        var datasend = {
            checkInadequateProfile24h: {
                hasProfile: a,
                noProfile: b,
                hasStore: c,
                noStore: d
            },
            checkInadequateProfileAll: {
                hasProfile: jobseeker,
                noProfile: bb,
                hasStore: cc,
                noStore: dd,
            },
            ref: refArray
        }

        res(datasend)
    })
}

function checkNotCreate() {
    for (var i in dataUser) {
        if (!dataProfile[i] && dataUser[i].type == 2) {

            var user = dataUser[i]
            var mail = {
                title: "Chỉ còn 1 bước nữa là bạn có thể tìm được việc phù hợp",
                body: getLastName(user.name) + " ơi, hãy tạo hồ sợ và chọn công việc phù hợp với bạn nhé, nếu gặp khó khăn thì bạn gọi vào số 0968 269 860 để được hỗ trợ nhé!",
                subtitle: '',
                description1: 'Dear ' + getLastName(user.name),
                description2: 'Hãy tạo hồ sợ và chọn công việc phù hợp với bạn nhé, nếu gặp khó khăn thì bạn gọi vào số 0968 269 860 để được hỗ trợ nhé!',
                description3: 'Đặc biệt, các bạn đăng video giới thiệu bản thân có tỉ lệ xin việc thành công cao hơn 20% so với những bạn không. Hãy đăng nhập vào tài khoản và xin việc ngay thôi nào: joboapp.com',
                calltoaction: 'Cật nhật ngay!',
                linktoaction: CONFIG.WEBURL,
                description4: ''
            };
            sendNotification(user, mail, true, true, true)
        }
        if (!dataUser[i].currentStore && dataUser[i].type == 1) {
            var user = dataUser[i]
            var mail = {
                title: "Chỉ còn 1 bước nữa là bạn có thể tìm được ứng viên phù hợp",
                body: getLastName(user.name) + " ơi, hãy đăng công việc của bạn lên, chúng tôi sẽ tìm ứng viên phù hợp cho bạn, nếu gặp khó khăn thì bạn gọi vào số 0968 269 860 để được hỗ trợ nhé!",
                subtitle: '',
                description1: 'Dear ' + getLastName(user.name),
                description2: 'hãy đăng công việc của bạn lên, chúng tôi sẽ tìm ứng viên phù hợp cho bạn,!',
                description3: 'Nếu gặp khó khăn thì bạn gọi vào số 0968 269 860 để được hỗ trợ nhé!',
                calltoaction: 'Đăng việc!',
                linktoaction: CONFIG.WEBURL,
                description4: ''
            }
            sendNotification(user, mail, true, true, true)

        }
    }
}

schedule.scheduleJob({hour: 12, minute: 30, dayOfWeek: 2}, function () {
    checkNotCreate()
});
// ====================================
// URL PARAMETERS =====================
// ====================================


var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({extended: true})); // support encoded bodies

// routes will go here

app.get('/check', function (req, res) {
    checkInadequate()
})

app.get('/', function (req, res) {
    res.send('Jobo Homepage');
});
app.get('/group', function (req, res) {
    res.send(groupData);
});
//
// app.use('/upload', (req, res, next) => {
//     console.log(req.originalUrl);
//     next();
// }, require('./api/routes/index'));

app.get('/api/dashboard', function (req, res) {
    var dashboard = {}
    dashboard.jobseeker = _.where(dataProfile, {feature: true})
    dashboard.employer = _.where(dataStore, {feature: true})
    res.send(dashboard)

    // profileCol.find({feature: true}).toArray(function (err, suc) {
    //     dashboard.jobseeker = suc
    //     storeCol.find({feature: true}).toArray(function (err, suc) {
    //         dashboard.employer = suc
    //         res.send(dashboard)
    //     })
    // })
})
// function createdUserFromCC() {
//     for (var i in userD) {
//         var a = 0
//         var userDa = userD[i]
//         if (userDa.email) {
//             secondary.auth().createUser({
//                 email: userDa.email,
//                 password: 'tuyendungjobo'
//             }).then(function (userRecord) {
//                 // See the UserRecord reference doc for the contents of userRecord.
//                 console.log("Successfully created new user:", userRecord.uid);
//
//                 var userData = {
//                     type: 2,
//                     phone: userDa.phone,
//                     userId: userRecord.uid,
//                     email: userDa.email,
//                     name: userDa.name,
//                     provider: 'normal',
//                     createdAt: new Date().getTime()
//                 };
//                 userRef.child(userRecord.uid).update(userData)
//                 a++
//                 console.log(a)
//             })
//                 .catch(function (error) {
//                     console.log("Error creating new user:", error);
//                 });
//         }
//
//
//     }
// }

app.get('/createuser', function (req, res) {
    var userId = req.param('uid')
    var email = req.param('email')
    var password = req.param('password')

    secondary.auth().createUser({
        uid: userId,
        email: email,
        password: password,
    }).then(function (userRecord) {
        // See the UserRecord reference doc for the contents of userRecord.
        console.log("Successfully created new user:", userRecord.uid);
        res.send(userRecord)

        var name = 'bạn'
        var job = 'nhân viên'
        var userData = dataUser[userRecord.uid]
        if (dataUser[userRecord.uid] && dataUser[userRecord.uid].name) {
            name = dataUser[userRecord.uid].name

        }
        if (dataStore[userRecord.uid] && dataStore[userRecord.uid].job) {
            job = getStringJob(dataStore[userRecord.uid].job)
        }
        var mail = {
            title: "Thông báo đăng tin tuyển dụng",
            preview: "Em đã đăng tin tuyển dụng vị trí ' + job + ' của anh chị lên web và app của Jobo",
            subtitle: '',
            description1: 'Chào ' + name,
            description2: 'Em đã đăng tin tuyển dụng vị trí ' + job + ' của anh chị lên web và app của Jobo - Chuyên việc làm PG, lễ tân, phục vụ, model',
            description3: 'Tài khoản để anh/chị sử dụng là: Email:' + userRecord.email + '/ Password: ' + 'tuyendungjobo' + '',
            calltoaction: 'Xem chi tiết',
            linktoaction: CONFIG.WEBURL + '/view/store/' + userRecord.uid,
            image: ''
        }
        sendNotification(userData, mail, true, true, true)


    })
        .catch(function (error) {
            console.log("Error creating new user:", error);
            res.send(error)

        });

})


app.get('/verifyemail', function (req, res) {
    var userId = req.param('id')
    userRef.child(userId).update({verifyEmail: true});
    res.send('Bạn đã xác thực tài khoản thành công, click vào đây để tiếp tục sử dụng: ' + CONFIG.WEBURL)
    res.redirect(CONFIG.WEBURL)
})

app.get('/api/places', function (req, res) {
    var query = req.param('query')
    var type = req.param('type')

    var url = 'https://maps.googleapis.com/maps/api/place/textsearch/json?query=' + query + '&language=vi&type=' + type + '&components=country:vi&sensor=true&key=' + CONFIG.APIKey + '&callback=JSON_CALLBACK';

    https.get(url, function (response) {
        var body = '';
        response.on('data', function (chunk) {
            body += chunk;
        });

        response.on('end', function () {
            res.send(body);
        });
    }).on('error', function (e) {
        console.log("Got error: " + e.message);
    });
});


// function scheduleJob(job,time,content) {
//     firebase.database().ref('schedule').update({
//         job: job,
//         time:time,
//         content: content
//     })
//
//     graph.post(userId + "/feed?access_token=" + accessToken,
//         {
//             "message": text.text,
//             "link": text.link
//         },
//         function (err, res) {
//             // returns the post id
//             console.log(res, err);
//
//
//         });
//
// }


app.get('/dash/job', function (req, res) {

    var mylat = req.param('lat')
    var mylng = req.param('lng')

    var joblist = [];
    var today = new Date().getTime()
    for (var i in dataJob) {
        var obj = dataJob[i];
        if (dataStore[obj.storeId]) {
            var store = dataStore[obj.storeId];
            var storeData = {
                storeName: store.storeName || '',
                createdBy: store.createdBy,
                avatar: store.avatar,
                industry: store.industry,
                location: store.location,
                address: store.address

            };
            if (dataUser[store.createdBy] && dataUser[store.createdBy].package) {
                storeData.package = dataUser[store.createdBy].package
            }

            var card = Object.assign(obj, storeData);
            if (card.location) {

                var yourlat = card.location.lat;
                var yourlng = card.location.lng;
                var distance = getDistanceFromLatLonInKm(mylat, mylng, yourlat, yourlng);

                if (distance < 100 && card.package == 'premium' && card.deadline > today) {

                    card.distance = distance
                    joblist.push(card)
                }
            }
        }

    }
    return new Promise(function (resolve, reject) {
        resolve(joblist)
    }).then(function (joblist) {
            var sorded = _.sortBy(joblist, function (card) {
                return -card.createdAt
            });
            res.send(sorded)
        }
    )

});

app.get('/api/job', function (req, res) {

    var userId = req.param('userId')
    var industryfilter = req.param('industry');
    var jobfilter = req.param('job');
    var working_typefilter = req.param('working_type');
    var salaryfilter = req.param('salary');
    var distancefilter = req.param('distance');

    var sort = req.param('sort');
    var show = req.param('show');
    var page = req.param('p');

    if (!CONFIG.data.job[jobfilter]) {
        jobfilter = ''
    }
    if (dataProfile[userId] && dataProfile[userId].location) {
        var userData = dataProfile[userId];
        var mylat = userData.location.lat;
        var mylng = userData.location.lng;
    }
    var today = new Date().getTime()
    var joblist = []
    for (var i in dataJob) {

        var obj = dataJob[i]
        if (dataStore[obj.storeId] && dataStore[obj.storeId].storeName) {

            var store = dataStore[obj.storeId]
            var storeData = {
                storeName: store.storeName,
                createdBy: store.createdBy,
                avatar: store.avatar,
                industry: store.industry,
                location: store.location,
                address: store.address

            };

            if (dataUser[store.createdBy] && dataUser[store.createdBy].package) {
                storeData.package = dataUser[store.createdBy].package
            }

            var card = Object.assign(obj, storeData);

            if (userData) {

                var keyAct = obj.storeId + ":" + userId;

                if (likeActivity[keyAct]) {
                    card.act = likeActivity[keyAct]
                }
                if (card.location) {
                    card.distance = getDistanceFromLatLonInKm(mylat, mylng, card.location.lat, card.location.lng);
                }
            }

            if (
                (card.job == jobfilter || !jobfilter)
                && (card.distance < 50 || !distancefilter)
                && (card.working_type == working_typefilter || !working_typefilter )
                && (card.industry == industryfilter || !industryfilter)
                && (card.salary > salaryfilter || !salaryfilter)
            ) {
                card.match = 0
                if (card.package == 'premium') {
                    card.match = card.match + 100
                }

                if (card.createdAt) {
                    var p = 100 / (today - card.createdAt)
                    card.match = card.match + p
                }

                joblist.push(card)

            }


        }
    }
    return new Promise(function (resolve, reject) {
        resolve(joblist)
    }).then(function (joblist) {
            var sorded;
            if (sort == 'viewed' || sort == 'rate' || sort == 'createdAt') {
                sorded = _.sortBy(joblist, function (card) {
                    return -card[sort]
                });
            } else if (sort == 'distance') {
                sorded = _.sortBy(joblist, function (card) {
                    return card[sort]
                })
            } else {
                sorded = _.sortBy(joblist, function (card) {
                    return -card.match
                })
            }
            var sendData = getPaginatedItems(sorded, page)
            res.send(sendData)
        }
    )

});

app.get('/api/filterEmployer', function (req, res) {

    var query = req.param('q')
    var param = JSON.parse(query)
    var location = param.location
    var industryfilter = param.industry
    var jobfilter = param.job
    var working_typefilter = param.working_type
    var distancefilter = param.distance
    var packagefilter = param.package

    var page = req.param('p');

    var joblist = []
    for (var i in dataJob) {
        var obj = dataJob[i]
        if (obj.storeId && dataStore[obj.storeId]) {

            var store = dataStore[obj.storeId]
            var storeData = {
                storeName: store.storeName,
                createdBy: store.createdBy,
                avatar: store.avatar,
                industry: store.industry,
                location: store.location,
                address: store.address

            };

            if (dataUser[store.createdBy] && dataUser[store.createdBy].package) {
                storeData.package = dataUser[store.createdBy].package
            }

            var card = Object.assign(obj, storeData);


            if (
                (card.job == jobfilter || !jobfilter)
                && (card.working_type == working_typefilter || !working_typefilter)
                && (card.industry == industryfilter || !industryfilter)
                && (card.package == packagefilter || !packagefilter)
            ) {
                if (location && card.location) {
                    card.distance = getDistanceFromLatLonInKm(location.lat, location.lng, card.location.lat, card.location.lng);
                    if (card.distance < distancefilter || !distancefilter) {
                        joblist.push(card)
                    }
                } else {
                    joblist.push(card)

                }

            }
        }
    }
    return new Promise(function (resolve, reject) {
        resolve(joblist)
    }).then(function (joblist) {
            var sorded;
            if (sort == 'viewed' || sort == 'rate' || sort == 'createdAt') {
                sorded = _.sortBy(joblist, function (card) {
                    return -card[sort]
                });
            } else if (sort == 'distance') {
                sorded = _.sortBy(joblist, function (card) {
                    return card[sort]
                })
            } else {
                sorded = _.sortBy(joblist, function (card) {
                    return -card.createdAt
                })
            }
            var sendData = getPaginatedItems(sorded, page)
            res.send(sendData)
        }
    )

});


app.get('/api/employer', function (req, res) {
    var userId = req.param('userId')
    var jobfilter = req.param('job');
    var industryfilter = req.param('industry');
    var distancefilter = req.param('distance');
    var sort = req.param('sort');

    var page = req.param('p');

    if (!CONFIG.data.job[jobfilter]) {
        jobfilter = ''
    }

    if (dataProfile[userId] && dataProfile[userId].location) {


        var userData = dataProfile[userId];

        var mylat = userData.location.lat;
        var mylng = userData.location.lng;

        var usercard = [];

        for (var i in dataStore) {
            var card = dataStore[i];
            var keyAct = card.storeId + ":" + userId;
            if (card.location
                && !card.hide
                && ((card.industry == industryfilter) || !industryfilter)
                && ((card.job && card.job[jobfilter]) || !jobfilter)
            ) {
                var distance = getDistanceFromLatLonInKm(mylat, mylng, card.location.lat, card.location.lng);
                card.distance = distance;
                if (dataStatic[card.storeId]) {
                    card.viewed = dataStatic[card.storeId].viewed || 0
                    card.rate = (dataStatic[card.storeId].rated || 0) * (dataStatic[card.storeId].rateAverage || 0)
                }

                card.match = 0;


                card.match = card.match + 10 + (+userData.expect_distance || 20) - +distance

                if (card.industry == industryfilter) {
                    card.match = card.match + 20
                }
                if (card.job && card.job[jobfilter]) {
                    card.match = card.match + 30
                }

                if (likeActivity[keyAct]) {
                    card.act = likeActivity[keyAct]
                }

                if (card.match >= 0) {
                    card.match = Math.round(card.match)
                }
                usercard.push(card)

            }


        }
        return new Promise(function (resolve, reject) {
            resolve(usercard)
        }).then(function (usercard) {
                var sorded
                if (sort == 'match' || sort == 'rate' || sort == 'viewed') {
                    sorded = _.sortBy(usercard, function (card) {
                        return -card[sort]
                    })
                    console.log('sort', sort)
                } else if (sort == 'distance') {
                    sorded = _.sortBy(usercard, function (card) {
                        return card[sort]
                    })
                } else {
                    sorded = _.sortBy(usercard, function (card) {
                        return -card.createdAt
                    })
                }
                var sendData = getPaginatedItems(sorded, page)

                res.send(sendData)
            }
        )
    } else {
        res.send('update location')
    }

});

app.get('/api/users', function (req, res) {
    var userId = req.param('userId')
    var jobfilter = req.param('job');
    var working_typefilter = req.param('working_type');
    var distancefilter = req.param('distance') || 20;
    var sexfilter = req.param('sex');
    var expfilter = req.param('experience');
    var figurefilter = req.param('figure');
    var urgentfilter = req.param('urgent');
    var adminNotefilter = req.param('note')
    var mylng = req.param('lng');
    var mylat = req.param('lat');

    var sort = req.param('sort');
    var page = req.param('p');
    if (!CONFIG.data.job[jobfilter]) {
        jobfilter = ''
    }

    var usercard = [];
    for (var i in dataProfile) {
        var card = dataProfile[i];
        card.match = 0;
        if (card.location
            && card.avatar
            && !card.hide
            && ((card.job && card.job[jobfilter]) || !jobfilter)
            && ((card.working_type == working_typefilter) || !working_typefilter)
            && ((card.sex == sexfilter) || !sexfilter)
            && ((card.urgent == urgentfilter) || !urgentfilter)
            && (card.experience || !expfilter)
            && (card.figure || !figurefilter)
            && (card.figure || !figurefilter)
            && (card.adminNote || !adminNotefilter)
        ) {
            if (mylat && mylng) {

                if (card.expect_distance) {
                    distancefilter = card.expect_distance
                }
                var distance = getDistanceFromLatLonInKm(mylat, mylng, card.location.lat, card.location.lng);
                if (distance < distancefilter) {
                    card.distance = distance;
                    usercard.push(card)
                }
            } else {

                usercard.push(card)

            }


        }
    }
    return new Promise(function (resolve, reject) {
        resolve(usercard)
    }).then(function (usercard) {
            var sorded
            if (sort == 'match' || sort == 'rate') {
                sorded = _.sortBy(usercard, function (card) {
                    return -card[sort]
                })
                console.log('sort', sort)
            } else if (sort == 'distance') {
                sorded = _.sortBy(usercard, function (card) {
                    return card[sort]
                })
            } else {
                sorded = _.sortBy(usercard, function (card) {
                    return -card.createdAt
                })
            }
            var sendData = getPaginatedItems(sorded, page)

            res.send(sendData)
        }
    )

});

app.get('/on/user', function (req, res) {
    var userId = req.param('userId');
    if (dataUser[userId]) {
        res.send(dataUser[userId])
    } else {
        res.send('NO_DATA')
    }
});

app.get('/on/profile', function (req, res) {
    var userId = req.param('userId');
    if (dataProfile[userId]) {
        res.send(dataProfile[userId])
    } else {
        res.send('NO_DATA')
    }

});

app.get('/on/store', function (req, res) {
    var storeId = req.param('storeId')
    if (dataStore[storeId]) {
        var storeData = dataStore[storeId]
        storeData.jobData = _.where(dataJob, {storeId: storeId});

        res.send(storeData)
    } else {
        res.send('NO_DATA')
    }

});

app.get('/delete/job', function (req, res) {
    var jobId = req.param('jobId')
    if (dataJob[jobId]) {
        var jobData = dataJob[jobId]
        var storeId = jobData.storeId
        var job = jobData.job
        jobRef.child(jobId).remove(function () {
            console.log('delete done')
            storeRef.child(storeId + '/job/' + job).remove(function () {
                res.send({
                    msg: 'delete key in store done',
                    code: 'success'
                })

            })
        })

    } else {
        res.send({
            msg: 'No data',
            code: 'no_data'
        })
    }

});

// app.get('/on/setting', function (req, res) {
//     var userId = req.param('userId')
//     if (dataSetting[userId]) {
//
//         res.send(dataSetting[userId])
//     } else {
//         res.send('NO_DATA')
//     }
// });

app.get('/update/user', function (req, res) {
    var userData = JSON.parse(req.param('user'))
    var userId = req.param('userId')
    var profileDataStr = req.param('profile')
    if (profileDataStr) {
        var profileData = JSON.parse(profileDataStr)
    }
    var storeId = req.param('storeId')
    var storeDataStr = req.param('store')
    if (storeDataStr) {
        var storeData = JSON.parse(storeDataStr)
    }

    if (userId) {
        if (userData) {
            console.log(userData)
            userRef.child(userId).update(userData)
        }

        if (profileData) {
            profileRef.child(userId).update(profileData)
        }

        if (storeId && storeData) {
            storeRef.child(storeId).update(storeData)
        }
        res.send(dataUser[userId])

    }


});

app.get('/update/review', function (req, res) {

    var reviewsStr = req.param('reviews')
    if (reviewsStr) {
        var reviews = JSON.parse(reviewsStr)

        res.send({
            msg: 'done',
            code: 'success'
        })
    }


});
// app.get('/update/setting', function (req, res) {
//     var settingStr = req.param('setting')
//     var userId = req.param('userId')
//     if (settingStr) {
//         var setting = JSON.parse(settingStr)
//         settingRef.child(userId).update(setting)
//     }
// });

app.get('/update/job', function (req, res) {
    var userId = req.param('userId')
    var jobDataStr = req.param('job')
    if (userId) {
        var jobData = JSON.parse(jobDataStr)
        console.log(jobDataStr)

        for (var i in jobData) {
            var job = jobData[i]
            if (job.job) {
                if (!job.jobId) {
                    job.jobId = 'j' + Math.round(100000000000000 * Math.random());
                }
                jobRef.child(job.jobId).update(job)
            } else {
                console.log('/update/job', job.storeId)
            }
        }

    }


    if (dataUser[userId]) {

        res.send(dataUser[userId])
    } else {
        res.send("NO_DATA")

    }

});


app.get('/update/lead', function (req, res) {
    var leadDataStr = req.param('lead')
    var lead = JSON.parse(leadDataStr)

    if (lead) {
        console.log(lead)
        lead.storeId = jobRef.push().key
        leadRef.child(lead.key).update(lead, function (err) {
            if (err) {
                res.send({
                    code: 'error'
                })
            } else {
                res.send({
                    code: 'success',
                    id: lead.storeId
                })
            }
        })
    }


});

app.get('/sendFirstEmail', function (req, res) {


    for (var i in dataProfile) {
        var card = dataProfile[i];
        if (card.location
            && card.avatar
            && card.name
            && ((card.job && card.job[firstJob]) || (!firstJob && card.feature == true))
        ) {
            card.url = CONFIG.WEBURL + '/view/profile/' + card.userId;
            var yourlat = card.location.lat;
            var yourlng = card.location.lng;
            var dis = getDistanceFromLatLonInKm(mylat, mylng, yourlat, yourlng);
            var stringJob = getStringJob(card.job)
            console.log(dis)
            if (
                dis < 20
            ) {
                mail.countsend++;
                profileEmail = profileEmail + '<td style="vertical-align:top;width:200px;"> <![endif]--> <div class="mj-column-per-33 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="center"> <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0px;" align="center" border="0"> <tbody> <tr> <td style="width:150px;"><img alt="" title="" height="auto" src="' + card.avatar + '" style="border:none;border-radius:0px;display:block;outline:none;text-decoration:none;width:100%;height:auto;" width="150"></td> </tr> </tbody> </table> </td> </tr> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="center"> <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:16px;font-weight:bold;line-height:22px;text-align:center;"> ' + card.name + ' </div> </td> </tr> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="justify"> <div class="" style="cursor:auto;color:#000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:center;" > ' + stringJob + ' cách ' + dis + ' km  </div> </td> </tr> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="center"> <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;" align="center" border="0"> <tbody>  <tr> <td  style="border:none;border-radius:40px;background: #1FBDF1;background: -webkit-linear-gradient(to left, #1FBDF1, #39DFA5); background: linear-gradient(to left, #1FBDF1, #39DFA5);cursor:auto;padding:10px 25px;"align="center" valign="middle" bgcolor="#8ccaca"><a href="' + card.url + '"> <p style="text-decoration:none;line-height:100%;color:#ffffff;font-family:helvetica;font-size:12px;font-weight:normal;text-transform:none;margin:0px;">Tuyển</p></a> </td> </tr></tbody> </table> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td>'

            }
            console.log(card.name)
            if (mail.countsend == maxsent) {
                break
            }
        }

    }

    return new Promise(function (resolve, reject) {
        resolve(profileEmail)
    }).then(function (profileEmail) {


        var headerEmail = '<!doctype html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head> <title></title> <!--[if !mso]><!-- --> <meta http-equiv="X-UA-Compatible" content="IE=edge"> <!--<![endif]--> <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"> <style type="text/css"> #outlook a { padding: 0; } .ReadMsgBody { width: 100%; } .ExternalClass { width: 100%; } .ExternalClass * { line-height: 100%; } body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; } table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; } img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; } p { display: block; margin: 13px 0; } </style> <!--[if !mso]><!--> <style type="text/css"> @media only screen and (max-width:480px) { @-ms-viewport { width: 320px; } @viewport { width: 320px; } } </style> <!--<![endif]--> <!--[if mso]><xml> <o:OfficeDocumentSettings> <o:AllowPNG/> <o:PixelsPerInch>96</o:PixelsPerInch> </o:OfficeDocumentSettings></xml><![endif]--> <!--[if lte mso 11]><style type="text/css"> .outlook-group-fix { width:100% !important; }</style><![endif]--> <style type="text/css"> @media only screen and (min-width:480px) { .mj-column-per-33 { width: 33.333333333333336%!important; } } </style></head><body> <div> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" > <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-100 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="left"> <div class="" style="cursor:auto;color:#000000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;"> <p>' + mail.description1 + '</p> </div> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="500" align="center" style="width:500px;"> <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;max-width:500px;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr>'

        var footerEmail = '<!--[if mso | IE]> </td></tr></table> <![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;"> <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;max-width:600px;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-100 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="left"> <div class="" style="cursor:auto;color:#000000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;"> <p>' + mail.description2 + '</p></div> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;"> <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;max-width:600px;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-100 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;"><p style="font-size:1px;margin:0px auto;border-top:1px solid #E0E0E0;width:100%;"></p> <!--[if mso | IE]> <table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" style="font-size:1px;margin:0px auto;border-top:1px solid #E0E0E0;width:100%;" width="600"> <tr> <td style="height:0;line-height:0;"></td> </tr> </table><![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-80 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="left"> <div class="" style="cursor:auto;color:#000000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;"> <p>' + mail.description3 + '<br> ' + CONFIG.WEBURL + ' </div> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-20 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="left"> <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0px;" align="left" border="0"> <tbody> <tr> <td style="width:70px;"><img alt="" title="" height="auto" src="' + CONFIG.WEBURL + '/img/logo.png" style="border:none;border-radius:;display:block;outline:none;text-decoration:none;width:100%;height:auto;" width="70"></td> </tr> </tbody> </table> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--></div></body></html>'

        var email = mail.email;
        console.log('send, ' + email);

        var htmlEmail = headerEmail + profileEmail + footerEmail


        if (email && userInfo.wrongEmail != true) {
            var mailOptions = {
                from: {
                    name: 'Khánh Thông | Jobo - Tìm việc nhanh',
                    address: 'thonglk.mac@gmail.com'
                },
                cc: ['thonglk@joboapp.com', 'myhuyen@joboapp.com', 'linhcm@joboapp.com'],
                to: mail.email,
                subject: 'Chào mừng ' + mail.storeName + ' tuyển gấp nhân viên trên Jobo',
                html: htmlEmail,
                attachments: [
                    {   // filename and content type is derived from path
                        path: 'https://joboapp.com/img/proposal_pricing_included.pdf'
                    }
                ]
            };

            return mailTransport.sendMail(mailOptions).then(function () {
                console.log('New email sent to: ' + email);
            }, function (error) {
                console.log('Some thing wrong when sent email to ' + email + ':' + error);
            });
        }
        var notification = {
            title: 'Chào mừng ' + storeData.storeName + ' tuyển gấp nhân viên trên Jobo',
            body: 'Hãy cập nhật vị trí đăng tuyển và lướt chọn những ứng viên phù hợp',
            subtitle: '',
            calltoaction: 'Bắt đầu',
            linktoaction: '',
            image: '',
            storeId: storeData.storeId
        }
        sendNotification(userInfo, notification, false, true, true)
    })


})


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

app.get('/getLongToken', function (req, res) {
    var shortToken = req.param('token')
    https.get('https://graph.facebook.com/oauth/access_token?' +
        'grant_type=fb_exchange_token&' +
        'client_id= 295208480879128&' +
        'client_secret=4450decf6ea88c391f4100b5740792ae&' +
        'fb_exchange_token=' + shortToken, function (response) {
        var body = '';
        response.on('data', function (chunk) {
            body += chunk;
        });

        response.on('end', function () {
            res.send(body);
        });
    })
})

app.get('/update/log', function (req, res) {
    var userId = req.param('userId')
    var key = req.param('key')
    var log = JSON.parse(req.param('log'))


    if (userId) {
        if (log && key) {
            logRef.child(key).update(log).then(function () {
                res.send('result')
            }, function (err) {
                res.send('err:' + err)

            })

        }
    }
    var action = log.action
    if (action == 'createProfile'
        || action == 'createStore'
        || action == 'updateProfile'
        || action == 'updateStore'
        || action == 'viewStore'
        || action == 'viewProfile'
        || action == 'like'
        || action == 'match'
        || action == 'sendMessage'
        || action == 'setInterview'
        || action == 'serviceWorker'
        || action == 'requestPermission'
        || action == 'decline'

    ) {
        actRef.child(key).set(log)
        console.log("Jobo act", log);
    }


});

app.get('/initData', function (req, res) {
    var userId = req.param('userId')
    var user = {}
    if (dataUser[userId]) {

        user.userData = dataUser[userId]
        // user.notification = dataNoti[userId]
        if (dataUser[userId].type == 1 && dataUser[userId].currentStore) {
            var storeId = dataUser[userId].currentStore
            user.storeData = dataStore[storeId]
            user.storeList = _.where(dataStore, {createdBy: userId});
            user.onlineList = _.where(dataProfile, {'presence/status': 'online'})
            user.reactList = {}
            user.reactList.match = _.where(likeActivity, {storeId: storeId, status: 1});
            user.reactList.like = _.where(likeActivity, {storeId: storeId, status: 0, type: 1});
            user.reactList.liked = _.where(likeActivity, {storeId: storeId, status: 0, type: 2});
        }
        if (dataUser[userId].type == 2) {
            if (dataProfile[userId]) {
                user.userData = Object.assign(dataProfile[userId], dataUser[userId]);

            }
            user.onlineList = _.where(dataStore, {'presence/status': 'online'})
            user.reactList = {}
            user.reactList.match = _.where(likeActivity, {userId: userId, status: 1});
            user.reactList.like = _.where(likeActivity, {userId: userId, status: 0, type: 2});
            user.reactList.liked = _.where(likeActivity, {userId: userId, status: 0, type: 1});
        }

        return new Promise(function (resolve, reject) {
            resolve(user)
        }).then(function (user) {

                res.send(user)
            }
        )
    } else {
        res.send('NO_DATA')

    }
});

app.get('/view/profile', function (req, res) {
    var userId = req.param('userId')
    var profileId = req.param('profileId')
    if (dataProfile[profileId]) {
        var profileData = dataProfile[profileId]
        profileData.actData = {}
        profileData.actData.match = _.where(likeActivity, {userId: profileId, status: 1});
        profileData.actData.like = _.where(likeActivity, {userId: profileId, status: 0, type: 2});
        profileData.actData.liked = _.where(likeActivity, {userId: profileId, status: 0, type: 1});
        profileData.static = dataStatic[profileId]
        if (userId) {
            if (dataUser[userId]
                && dataUser[userId].currentStore
                && likeActivity[dataUser[userId].currentStore + ':' + profileId]) {

                var myStoreId = dataUser[userId].currentStore
                profileData.act = likeActivity[myStoreId + ':' + profileId]
            }

            if (dataUser[userId] && dataUser[userId].admin == true) {
                profileData.adminData = dataUser[profileId]
            }
        }

        res.send(profileData)
    } else {
        res.send("NO_DATA")

    }

});

app.get('/view/store', function (req, res) {
    var userId = req.param('userId');
    var storeId = req.param('storeId');
    if (dataStore[storeId]) {
        var storeData = dataStore[storeId]

        storeData.jobData = _.where(dataJob, {storeId: storeId});
        storeData.actData = {}
        storeData.actData.match = _.where(likeActivity, {storeId: storeId, status: 1});
        storeData.actData.like = _.where(likeActivity, {storeId: storeId, status: 0, type: 1});
        storeData.actData.liked = _.where(likeActivity, {storeId: storeId, status: 0, type: 2});
        storeData.static = dataStatic[storeId];

        if (userId) {
            if (likeActivity[storeId + ':' + userId]) {
                storeData.act = likeActivity[storeId + ':' + userId]
            }
            if (dataUser[userId].admin == true) {
                storeData.adminData = dataUser[storeData.createdBy]
            }
        }
        res.send(storeData)

    } else {
        res.send('NO_DATA')

    }
});

app.get('/api/profile', function (req, res) {
    var userId = req.param('id');
    var infoUserData = dataUser[userId] || {};
    var profileData = dataProfile[userId];
    console.log(infoUserData, profileData)

    var userData = Object.assign(infoUserData, profileData);
    res.send(userData);

});


app.get('/log/activity', function (req, res) {
    var page = req.param('page') || 1
    var sorded = _.sortBy(likeActivity, function (card) {
        return -card.likeAt
    });
    var cards = getPaginatedItems(sorded, page);
    res.send(cards)
});

app.get('/log/profile', function (req, res) {
    var page = req.param('page') || 1
    var sorded = _.sortBy(dataProfile, function (card) {
        return -card.createdAt
    });
    var cards = getPaginatedItems(sorded, page);
    res.send(cards)
});

app.get('/log/job', function (req, res) {
    var page = req.param('page') || 1
    var listJob = []
    for (var i in dataJob) {
        var job = dataJob[i]
        if (job.storeId && dataStore[job.storeId] && dataStore[job.storeId].storeName) {
            job.storeName = dataStore[job.storeId].storeName
        } else {
            if (!job.storeId) {
                var a = i.split(':')
                var storeId = a[0]
                jobRef.child(i).update({storeId: storeId})
                console.log('done')
            }
        }
        listJob.push(job)

    }
    return new Promise(function (resolve, reject) {
        resolve(listJob)
    }).then(function (listJob) {
        var sorded = _.sortBy(listJob, function (card) {
            return -card.createdAt
        });
        var cards = getPaginatedItems(sorded, page);
        res.send(cards)
    })

});

app.get('/log/store', function (req, res) {
    var page = req.param('page') || 1
    var sorded = _.sortBy(dataStore, function (card) {
        return -card.createdAt
    });
    var cards = getPaginatedItems(sorded, page);
    res.send(cards)
});

app.get('/log/user', function (req, res) {
    var page = req.param('page') || 1
    var sorded = _.sortBy(dataUser, function (card) {
        return -card.createdAt
    });
    var cards = getPaginatedItems(sorded, page);
    res.send(cards)
});

app.get('/sendverify', function (req, res) {
    var userId = req.param('id');

    if (dataUser[userId]) {
        var userData = dataUser[userId]

        sendVerifyEmail(userData.email, userId, userData.name)

    }
    res.send('sended to' + dataUser[userId].email)


})

app.get('/query', function (req, res) {
    var q = req.param('q');
    var qr = S(q.toLowerCase()).latinise().s
    var result = {
        profile: [],
        store: []
    }
    var a = 0, b = 0;
    if (q) {
        for (var i in dataStore) {
            if (dataStore[i].storeName && S(dataStore[i].storeName.toLowerCase()).latinise().s.match(qr) && a < 6) {
                a++
                result.store.push(dataStore[i])
            }
        }

        for (var i in dataProfile) {
            if ((dataProfile[i].name && S(dataProfile[i].name.toLowerCase()).latinise().s.match(qr) && b < 6)
                || (dataUser[i] && dataUser[i].phone && dataUser[i].phone.toString().match(qr))
                || (dataUser[i] && dataUser[i].email && dataUser[i].email.match(qr))

            ) {
                b++
                result.profile.push(dataProfile[i])
            }
        }
        return new Promise(function (resolve, reject) {
            resolve(result)
        }).then(function (result) {
            res.send(result)
        })
    } else {
        res.send(result)

    }


})

app.get('/checkUser', function (req, res) {
    var q = req.param('q');
    if (q) {
        var qr = S(q.toLowerCase()).latinise().s
        var result = []

        for (var i in dataUser) {
            if ((dataUser[i] && dataUser[i].phone && dataUser[i].phone.toString().match(qr))
                || (dataUser[i] && dataUser[i].email && dataUser[i].email.match(qr))
            ) {
                result.push(dataUser[i])
            }
        }
        return new Promise(function (resolve, reject) {
            resolve(result)
        }).then(function (result) {
            res.send(result)
        })
    } else {
        res.send({
            code: -1,
            msg: 'No query'
        })
    }


})


//admin API

app.get('/admin/createuser', function (req, res) {
    var userId = req.param('uid')
    var email = req.param('uid') + '@joboapp.com'
    var password = req.param('pass')
    secondary.auth().createUser({
        uid: userId,
        email: email,
        password: password
    })
        .then(function (userRecord) {
            // See the UserRecord reference doc for the contents of userRecord.
            console.log("Successfully created new user:", userRecord.uid);
            var userData = {
                userId: userRecord.uid,
                name: userRecord.uid,
                email: email,
                createdAt: new Date().getTime(),
                type: 1,
                admin: true
            };
            userRef.child(userRecord.uid).update(userData)
            res.send(userRecord)
        })
        .catch(function (error) {
            console.log("Error creating new user:", error);
            res.send(error)

        });
})

app.get('/admin/scheduleemail', function (req, res) {
    var userId = req.param('userId')
    var subject = req.param('subject')
    var body = req.param('body')
    var date = req.param('date')

    var email = dataUser[userId]
    schedule.scheduleJob(date, function () {
        sendEmail(email, subject, body)
        console.log('scheduleemail', email, subject, body)
    });
    res.send(date, body)

})

app.get('/admin/deleteuser', function (req, res) {
    var userId = req.param('id');

    secondary.auth().deleteUser(userId)
        .then(function () {
            console.log("Successfully deleted user");
            //remove user
            userRef.child(userId).remove()
            profileRef.child(userId).remove()
            var reactRef = firebase.database().ref('activity/like')
            var reactList = reactRef.orderByChild('userId').equalTo(userId);
            reactList.once("value")
                .then(function (snapshot) {
                    snapshot.forEach(function (childSnapshot) {
                        // key will be "ada" the first time and "alan" the second time
                        if (childSnapshot) {
                            var key = childSnapshot.key;
                            reactRef.child(key).remove()
                        }

                        // childData will be the actual contents of the child
                        res.send('done')

                    });
                });
        })

        .catch(function (error) {
            console.log("Error deleting user:", error);
        });

})

app.get('/admin/storeEmail', function (req, res) {
    var send = ''
    for (var i in dataUser) {
        if (dataUser[i].type == 1 && dataUser[i].email) {
            send = send + dataUser[i].email + '\n'
        }
    }
    res.send(send)
})


/**
 * Send the new star notification email to the given email.
 */

function sendMessenger(messengerId, body, calltoaction, linktoaction, key) {
    var url = 'https://jobobot.herokuapp.com/noti';
    var param = {
        messages: {
            text: body,
            calltoaction: calltoaction,
            linktoaction: linktoaction,
            image: image
        },
        recipientIds: messengerId
    }
    https.post(url, param, function (response) {
        var body = '';
        response.on('data', function (chunk) {
            body += chunk;
        });

        response.on('end', function () {
            console.log('sendMessenger')
            notificationRef.child(key + '/messenger').update({sent: true})
        });
    }).on('error', function (e) {
        console.log("Got error: " + e.message);
    });
}


function sendNotificationToGivenUser(registrationToken, body, title, cta, type, key) {

    var payload = {
        notification: {
            title: title,
            body: body
        },
        data: {
            cta: cta
        }
    };

// Set the message as high priority and have it expire after 24 hours.
    var options = {
        priority: "high",
        timeToLive: 60 * 60 * 24
    };

// Send a message to the device corresponding to the provided
// registration token with the provided options.
    secondary.messaging().sendToDevice(registrationToken, payload, options)
        .then(function (response) {
            console.log("secondary sent message:", JSON.stringify(response.results));
            if (response.successCount == 1 && type && key) {
                notificationRef.child(key + '/' + type).update({sent: true})
            }
        })
        .catch(function (error) {
            console.log("Error sending message:", error);
        });


}

function sendEmail(email, subject, bodyHtml, key) {
    if (email) {
        var mailOptions = {
            from: {
                name: 'Khánh Thông | Jobo - Tìm việc nhanh',
                address: 'thonglk.mac@gmail.com'
            },
            to: email,
            subject: subject,
            html: bodyHtml
        };
        return mailTransport.sendMail(mailOptions).then(function () {
            console.log('New email sent to: ' + email);
            notificationRef.child(key + '/email').update({sent: true})
        }, function (error) {
            console.log('Some thing wrong when sent email to ' + email + ':' + error);
        });
    }

}

function getNameById(id) {
    if (dataProfile[id]) {
        return dataProfile[id].name
    } else if (dataUser[id] && dataStore[dataUser[id].currentStore]) {
        return dataStore[dataUser[id].currentStore].storeName
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

function getLastName(fullname) {
    if (fullname) {
        var str = fullname;
        var LastName;
        var res = str.split(" ");
        var resNumber = res.length;
        var resLast = +resNumber - 1
        LastName = res[resLast]
        return LastName
    } else {
        return 'bạn'
    }
}

function getStringJob(listJob) {
    var stringJob = '';
    for (var i in listJob) {
        if (Lang[i]) {
            stringJob += Lang[i]
        }
    }
    if (stringJob.length > 1) {
        var lengaf = stringJob.length - 2
        var resJob = stringJob.substr(0, lengaf);
        return resJob
    } else {
        return ' '
    }
}

function addCountJob(storeId, userId, job) {
    var jobData = dataJob[storeId]
    for (var key in job) {
        var jobdetail = jobData[key]
        if (!jobdetail.apply) {
            jobdetail.apply = {}
        }
        jobdetail.apply[userId] = true
    }
    console.log(JSON.stringify(jobData))
}

function countAllPoint(a) {
    if (a) {

        return (a.viewed || 0) * 1 + (a.liked || 0) * 4 + (a.shared || 0 ) * 3 + (a.rated || 0) * (a.rateAverage || 0) * 2 + (a.matched || 0) * 8 + (a.chated || 0) * 4 + (a.like || 0) * 2 + (a.share || 0) * 2 + (a.rate || 0) * 2 + (a.match || 0) * 3 + (a.chat || 0) * 2 + (a.timeOnline || 0) + (a.login || 0) * 3 + (a.profile || 0)
    } else {
        return 0
    }
}

function checkProfilePoint(profileData) {
    var point = 0
    if (profileData.location) {
        point = point + 2
    }
    if (profileData.avatar) {
        point = point + 4
    }
    if (profileData.birth) {
        point = point + 1
    }
    if (profileData.expect_salary) {
        point = point + 2
    }

    if (profileData.address) {
        point = point + 2
    }

    if (profileData.experience) {
        var time = 0
        for (var i in profileData.experience) {

            var card = profileData.experience[i]
            if (card.end == true) {
                card.end = new Date().getTime()
            }
            if (card.end && card.start) {
                time = time + new Date(card.end).getTime() - new Date(card.start).getTime()
            }
        }
        var month = time / (1000 * 60 * 60 * 24 * 30)
        if (month < 24) {
            point = point + month
        } else if (month > 24) {
            point = point + 24 + month / 5

        }

    }
    if (profileData.figure) {

        point = point + 2

    }

    if (profileData.height == profileData.height / 1) {

        point = point + +profileData.height / 100

    }
    if (profileData.weight) {

        point = point + 1

    }


    if (profileData.languages) {

        point = point + +Object.keys(profileData.languages).length * 3

    }

    if (profileData.name) {

        point = point + 1

    }

    if (profileData.photo) {

        point = point + +Object.keys(profileData.photo).length * 3

    }

    if (profileData.urgent) {

        point = point + +profileData.urgent * 5

    }

    if (profileData.feature) {

        point = point + 10

    }

    if (profileData.videourl) {

        point = point + 20

    }

    if (profileData.time) {

        point = point + 2

    }

    return Math.round(point)
}

function gct(userId) {
    return dataUser[userId].currentStore
}


function addDateToJob(ref) {
    if (ref) {
        db.ref(ref).once('value', function (snap) {
            var jobSnap = snap.val()
            if (jobSnap && !jobSnap.createdAt) {
                db.ref(ref).update({createdAt: new Date().getTime()})
            }
        })
    }

}


app.get('/sendFirstEmailToTotalStore', function (req, res) {

    sendFirstEmailToTotalStore()
    res.send('done')
})

function sendFirstEmailToTotalStore() {
    var listEmployer = _.where(dataUser, {type: 1})
    var a = 0
    var send = 0
    var s = 0

    function loop() {
        var userId = listEmployer[a].userId;
        var storeId = listEmployer[a].currentStore;
        if (listEmployer[a].email == 'nhahangsaigon157@gmail.com') {
            send = 1
        }

        if (send == 1) {
            sendWelcomeEmailToStore(storeId, userId)
            s++
            console.log(s)
        }
        a++

        if (send == 0) {
            loop()
        } else if (a < listEmployer.length) {
            setTimeout(function () {
                loop()
            }, 1000)
        }
    }

    loop()

}

app.get('/sendWelcomeEmailToStore', function (req, res) {
    var storeId = req.param('storeId')
    var userId = req.param('userId')
    sendWelcomeEmailToStore(storeId, userId)
    res.send(storeId + userId)
})


app.get('/initStore', function (req, res) {
    var storeId = req.param('storeId');
    var storeData = dataStore[storeId]


    sendWelcomeEmailToStore(storeId)
    if (storeData.job) {
        setTimeout(function () {
            sendStoretoPage(storeId)
        }, 5000)
        setTimeout(function () {
            PostStore(storeId)
        }, 10000)
        setTimeout(function () {
            sendNotiSubcribleToProfile(storeId)
        }, 20000)
    }
    res.send('done')
})

function startList() {

    actRef.on('child_added', function (snap) {
        var key = snap.key
        var card = snap.val();

        if (card.userId && card.userId.length > 1 && card.userId.indexOf('.') == -1) {
            run(card, key)
        } else {
            console.log('cannt listen', key)
            actRef.child(key).remove()
        }
    });


    function run(card, key) {


        if (!dataStatic[card.userId]) {
            staticRef.child(card.userId).update(staticData)
        }

        //save static for each store and profile

        if (card.data
            && card.data.storeId
            && !dataStatic[card.data.storeId]) {

            staticRef.child(card.data.storeId).update(staticData)
        }

        if (card.data
            && card.data.userId
            && !dataStatic[card.data.userId]) {
            staticRef.child(card.data.userId).update(staticData)
        }

        /**
         * Track View
         */

        if (card.action == 'trackView') {
            actRef.child(key).remove()
        }

        /**
         * serviceWorker
         */

        if (card.action == 'serviceWorker') {
            actRef.child(key).remove()
        }

        /**
         * show_video
         */

        if (card.action == 'show_video') {
            actRef.child(key).remove()
        }

        /**
         * getToken
         */
        if (card.action == 'getToken') {
            actRef.child(key).remove()
        }


        /**
         * requestPermission
         */
        if (card.action == 'requestPermission') {
            actRef.child(key).remove()
        }

        /**
         * Create Profile
         */


        if (card.action == 'createProfile') {
            if (dataProfile[card.userId]) {

                var userData = dataProfile[card.userId]
                var name = userData.name || 'bạn'
                var userId = card.userId
                staticRef.child(card.userId).update(staticData);

                if (!userData.createdAt) {
                    profileRef.child(card.userId).update({createdAt: new Date().getTime()})
                }
                if (!userData.userId) {
                    profileRef.child(card.userId).update({userId: card.userId})
                }

                if (dataUser[card.userId] && dataUser[card.userId].email) {
                    var email = dataUser[card.userId].email

                    sendVerifyEmail(email, userId, name)

                    setTimeout(function () {
                        sendWelcomeEmailToProfile(dataUser[card.userId], userData)
                        sendNotiSubcribleToEmployer(userData);

                        actRef.child(key).remove()

                    }, 50000)
                } else {
                    console.log('createProfile error email ' + card.userId)

                }


            } else {
                console.log('createProfile error ' + card.userId)
                actRef.child(key).remove()

            }


        }

        /**
         * Create Store
         */


        if (card.action == 'createStore') {
            console.log('createStore', card.userId)
            if (dataUser[card.userId] && card.data &&
                card.data.storeId
            ) {
                var employerData = dataUser[card.userId]
                var storeData = dataStore[card.data.storeId]
                var storeId = card.data.storeId
                if (!employerData.currentStore) {
                    userRef.child(card.userId).update({currentStore: storeId})
                }
                if (!storeData.storeId) {
                    storeRef.child(employerData.currentStore).update({storeId: card.data.storeId})
                }
                staticRef.child(storeId).update(staticData);
                if (!storeData.createdAt) {
                    storeRef.child(storeId).update({createdAt: new Date().getTime()})
                }
                if (!storeData.createdBy) {
                    storeRef.child(storeId).update({createdBy: userId})
                }
                var name = employerData.name || 'bạn'
                var email = dataUser[card.userId].email
                var userId = card.userId
                sendVerifyEmail(email, userId, name)
                for (var i in dataJob) {
                    var jobData = dataJob[i]
                    if (jobData.storeId == storeId) {
                        addDateToJob('job/' + i)

                        if (!jobData.deadline) {
                            console.log('checkInadequateStoreIdInJob_deadline', i)
                            jobRef.child(i).update({deadline: new Date().getTime() + 1000 * 60 * 60 * 24 * 7})
                        }
                        if (!jobData.createdBy) {
                            jobRef.child(i).update({createdBy: userId})
                        }
                        if (!jobData.jobName) {

                            jobRef.child(i).update({jobName: CONFIG.data.job[jobData.job]})
                        }
                    }

                }

                sendWelcomeEmailToStore(storeId)
                if (storeData.job) {
                    setTimeout(function () {
                        sendStoretoPage(storeId)
                    }, 5000)
                    setTimeout(function () {
                        PostStore(storeId)
                    }, 10000)
                    setTimeout(function () {
                        sendNotiSubcribleToProfile(storeId)
                    }, 20000)
                }

                actRef.child(key).remove()
            } else {
                if (!dataUser[card.userId]) {

                    console.log('no user', card.userId)

                } else if (!card.data || !card.data.storeId) {
                    var storeDataList = _.where(dataStore, {createdBy: card.userId})
                    if (storeDataList.length > 0) {
                        var storeData = storeDataList[0]
                        var storeId = storeData.storeId
                        if (storeId) {
                            var userData = dataUser[card.userId]
                            var userId = card.userId
                            sendVerifyEmail(userData.email, userId, userData.name)
                            for (var i in dataJob) {
                                var jobData = dataJob[i]
                                if (jobData.storeId == storeId) {
                                    addDateToJob('job/' + i)

                                    if (!jobData.deadline) {
                                        console.log('checkInadequateStoreIdInJob_deadline', i)
                                        jobRef.child(i).update({deadline: new Date().getTime() + 1000 * 60 * 60 * 24 * 7})
                                    }
                                    if (!jobData.createdBy) {
                                        jobRef.child(i).update({createdBy: userId})
                                    }
                                    if (!jobData.jobName) {

                                        jobRef.child(i).update({jobName: CONFIG.data.job[jobData.job]})
                                    }
                                }

                            }

                            sendWelcomeEmailToStore(storeId)
                            if (storeData.job) {
                                setTimeout(function () {
                                    sendStoretoPage(storeId)
                                }, 5000)
                                setTimeout(function () {
                                    PostStore(storeId)
                                }, 10000)
                                setTimeout(function () {
                                    sendNotiSubcribleToProfile(storeId)
                                }, 20000)
                            }

                            actRef.child(key).remove()
                        }
                    }
                }
            }

        }
        /**
         * Update Profile
         */

        if (card.action == 'updateProfile') {
            if (dataProfile[card.userId]) {
                staticRef.child(card.userId).update({profile: checkProfilePoint(card.userId)})
                var userData = dataProfile[card.userId]
                if (userData.expect_salary) {
                    if (userData.expect_salary > 10) {
                        var res = userData.expect_salary.toString().charAt(0);
                        var x = Number(res)
                        profileRef.child(card.userId).update({expect_salary: x})
                    }
                }
                if (!userData.userId) {
                    profileRef.child(card.userId).update({userId: card.userId})
                }
                if (dataProfile[card.userId].avatar && dataProfile[card.userId].name) {
                    for (var i in likeActivity) {
                        if (likeActivity[i].userId == card.userId) {
                            likeActivityRef.child(i).update({
                                userAvatar: dataProfile[card.userId].avatar,
                                name: dataProfile[card.userId].name
                            })
                        }
                    }

                }

                actRef.child(key).remove()
            }
        }

        /**
         * Update Store
         */

        if (card.action == 'updateStore') {
            var employerData = dataUser[card.userId]
            if (employerData && employerData.currentStore) {
                var storeData = dataStore[employerData.currentStore]
                for (var i in storeData.job) {
                    addDateToJob('job/' + storeData.storeId + ':' + i)
                    var jobData = dataJob[storeData.storeId + ':' + i]
                    if (jobData) {
                        if (!jobData.createdBy) {

                            jobRef.child(i).update({createdBy: card.userId})
                        }
                        if (!jobData.jobName) {

                            jobRef.child(i).update({jobName: CONFIG.data.job[jobData.job]})
                        }

                        if (storeData) {
                            jobData.storeId = storeData.storeId
                            jobData.storeName = storeData.storeName
                        }
                    }
                }

                if (storeData.avatar && storeData.storeName) {
                    for (var i in likeActivity) {
                        if (likeActivity[i].storeId == storeData.storeId) {
                            likeActivityRef.child(i).update({
                                storeAvatar: storeData.avatar,
                                storeName: storeData.storeName
                            })
                        }
                    }

                }

                if (card.data && card.data.job) {
                    sendNotiSubcribleToProfile(storeData.storeId)
                    sendJobtoPage(storeData)
                } else {
                    console.log('thiếu thông tin store,', card.id)
                }
                actRef.child(key).remove()
            }

        }

        /**
         * View Store
         */


        if (card.action == 'viewStore') {
            if (card.data.storeId && dataStatic[card.data.storeId]) {
                var i = dataStatic[card.data.storeId].viewed++
                staticRef.child(card.data.storeId).update({viewed: i})
                actRef.child(key).remove()
            } else {
                actRef.child(key).remove()
            }

        }

        /**
         * like Store
         */

        if (card.action == 'like' && card.data.storeId) {
            var actKey = card.data.storeId + ':' + card.userId
            var likeData = likeActivity[actKey]
            setTimeout(function () {
                sendMailNotiLikeToStore(likeData)

                if (dataStatic[card.data.storeId]) {
                    var a = dataStatic[card.data.storeId].liked++
                    staticRef.child(card.data.storeId).update({liked: a || 0})
                }
                if (dataStatic[card.userId]) {
                    console.log('dataStatic[card.userId]', dataStatic[card.userId])
                    var b = dataStatic[card.userId].like++
                    console.log('b', b)
                    staticRef.child(card.userId).update({like: b || 0})
                }

                actRef.child(key).remove()
            }, 5000)

        }

        /**
         * like Profile
         */

        if (card.action == 'like' && card.data.userId) {
            card.storeId = gct(card.userId)
            var actKey = card.storeId + ':' + card.data.userId
            var likeData = likeActivity[actKey]
            setTimeout(function () {
                    if (likeData) {
                        sendMailNotiLikeToProfile(likeData)

                        if (dataStatic[card.data.userId]) {
                            var a = dataStatic[card.data.userId].liked++ || 1
                            staticRef.child(card.data.userId).update({liked: a})
                        }
                        if (dataStatic[card.storeId]) {
                            var b = dataStatic[card.storeId].like++
                            staticRef.child(card.storeId).update({like: b})
                        }
                        actRef.child(key).remove()

                    } else {
                        console.log('like error', actKey)
                        likeActivityRef.child(actKey).remove()
                        actRef.child(key).remove()
                    }
                }
                ,
                5000
            )


        }

        /**
         * Send Message
         */
        if (card.action == 'sendMessage') {
            if (card.data) {
                if (card.data.type == 0) {
                    if (dataStore[card.data.sender] && dataProfile[card.data.to]) {
                        var notification = {
                            title: 'Tin nhắn mời từ ' + dataStore[card.data.sender].storeName,
                            body: card.data.text,
                            description1: 'Chào ' + getLastName(dataProfile[card.data.to].name),
                            description2: dataStore[card.data.sender].storeName + ' : ' + card.data.text,
                            description3: '',
                            calltoaction: 'Trả lời!',
                            linktoaction: CONFIG.WEBURL + '/view/store/' + card.data.sender,
                            description4: '',
                            image: ''
                        };
                        sendNotification(dataUser[card.data.to], notification, true, true, true)

                    } else {
                        console.log('error')
                    }
                } else if (card.data.type == 1) {
                    if (dataProfile[card.data.sender] && dataStore[card.data.to]) {
                        var notification = {
                            title: 'Tin nhắn mời từ ' + dataProfile[card.data.sender].name,
                            body: card.data.text,
                            description1: 'Chào ' + dataStore[card.data.to].storeName,
                            description2: dataProfile[card.data.sender].name + ' : ' + card.data.text,
                            description3: '',
                            calltoaction: 'Trả lời!',
                            linktoaction: CONFIG.WEBURL + '/view/profile/' + card.data.sender,
                            description4: '',
                            image: '',
                            storeId: card.data.to

                        };
                        sendNotification(dataUser[dataStore[card.data.to].createdBy], notification, true, true, true)
                    } else {
                        console.log('error')
                    }


                } else {
                    console.log('sendMessage', card.userId)
                }
                actRef.child(key).remove()

            } else {
                console.log('sendMessage no Data', card.userId)

            }

        }

        /**
         * View Profile
         */

        if (card.action == 'viewProfile') {
            if (dataStatic[card.data.userId]) {

                var i = dataStatic[card.data.userId].viewed++ || 1
                staticRef.child(card.data.userId).update({viewed: i})

                actRef.child(key).remove()

            }
        }

        /**
         * match Profile
         */
        if (card.action == 'match' && card.data.userId) {
            console.log('new match')
            card.storeId = gct(card.userId)
            var actKey = card.storeId + ':' + card.data.userId
            setTimeout(function () {
                console.log(actKey)
                var likeData = likeActivity[actKey]
                console.log(likeData)
                if (likeData) {
                    sendMailNotiMatchToProfile(likeData)

                    if (dataStatic[card.data.userId]) {
                        var a = dataStatic[card.data.userId].matched++ || 1
                        staticRef.child(card.data.userId).update({liked: a})
                    }
                    if (dataStatic[card.storeId]) {
                        var b = dataStatic[card.storeId].match++
                        staticRef.child(card.storeId).update({like: b})
                    }
                    actRef.child(key).remove()

                } else {
                    console.log('don')
                }
            }, 5000)
        }

        /**
         * match Store
         */
        if (card.action == 'match' && card.data.storeId) {
            var actKey = card.data.storeId + ':' + card.userId
            var likeData = likeActivity[actKey]

            setTimeout(function () {
                if (likeData) {
                    sendMailNotiMatchToStore(likeData)

                    if (dataStatic[card.data.userId]) {
                        var a = dataStatic[card.data.storeId].matched++ || 1
                        staticRef.child(card.data.userId).update({liked: a})
                    }
                    if (dataStatic[card.storeId]) {
                        var b = dataStatic[card.userId].match++
                        staticRef.child(card.storeId).update({like: b})
                    }
                    actRef.child(key).remove()

                } else {
                    console.log('match Store', card.key)
                }
            }, 5000)
        }


        /**
         * createLead
         */
        if (card.action == 'createLead' && card.data.userId) {
            var storeData = dataStore[card.data.userId]
            var userInfo = dataUser[card.data.userId]
            sendWelcomeEmailToStore(storeData.storeId, userInfo.userId)
            actRef.child(key).remove()
        }

    }
}


/**
 * Mail Setup
 */

function sendStoretoPage(storeId) {
    var storeData = dataStore[storeId];
    storeData.jobData = _.where(dataJob, {storeId: storeId});
    if (storeData.jobData) {
        if (storeData.createdBy
            && dataUser[storeData.createdBy]) {

            storeData.userInfo = dataUser[storeData.createdBy]
            if (storeData.userInfo.package == 'premium') {
                if (storeData.avatar) {
                    PublishPhoto(publishChannel.Jobo.pageId, createJDStore(storeId), publishChannel.Jobo.token)
                } else {
                    PublishPost(publishChannel.Jobo.pageId, createJDStore(storeId), publishChannel.Jobo.token)
                }
            }
        }

    }

}


function sendJobtoPage(store) {
    if (store) {
        if (store.avatar) {
            PublishPhoto(publishChannel.viecLamNhaHang.pageId, createJDStore(store.storeId), publishChannel.viecLamNhaHang.token)

        } else {
            PublishPost(publishChannel.viecLamNhaHang.pageId, createJDStore(store.storeId), publishChannel.viecLamNhaHang.token)
        }

        if (store.package == 'premium') {
            if (store.avatar) {
                PublishPhoto(publishChannel.Jobo.pageId, createJDStore(store.storeId), publishChannel.Jobo.token)
            } else {
                PublishPost(publishChannel.Jobo.pageId, createJDStore(store.storeId), publishChannel.Jobo.token)
            }
        }
    } else {
        console.log('sendJobtoPage error')
    }

}

function sendVerifyEmail(email, userId, name) {
    if (email) {

    }

    function who() {
        if (dataUser[userId] && dataUser[userId].type) {
            var who = dataUser[userId].type
            if (who == 1) {
                return ' ứng viên '
            }
            if (who == 2) {
                return ' công việc '
            }
        }

    }

    var type = who()
    var lastName = getLastName(name);
    var html = '<div style="width:100%!important;background-color:#fff;margin-top:0;margin-bottom:0;margin-right:0;margin-left:0;padding-top:0;padding-bottom:0;padding-right:0;padding-left:0;font-family:' + font + ';font-weight:300"> <table border="0" cellpadding="0" cellspacing="0" id="m_-5282972956275044657background-table" style="background-color:#fff" width="100%"> <tbody> <tr style="border-collapse:collapse"> <td align="center" style="font-family:' + font + ';font-weight:300;border-collapse:collapse"> <table border="0" cellpadding="0" cellspacing="0" class="m_-5282972956275044657w640" style="margin-top:0;margin-bottom:0;margin-right:10px;margin-left:10px" width="640"> <tbody> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w640" height="20" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="640"> &nbsp;</td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w640" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="640"> <table bgcolor="#4E8EF7" border="0" cellpadding="0" cellspacing="0" class="m_-5282972956275044657w640" id="m_-5282972956275044657top-bar" style="background-color:#ffffff;color:#ffffff" width="640"> <tbody> <tr style="border-collapse:collapse"> <td align="left" cellpadding="5" class="m_-5282972956275044657w580" colspan="3" height="8" style="padding-top:10px;padding-bottom:10px;padding-right:10px;padding-left:10px;font-family:' + font + ';font-weight:300;border-collapse:collapse" valign="middle" width="580"> <div class="m_-5282972956275044657header-lead" style="color:#fff;padding-top:0px;padding-bottom:0px;padding-right:0px;padding-left:0px;font-size:0px">   </div> </td> </tr> </tbody> </table> </td> </tr> <tr style="border-collapse:collapse"> <td align="center" bgcolor="#fff" class="m_-5282972956275044657w640" id="m_-5282972956275044657header" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="640"> <div align="center" style="text-align:center"><h1 class="m_-5282972956275044657title" style="line-height:100%!important;font-size:40px;font-family:' + font + ';font-weight:300;margin-top:10px;margin-bottom:18px"> Xác thực email</h1></div> </td> </tr> <tr id="m_-5282972956275044657simple-content-row" style="border-collapse:collapse"> <td bgcolor="#ffffff" class="m_-5282972956275044657w640" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="640"> <table align="left" border="0" cellpadding="0" cellspacing="0" class="m_-5282972956275044657w640" width="640"> <tbody> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30"><p>&nbsp;</p></td> <td class="m_-5282972956275044657w580" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="580"> <table border="0" cellpadding="0" cellspacing="0" class="m_-5282972956275044657w580" width="580"> <tbody> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w580" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="580"> <div align="left" class="m_-5282972956275044657article-content" style="font-size:16px;line-height:30px;color:#5f6a7d;margin-top:0px;margin-bottom:18px;font-family:' + font + ';font-weight:300"> <p style="margin-bottom:15px">Chào ' + lastName + '</p> <p style="margin-bottom:15px">Hãy nhấn vào link bên dưới để xác thực email của bạn và đảm bảo email này giúp Jobo thông báo ' + type + ' cho bạn</p> </div> </td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w580" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="580"> <div style="text-align:center"><a href="' + CONFIG.APIURL + '/verifyemail?id=' + userId + '" style="background: #1FBDF1;background: -webkit-linear-gradient(to left, #1FBDF1, #39DFA5); background: linear-gradient(to left, #1FBDF1, #39DFA5);color:#ffffff;display:inline-block;font-family:sans-serif;font-size:16px;font-weight:bold;line-height:60px;text-align:center;text-decoration:none;width:300px" target="_blank"> Xác thực </a> </div> </td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w580" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="580"> <div align="left" class="m_-5282972956275044657article-content" style="font-size:16px;line-height:30px;color:#5f6a7d;margin-top:0px;margin-bottom:18px;font-family:' + font + ';font-weight:300"> <p style="margin-bottom:15px">Hoặc nhấn vào liên kết này: <a href="' + CONFIG.APIURL + '/verifyemail?id=' + userId + '" target="_blank"> ' + CONFIG.APIURL + '/verifyemail?id=' + userId + ' </a> </p> </div> </td> </tr> </tbody> </table> <table border="0" cellpadding="0" cellspacing="0" class="m_-5282972956275044657w580" width="580"> <tbody> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w580" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="580"><p align="left" class="m_-5282972956275044657article-title" style="font-size:18px;line-height:24px;color:#2b3038;font-weight:bold;margin-top:0px;margin-bottom:18px;font-family:' + font + '"> &nbsp;</p> <div align="left" class="m_-5282972956275044657article-content" style="font-size:16px;line-height:30px;color:#5f6a7d;margin-top:0px;margin-bottom:18px;font-family:' + font + ';font-weight:300"> <p style="margin-bottom:15px">Rất vui được giúp bạn!</p> <p style="margin-bottom:15px">Jobo Team</p></div> </td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w580" height="10" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="580">&nbsp;</td> </tr> </tbody> </table> </td> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30">&nbsp;</td> </tr> </tbody> </table> </td> </tr> <tr style="border-collapse:collapse"> <td bgcolor="#ffffff" class="m_-5282972956275044657w640" height="15" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="640"> &nbsp;</td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w640" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="640"> <table bgcolor="#ffffff" border="0" cellpadding="0" cellspacing="0" class="m_-5282972956275044657w640" id="m_-5282972956275044657footer" style="border-top-width:1px;border-top-style:solid;border-top-color:#f1f1f1;background-color:#ffffff;color:#d4d4d4" width="640"> <tbody> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30">&nbsp;</td> <td class="m_-5282972956275044657w580 m_-5282972956275044657h0" height="30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="360">&nbsp;</td> <td class="m_-5282972956275044657w0" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="60">&nbsp;</td> <td class="m_-5282972956275044657w0" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="160">&nbsp;</td> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30">&nbsp;</td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30">&nbsp;</td> <td class="m_-5282972956275044657w580" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" valign="top" width="360"><p align="left" class="m_-5282972956275044657footer-content-left" id="m_-5282972956275044657permission-reminder" style="font-size:12px;line-height:15px;color:#d4d4d4;margin-top:0px;margin-bottom:15px;white-space:normal"> <span>Sent with ♥ from Jobo</span></p> <p align="left" class="m_-5282972956275044657footer-content-left" style="font-size:12px;line-height:15px;color:#d4d4d4;margin-top:0px;margin-bottom:15px"> <a href="https://joboapp.com" style="color:#c4c4c4;text-decoration:none;font-weight:bold" target="_blank">Xem thêm</a></p></td> <td class="m_-5282972956275044657hide m_-5282972956275044657w0" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="60">&nbsp;</td> <td class="m_-5282972956275044657hide m_-5282972956275044657w0" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" valign="top" width="160"><p align="right" class="m_-5282972956275044657footer-content-right" id="m_-5282972956275044657street-address" style="font-size:11px;line-height:16px;margin-top:0px;margin-bottom:15px;color:#d4d4d4;white-space:normal"> <span>Jobo</span><br style="line-height:100%"> <span>+84 968 269 860</span><br style="line-height:100%"> <span>299 Trung Kính,HN</span></p></td> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30">&nbsp;</td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30">&nbsp;</td> <td class="m_-5282972956275044657w580 m_-5282972956275044657h0" height="15" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="360">&nbsp;</td> <td class="m_-5282972956275044657w0" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="60">&nbsp;</td> <td class="m_-5282972956275044657w0" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="160">&nbsp;</td> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30">&nbsp;</td> </tr> </tbody> </table> </td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w640" height="60" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="640"> &nbsp;</td> </tr> </tbody> </table> </td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w640" height="60" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="640">&nbsp;</td> </tr> </tbody> </table></div>'
    sendEmail(email, 'Xác thực email', html)
}

function sendWelcomeEmailToProfile(userData, profileData) {
    var mail = {
        title: 'Chúc mừng ' + getLastName(userData.name || profileData.name) + ' đã tham gia cộng đồng người tìm việc của Jobo',
        body: 'Hãy hoàn thành đầy đủ thông tin hồ sơ cá nhân, và đặt lịch hẹn với Jobo để tiến hành phỏng vấn chọn nhé',
        subtitle: '',
        description1: 'Chào ' + getLastName(dataProfile[userData.userId].name),
        description2: 'Bạn đã tạo hồ sơ thành công trên Jobo, tiếp theo bạn cần đảm bảo đã hoàn thành đầy đủ thông tin hồ sơ',
        description3: 'Sau khi hoàn thành xong, hãy gọi điện cho chúng tôi để đặt lịch hẹn với Jobo, chúng tôi sẽ tư vấn, đào tạo và giới thiệu việc làm phù hợp cho bạn',
        calltoaction: 'Gọi cho chúng tôi',
        linktoaction: 'tel:0968269860',
        image: ''
    };
    sendNotification(userData, mail, true, true, true)
}

function sendWelcomeEmailToStore(storeId, userId) {
    var storeData = dataStore[storeId];
    var userInfo
    if (storeData && storeData.createdBy && dataUser[storeData.createdBy]) {
        userInfo = dataUser[storeData.createdBy]
    } else {
        userInfo = dataUser[userId]
    }
    if (userInfo && storeData && storeId && storeData.storeName && storeData.job && storeData.location) {
        var mail = {
            email: userInfo.email,
            password: 'tuyendungjobo',
            storeName: storeData.storeName,
            storeUrl: CONFIG.WEBURL + '/view/store/' + storeData.storeId
        }
        var firstJob = Object.keys(storeData.job)[0]
        if (CONFIG.data.job[firstJob]) {
            mail.job = CONFIG.data.job[firstJob]
        } else {
            firstJob = ''
            mail.job = 'nhân viên'
        }
        mail.countsend = 0

        console.log(firstJob)
        var mylat = storeData.location.lat;
        var mylng = storeData.location.lng;

        var profileEmail = ''
        var maxsent = 21
        for (var i in dataProfile) {
            var card = dataProfile[i];
            if (card.location
                && card.avatar
                && card.name
                && ((card.job && card.job[firstJob]) || (!firstJob && card.feature == true))
            ) {
                card.url = CONFIG.WEBURL + '/view/profile/' + card.userId;
                var yourlat = card.location.lat;
                var yourlng = card.location.lng;
                var dis = getDistanceFromLatLonInKm(mylat, mylng, yourlat, yourlng);
                var stringJob = getStringJob(card.job)
                console.log(dis)
                if (
                    dis < 20
                ) {
                    mail.countsend++;
                    profileEmail = profileEmail + '<td style="vertical-align:top;width:200px;"> <![endif]--> <div class="mj-column-per-33 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="center"> <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0px;" align="center" border="0"> <tbody> <tr> <td style="width:150px;"><img alt="" title="" height="auto" src="' + card.avatar + '" style="border:none;border-radius:0px;display:block;outline:none;text-decoration:none;width:100%;height:auto;" width="150"></td> </tr> </tbody> </table> </td> </tr> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="center"> <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:16px;font-weight:bold;line-height:22px;text-align:center;"> ' + card.name + ' </div> </td> </tr> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="justify"> <div class="" style="cursor:auto;color:#000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:center;" > ' + stringJob + ' cách ' + dis + ' km  </div> </td> </tr> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="center"> <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;" align="center" border="0"> <tbody>  <tr> <td  style="border:none;border-radius:40px;background: #1FBDF1;background: -webkit-linear-gradient(to left, #1FBDF1, #39DFA5); background: linear-gradient(to left, #1FBDF1, #39DFA5);cursor:auto;padding:10px 25px;"align="center" valign="middle" bgcolor="#8ccaca"><a href="' + card.url + '"> <p style="text-decoration:none;line-height:100%;color:#ffffff;font-family:helvetica;font-size:12px;font-weight:normal;text-transform:none;margin:0px;">Tuyển</p></a> </td> </tr></tbody> </table> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td>'

                }
                console.log(card.name)
                if (mail.countsend == maxsent) {
                    break
                }
            }

        }

        return new Promise(function (resolve, reject) {
            resolve(profileEmail)
        }).then(function (profileEmail) {


            var headerEmail = '<!doctype html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head> <title></title> <!--[if !mso]><!-- --> <meta http-equiv="X-UA-Compatible" content="IE=edge"> <!--<![endif]--> <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"> <style type="text/css"> #outlook a { padding: 0; } .ReadMsgBody { width: 100%; } .ExternalClass { width: 100%; } .ExternalClass * { line-height: 100%; } body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; } table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; } img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; } p { display: block; margin: 13px 0; } </style> <!--[if !mso]><!--> <style type="text/css"> @media only screen and (max-width:480px) { @-ms-viewport { width: 320px; } @viewport { width: 320px; } } </style> <!--<![endif]--> <!--[if mso]><xml> <o:OfficeDocumentSettings> <o:AllowPNG/> <o:PixelsPerInch>96</o:PixelsPerInch> </o:OfficeDocumentSettings></xml><![endif]--> <!--[if lte mso 11]><style type="text/css"> .outlook-group-fix { width:100% !important; }</style><![endif]--> <style type="text/css"> @media only screen and (min-width:480px) { .mj-column-per-33 { width: 33.333333333333336%!important; } } </style></head><body> <div> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" > <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-100 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="left"> <div class="" style="cursor:auto;color:#000000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;"> <p>Chào ' + mail.storeName + '</p> <p> Jobo.asia là dự án cung cấp nhân viên gấp cho ngành dịch vụ trong vòng 24h, với mong muốn giúp nhà tuyển dụng tiết kiệm thời gian để tìm được ứng viên phù hợp. <br> Chúng tôi hiện đang có hơn 12000+ ứng viên và sẵn sàng cung cấp đủ số lượng ứng viên phù hợp với vị trí ' + mail.job + ' mà đối tác cần tuyển.<br> <br> <b>Các quyền lợi của ' + mail.storeName + ' khi trở thành đối tác của JOBO: </b><br> <br> - Cung cấp nhân sự ngay <b>trong vòng 24h</b> và không phải trả phí đối với các ứng viên bị loại.<br> - Tự động đăng tin lên hơn 20+ group tuyển dụng Facebook, website vệ tinh<br> - Quảng cáo thương hiệu <b>hoàn toàn miễn phí</b> trên các kênh truyền thông với hơn 200,000 lượt tiếp cận..<br> <br> Chúng tôi rất mong nhận được phản hồi và xin phép liên hệ lại để giải đáp tất cả các thắc mắc.<br> Để biết thêm các thông tin chi tiết về JOBO – Ứng dụng tuyển dụng nhanh, đối tác có thể tham khảo file đính kèm.</p> <p>Dưới đây là ' + mail.countsend + ' ứng viên phù hợp với vị trí ' + mail.job + ' mà Jobo đã tìm cho đối tác. Hãy chọn ứng viên nào đối tác thấy phù hợp và gọi cho chúng tôi để tuyển ứng viên đó</p> </div> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="500" align="center" style="width:500px;"> <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;max-width:500px;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr>'

            var footerEmail = '<!--[if mso | IE]> </td></tr></table> <![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;"> <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;max-width:600px;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-100 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="left"> <div class="" style="cursor:auto;color:#000000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;"> <p>Nếu vẫn chưa chọn được ứng viên phù hợp, đối tác hãy truy cập vào web của jobo để xem thêm hơn +5500 ứng viên nữa.</p> <p>Tài khoản để sử dụng là: Tên đăng nhập: ' + mail.email + ' / Password: ' + mail.password + '</p> <p>Link truy cập: <a href="' + CONFIG.WEBURL + '">' + CONFIG.WEBURL + '</a></p> <p>Trang thương hiệu : <a href=' + mail.storeUrl + '>' + mail.storeName + '</a></p> <p>Jobo rất vinh dự được làm việc với đối tác!</p> <p>Khánh Thông - CEO & Founder, Jobo</p></div> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;"> <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;max-width:600px;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-100 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;"><p style="font-size:1px;margin:0px auto;border-top:1px solid #E0E0E0;width:100%;"></p> <!--[if mso | IE]> <table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" style="font-size:1px;margin:0px auto;border-top:1px solid #E0E0E0;width:100%;" width="600"> <tr> <td style="height:0;line-height:0;"></td> </tr> </table><![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-80 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="left"> <div class="" style="cursor:auto;color:#000000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;"> <p>Sent with ♥ from Jobo</p> +84 968 269 860<br> ' + CONFIG.WEBURL + ' </div> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-20 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="left"> <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0px;" align="left" border="0"> <tbody> <tr> <td style="width:70px;"><img alt="" title="" height="auto" src="' + CONFIG.WEBURL + '/img/logo.png" style="border:none;border-radius:;display:block;outline:none;text-decoration:none;width:100%;height:auto;" width="70"></td> </tr> </tbody> </table> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--></div></body></html>'

            var email = mail.email;
            console.log('send, ' + email);

            var htmlEmail = headerEmail + profileEmail + footerEmail


            if (email && userInfo.wrongEmail != true) {
                var mailOptions = {
                    from: {
                        name: 'Khánh Thông | Jobo - Tìm việc nhanh',
                        address: 'thonglk.mac@gmail.com'
                    },
                    cc: ['thonglk@joboapp.com', 'myhuyen@joboapp.com', 'linhcm@joboapp.com'],
                    to: mail.email,
                    subject: 'Chào mừng ' + mail.storeName + ' tuyển gấp nhân viên trên Jobo',
                    html: htmlEmail,
                    attachments: [
                        {   // filename and content type is derived from path
                            path: 'https://joboapp.com/img/proposal_pricing_included.pdf'
                        }
                    ]
                };

                return mailTransport.sendMail(mailOptions).then(function () {
                    console.log('New email sent to: ' + email);
                }, function (error) {
                    console.log('Some thing wrong when sent email to ' + email + ':' + error);
                });
            }
            var notification = {
                title: 'Chào mừng ' + storeData.storeName + ' tuyển gấp nhân viên trên Jobo',
                body: 'Hãy cập nhật vị trí đăng tuyển và lướt chọn những ứng viên phù hợp',
                subtitle: '',
                calltoaction: 'Bắt đầu',
                linktoaction: '',
                image: '',
                storeId: storeData.storeId
            }
            sendNotification(userInfo, notification, false, true, true)
        })
    } else if (userInfo && userInfo.email) {

        var mail = {
            email: userInfo.email,
            password: 'tuyendungjobo'
        }
        if (storeData && storeData.storeName) {
            mail.storeName = storeData.storeName
        } else {
            mail.storeName = 'đối tác'
        }
        if (storeData && storeData.storeId) {
            mail.storeUrl = CONFIG.WEBURL + '/view/store/' + storeData.storeId
        } else {
            mail.storeUrl = CONFIG.WEBURL
        }

        if (storeData && storeData.job) {
            var firstJob = Object.keys(storeData.job)[0]
            mail.job = CONFIG.data.job[firstJob]
        } else {
            mail.job = 'nhân viên'
        }

        mail.countsend = 0

        var profileEmail = ''

        var maxsent = 21
        for (var i in dataProfile) {
            var card = dataProfile[i];
            card.url = CONFIG.WEBURL + '/view/profile/' + card.userId

            if (card.job
                && card.avatar
                && card.name
                && card.feature == true
            ) {
                var stringJob = getStringJob(card.job)

                mail.countsend++;
                profileEmail = profileEmail + '<td style="vertical-align:top;width:200px;"> <![endif]--> <div class="mj-column-per-33 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="center"> <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0px;" align="center" border="0"> <tbody> <tr> <td style="width:150px;"><img alt="" title="" height="auto" src="' + card.avatar + '" style="border:none;border-radius:0px;display:block;outline:none;text-decoration:none;width:100%;height:auto;" width="150"></td> </tr> </tbody> </table> </td> </tr> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="center"> <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:16px;font-weight:bold;line-height:22px;text-align:center;"> ' + card.name + ' </div> </td> </tr> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="justify"> <div class="" style="cursor:auto;color:#000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:center;" > ' + stringJob + '  </div> </td> </tr> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="center"> <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;" align="center" border="0"> <tbody>  <tr> <td  style="border:none;border-radius:40px;background: #1FBDF1;background: -webkit-linear-gradient(to left, #1FBDF1, #39DFA5); background: linear-gradient(to left, #1FBDF1, #39DFA5);cursor:auto;padding:10px 25px;"align="center" valign="middle" bgcolor="#8ccaca"><a href="' + card.url + '"> <p style="text-decoration:none;line-height:100%;color:#ffffff;font-family:helvetica;font-size:12px;font-weight:normal;text-transform:none;margin:0px;">Tuyển</p></a> </td> </tr></tbody> </table> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td>'

                console.log(card.name)
                if (mail.countsend == maxsent) {
                    break
                }
            }

        }

        return new Promise(function (resolve, reject) {
            resolve(profileEmail)
        }).then(function (profileEmail) {

            var headerEmail = '<!doctype html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head> <title></title> <!--[if !mso]><!-- --> <meta http-equiv="X-UA-Compatible" content="IE=edge"> <!--<![endif]--> <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"> <style type="text/css"> #outlook a { padding: 0; } .ReadMsgBody { width: 100%; } .ExternalClass { width: 100%; } .ExternalClass * { line-height: 100%; } body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; } table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; } img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; } p { display: block; margin: 13px 0; } </style> <!--[if !mso]><!--> <style type="text/css"> @media only screen and (max-width:480px) { @-ms-viewport { width: 320px; } @viewport { width: 320px; } } </style> <!--<![endif]--> <!--[if mso]><xml> <o:OfficeDocumentSettings> <o:AllowPNG/> <o:PixelsPerInch>96</o:PixelsPerInch> </o:OfficeDocumentSettings></xml><![endif]--> <!--[if lte mso 11]><style type="text/css"> .outlook-group-fix { width:100% !important; }</style><![endif]--> <style type="text/css"> @media only screen and (min-width:480px) { .mj-column-per-33 { width: 33.333333333333336%!important; } } </style></head><body> <div> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" > <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-100 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="left"> <div class="" style="cursor:auto;color:#000000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;"> <p>Chào ' + mail.storeName + '</p> <p> Joboapp.com là dự án cung cấp nhân viên gấp cho ngành dịch vụ trong vòng 24h, với mong muốn giúp nhà tuyển dụng tiết kiệm thời gian để tìm được ứng viên phù hợp. Các ứng viên của chúng tôi đa phần đã được đào tạo và có kinh nghiệm trong lĩnh vực Nhà hàng - Khách sạn, Nhân viên kinh doanh, Marketing ,Design , Hành chính... có thể làm bán thời gian hoặc toàn thời gian và đặc biệt cam kết làm việc lâu dài nếu phù hợp.”<br> <br> Chúng tôi hiện đang có hơn 12000+ ứng viên và sẵn sàng cung cấp đủ số lượng ứng viên phù hợp với vị trí Nhân viên phục vụ mà nhà hàng cần tuyển.<br> <br> Các quyền lợi của ' + mail.storeName + ' khi trở thành đối tác của JOBO:<br> <br> - Cung cấp nhân sự ngay trong vòng 24h và không phải trả phí đối với các ứng viên bị loại.<br> - Chỉ 15% ứng viên được tuyển chọn khắt khe của chúng tôi<br> - Đăng tin tuyển dụng và quảng cáo thương hiệu hoàn toàn miễn phí trên các kênh truyền thông với hơn 200,000 lượt tiếp cận..<br> <br> Chúng tôi rất mong nhận được phản hồi và xin phép liên hệ lại sớm nhất để giải đáp tất cả các thắc mắc của đối tác.<br> Để biết thêm các thông tin chi tiết về JOBO – Ứng dụng tuyển dụng nhanh, cửa hàng có thể tham khảo file đính kèm.</p> <p> Dưới đây là ' + mail.countsend + ' ứng viên phù hợp với vị trí ' + mail.job + ' mà Jobo đã tìm cho bạn. Hãy chọn ứng viên nào bạn muốn và gọi cho chúng tôi để tuyển ứng viên đó</p> </div> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="500" align="center" style="width:500px;"> <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;max-width:500px;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr>'

            var footerEmail = '<!--[if mso | IE]> </td></tr></table> <![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;"> <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;max-width:600px;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-100 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="left"> <div class="" style="cursor:auto;color:#000000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;"> <p>Nếu vẫn chưa chọn được ứng viên phù hợp, bạn hãy truy cập vào web của jobo để xem thêm hơn +5500 ứng viên nữa.</p> <p>Tài khoản để anh/chị sử dụng là: Tên đăng nhập: ' + mail.email + ' / Password: ' + mail.password + '</p> <p>Link truy cập: <a href="' + CONFIG.WEBURL + '">' + CONFIG.WEBURL + '</a></p> <p>Trang thương hiệu của bạn: <a href=' + mail.storeUrl + '>' + mail.storeName + '</a></p> <p>Rất vui được giúp đỡ bạn!</p> <p>Khánh Thông - CEO & Founder, Jobo</p></div> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;"> <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;max-width:600px;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-100 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;"><p style="font-size:1px;margin:0px auto;border-top:1px solid #E0E0E0;width:100%;"></p> <!--[if mso | IE]> <table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" style="font-size:1px;margin:0px auto;border-top:1px solid #E0E0E0;width:100%;" width="600"> <tr> <td style="height:0;line-height:0;"></td> </tr> </table><![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-80 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="left"> <div class="" style="cursor:auto;color:#000000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;"> <p>Sent with ♥ from Jobo</p> +84 968 269 860<br> joboapp.com </div> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-20 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="left"> <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0px;" align="left" border="0"> <tbody> <tr> <td style="width:70px;"><img alt="" title="" height="auto" src="' + CONFIG.WEBURL + '/img/logo.png" style="border:none;border-radius:;display:block;outline:none;text-decoration:none;width:100%;height:auto;" width="70"></td> </tr> </tbody> </table> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--></div></body></html>'

            var email = mail.email
            console.log('send, ' + email)
            var htmlEmail = headerEmail + profileEmail + footerEmail
            var mailOptions = {
                from: {
                    name: 'Khánh Thông | Jobo - Tìm việc nhanh',
                    address: 'thonglk.mac@gmail.com'
                },
                cc: ['thonglk@joboapp.com', 'myhuyen@joboapp.com', 'linhcm@joboapp.com'],
                to: mail.email,
                subject: 'Chào mừng ' + mail.storeName + ' tuyển gấp nhân viên trên Jobo',
                html: htmlEmail,
                attachments: [
                    {   // filename and content type is derived from path
                        path: 'https://joboapp.com/img/proposal_pricing_included.pdf'
                    }
                ]
            };

            return mailTransport.sendMail(mailOptions).then(function () {
                console.log('New email sent to: ' + email);
            }, function (error) {
                console.log('Some thing wrong when sent email to ' + email + ':' + error);
            });

            var notification = {
                title: 'Chào mừng ' + storeData.storeName + ' tuyển gấp nhân viên trên Jobo',
                body: 'Hãy cập nhật vị trí đăng tuyển và lướt chọn những ứng viên phù hợp',
                subtitle: '',
                calltoaction: 'Bắt đầu',
                linktoaction: '',
                image: '',
                storeId: storeData.storeId
            }
            sendNotification(userInfo, notification, false, true, true)
        })

    } else {
        console.log('userInfo s')
    }

}


// noti match noti to employer
function sendNotiSubcribleToEmployer(userData) {
    if (userData.avatar && userData.location && userData.job) {
        for (var i in dataStore) {
            var card = dataStore[i];
            if (card.location && card.job) {

                var dis = getDistanceFromLatLonInKm(card.location.lat, card.location.lng, userData.location.lat, userData.location.lng);

                if (
                    (dis <= 20)
                    &&
                    ((card.job[userData.job[0]]) || (card.job[userData.job[1]]) || (card.job[userData.job[2]]))
                ) {
                    var mail = {
                        title: 'Có ứng viên mới phù hợp với bạn',
                        body: 'Chúng tôi tìm thấy ứng viên ' + userData.name + ' rất phù hợp với thương hiệu của bạn, xem hồ sơ và tuyển ngay!',
                        data: {
                            name: userData.name,
                            avatar: userData.avatar,
                            job: getStringJob(userData.job) + ' cách ' + dis + ' km'
                        },
                        description1: 'Chào cửa hàng ' + card.storeName,
                        description2: 'Được biết thương hiệu của bạn vẫn đang cần tuyển nhân viên, chúng tôi tìm thấy ứng viên ' + userData.name + ' rất phù hợp với yêu cầu của bạn, xem hồ sơ và tuyển ngay!',
                        subtitle: '',

                        calltoaction: 'Xem hồ sơ',
                        linktoaction: '/view/profile/' + userData.userId,
                        image: '',
                        description3: 'Nếu bạn không thích ứng viên này, bạn có thể chọn các ứng viên khác, chúng tôi có hơn 1000 ứng viên được cập nhật mới mỗi ngày.',
                        storeId: card.storeId
                    };
                    sendNotification(dataUser[card.createdBy], mail, true, true, true)
                }
            }
        }
    } else {
        console.log('sendNotiSubcribleToEmployer error', userData.userId)
    }

}


function sendNotiSubcribleToProfile(storeId) {
    var storeData = dataStore[storeId]
    console.log(storeData.job)
    if (storeData.storeName && storeData.job && storeData.location) {
        for (var i in dataProfile) {
            var card = dataProfile[i];
            if (card.location && card.job) {
                var dis = getDistanceFromLatLonInKm(storeData.location.lat, storeData.location.lng, card.location.lat, card.location.lng);

                if (dis <= 20) {


                    var mail = {
                        title: 'Jobo | ' + storeData.storeName + ' tuyển dụng',
                        body: storeData.storeName + ' đang tuyển dụng ' + getStringJob(storeData.job) + ' rất phù hợp với  bạn, xem mô tả và ứng tuyển ngay!',
                        data: {
                            name: storeData.storeName,
                            avatar: storeData.avatar || '',
                            job: getStringJob(storeData.job) + ' cách ' + dis + ' km'
                        },
                        description1: 'Chào ' + getLastName(card.name),
                        description2: storeData.storeName + ' đang tuyển dụng ' + getStringJob(storeData.job) + ' rất phù hợp với  bạn, xem mô tả và ứng tuyển ngay!',
                        subtitle: '',
                        calltoaction: 'Xem chi tiết',
                        linktoaction: '/view/store/' + storeData.storeId + '#ref=kt',
                        image: '',
                        description3: 'Nếu bạn không thích công việc này, hãy cho chúng tôi biết để chúng tôi giới thiệu những công việc phù hợp hơn.'
                    };
                    sendNotification(dataUser[card.userId], mail, true, true, true)

                }

            }

        }
    } else {
        console.log('sendNotiSubcribleToProfile error', storeData.storeId)
    }
}

function sendMailNotiLikeToStore(card) {
    if (card) {
        var mail = {
            title: 'Ứng viên ' + card.userName + ' vừa ứng tuyển vào thương hiệu của bạn',
            body: 'Ứng viên ' + card.userName + ' vừa mới ứng tuyển vị trí ' + getStringJob(card.jobUser) + ', xem hồ sơ và tuyển ngay!',
            data: {
                name: card.userName,
                avatar: card.userAvatar,
                job: getStringJob(card.jobUser)
            },
            description1: 'Chào cửa hàng ' + card.storeName,
            description2: 'Ứng viên ' + card.userName + ' vừa mới ứng tuyển vị trí ' + getStringJob(card.jobUser) + ', xem hồ sơ và tuyển ngay!',
            description3: '',
            subtitle: '',
            image: '',
            calltoaction: 'Xem hồ sơ',
            linktoaction: '/view/profile/' + card.userId,
            storeId: card.storeId
        };
        sendNotification(dataUser[dataStore[card.storeId].createdBy], mail, true, true, true)

    }

}

function sendMailNotiLikeToProfile(card) {
    var mail = {
        title: 'Thương hiệu ' + card.storeName + ' vừa gửi lời mời phỏng vấn cho bạn',
        body: card.storeName + ' vừa gửi lời mời phỏng vấn cho bạn vào vị trí' + getStringJob(card.jobStore) + ', xem offer và phản hồi ngay!',
        data: {
            name: card.storeName,
            avatar: card.storeAvatar,
            job: getStringJob(card.jobStore)
        },
        description1: 'Chào ' + getLastName(card.userName),
        description2: card.storeName + ' vừa gửi lời mời phỏng vấn cho bạn vào vị trí ' + getStringJob(card.jobStore) + ', xem chi tiết và phản hồi ngay!',
        description3: '',
        subtitle: '',
        image: '',
        calltoaction: 'Xem chi tiết',
        linktoaction: '/view/store/' + card.storeId
    };
    sendNotification(dataUser[card.userId], mail, true, true, true)

}

function sendMailNotiMatchToStore(card) {

    var notification = {
        title: 'Ứng viên ' + card.userName + ' đã đồng ý tương hợp với thương hiệu của bạn',
        body: ' Ứng viên ' + card.userName + ' đồng ý với lời mời phỏng vấn vào vị trí ' + getStringJob(card.jobUser) + ', hãy xem thông tin liên hệ và gọi ứng viên tới phỏng vấn',
        data: {
            avatar: card.userAvatar,
            name: card.userName,
            job: getStringJob(card.jobUser)
        },
        description1: 'Chào thương hiệu ' + card.storeName,
        description2: ' Ứng viên ' + card.userName + ' đồng ý với lời mời phỏng vấn vào vị trí ' + getStringJob(card.jobUser) + ', hãy xem thông tin liên hệ và gọi ứng viên tới phỏng vấn',
        description3: '',
        calltoaction: 'Liên hệ ngay!',
        linktoaction: '/view/profile/' + card.userId,
        image: '',
        storeId: card.storeId
    }
    sendNotification(dataUser[dataStore[card.storeId].createdBy], notification, true, true, true)

}

function sendMailNotiMatchToProfile(card) {

    var notification = {
        title: 'Bạn và thương hiệu ' + card.storeName + ' đã tương hợp với nhau',
        body: ' Chúc mừng, Thương hiệu ' + card.storeName + ' đã tương hợp với bạn, hãy chuẩn bị thật kĩ trước khi tới gặp nhà tuyển dụng nhé',
        description1: 'Chào ' + getLastName(card.userName),
        description2: 'Chúc mừng , Thương hiệu ' + card.storeName + ' đã tương hợp với bạn, hãy chuẩn bị thật kĩ trước khi tới gặp nhà tuyển dụng nhé',
        description3: '',
        calltoaction: 'Liên hệ ngay!',
        linktoaction: '/view/store/' + card.storeId,
        description4: '',
        image: ''
    };
    sendNotification(dataUser[card.userId], notification, true, true, true)
}


function sendEmailTemplate(mail, email) {
    var html;
    if (!mail.subtitle) {
        mail.subtitle = ''
    }
    if (!mail.description4) {
        mail.description4 = ''
    }
    var header = '<div style="width:100%!important;background-color:#fff;margin-top:0;margin-bottom:0;margin-right:0;margin-left:0;padding-top:0;padding-bottom:0;padding-right:0;padding-left:0;font-family:' + font + ';font-weight:300"> <table border="0" cellpadding="0" cellspacing="0" id="m_-5282972956275044657background-table" style="background-color:#fff" width="100%"> <tbody> <tr style="border-collapse:collapse"> <td align="center" style="font-family:' + font + ';font-weight:300;border-collapse:collapse"> <table border="0" cellpadding="0" cellspacing="0" class="m_-5282972956275044657w640" style="margin-top:0;margin-bottom:0;margin-right:10px;margin-left:10px" width="640"> <tbody> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w640" height="20" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="640">&nbsp;</td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w640" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="640"> <table bgcolor="#4E8EF7" border="0" cellpadding="0" cellspacing="0" class="m_-5282972956275044657w640" id="m_-5282972956275044657top-bar" style="background-color:#ffffff;color:#ffffff" width="640"> <tbody> <tr style="border-collapse:collapse"> <td align="left" cellpadding="5" class="m_-5282972956275044657w580" colspan="3" height="8" style="padding-top:10px;padding-bottom:10px;padding-right:10px;padding-left:10px;font-family:' + font + ';font-weight:300;border-collapse:collapse" valign="middle" width="580"> <div class="m_-5282972956275044657header-lead" style="color:#fff;padding-top:0px;padding-bottom:0px;padding-right:0px;padding-left:0px;font-size:0px"> ' + mail.body + ' </div> </td> </tr> </tbody> </table> </td> </tr> '
    var headline = '<tr style="border-collapse:collapse"> <td align="center" bgcolor="#fff" class="m_-5282972956275044657w640" id="m_-5282972956275044657header" style="font-family:' + font + ';font-weight:100;border-collapse:collapse" width="640"> <div align="center" style="text-align:center"> <h1 class="m_-5282972956275044657title" style="line-height:100%!important;font-size:40px;color: #1FBDF1;font-family:' + font + ';font-weight:100;margin-top:10px;margin-bottom:18px"> ' + mail.title + '</h1> <h5 class="m_-5282972956275044657sub-title" style="line-height:100%!important;font-size:18px;color:#757f90;font-family:' + font + ';font-weight:300;margin-top:0px;margin-bottom:48px"> ' + mail.subtitle + ' </h5> </div> </td> </tr>'

    var content = ' <tr id="m_-5282972956275044657simple-content-row" style="border-collapse:collapse"> <td bgcolor="#ffffff" class="m_-5282972956275044657w640" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="640"> <table align="left" border="0" cellpadding="0" cellspacing="0" class="m_-5282972956275044657w640" width="640"> <tbody> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30"> <p>&nbsp;</p> </td> <td class="m_-5282972956275044657w580" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="580"> <table border="0" cellpadding="0" cellspacing="0" class="m_-5282972956275044657w580" width="580"> <tbody> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w580" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="580"> <div align="left" class="m_-5282972956275044657article-content" style="font-size:16px;line-height:30px;color:#5f6a7d;margin-top:0px;margin-bottom:18px;font-family:' + font + ';font-weight:300"> <p style="margin-bottom:15px">' + mail.description1 + '</p> <p style="margin-bottom:15px">' + mail.description2 + '</p> </div> </td> </tr> </tbody> </table> </td> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30">&nbsp;</td> </tr> </tbody> </table> </td> </tr>'
    var image = '<tr style="border-collapse:collapse"> <td bgcolor="#ffffff" align="center" style="font-family:' + font + ';font-weight:300;border-collapse:collapse;width:100%"> <span><a href=""> <img src="' + mail.image + '" width="95%" class="CToWUd"></a></span></td> </tr>'
    var footer = ' <tr id="m_-5282972956275044657simple-content-row" style="border-collapse:collapse"> <td bgcolor="#ffffff" class="m_-5282972956275044657w640" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="640"> <table align="left" border="0" cellpadding="0" cellspacing="0" class="m_-5282972956275044657w640" width="640"> <tbody> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30"> <p>&nbsp;</p> </td> <td class="m_-5282972956275044657w580" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="580"> <table border="0" cellpadding="0" cellspacing="0" class="m_-5282972956275044657w580" width="580"> <tbody> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w580" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="580"> <div align="left" class="m_-5282972956275044657article-content" style="font-size:16px;line-height:30px;color:#5f6a7d;margin-top:0px;margin-bottom:18px;font-family:' + font + ';font-weight:300"> <p style="margin-bottom:15px">' + mail.description3 + '</p> </div> </td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w580" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="580"> <div style="text-align:center"><a href="' + mail.linktoaction + '" style="background: #1FBDF1;background: -webkit-linear-gradient(to left, #1FBDF1, #39DFA5); background: linear-gradient(to left, #1FBDF1, #39DFA5);color:#ffffff;display:inline-block;font-family:sans-serif;font-size:16px;font-weight:bold;line-height:60px;text-align:center;text-decoration:none;width:300px" target="_blank"> ' + mail.calltoaction + '</a></div> </td> </tr> </tbody> </table> <table border="0" cellpadding="0" cellspacing="0" class="m_-5282972956275044657w580" width="580"> <tbody> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w580" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="580"> <p align="left" class="m_-5282972956275044657article-title" style="font-size:18px;line-height:24px;color:#2b3038;font-weight:bold;margin-top:0px;margin-bottom:18px;font-family:' + font + '"> &nbsp;</p> <div align="left" class="m_-5282972956275044657article-content" style="font-size:16px;line-height:30px;color:#5f6a7d;margin-top:0px;margin-bottom:18px;font-family:' + font + ';font-weight:300"><p style="margin-bottom:15px">' + mail.description4 + '</p> <p style="margin-bottom:15px">Rất vui được giúp bạn!</p> <p style="margin-bottom:15px">Khánh Thông, CEO & Founder - Jobo</p> </div> </td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w580" height="10" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="580">&nbsp;</td> </tr> </tbody> </table> </td> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30">&nbsp;</td> </tr> </tbody> </table> </td> </tr> <tr style="border-collapse:collapse"> <td bgcolor="#ffffff" class="m_-5282972956275044657w640" height="15" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="640">&nbsp;</td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w640" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="640"> <table bgcolor="#ffffff" border="0" cellpadding="0" cellspacing="0" class="m_-5282972956275044657w640" id="m_-5282972956275044657footer" style="border-top-width:1px;border-top-style:solid;border-top-color:#f1f1f1;background-color:#ffffff;color:#d4d4d4" width="640"> <tbody> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30">&nbsp;</td> <td class="m_-5282972956275044657w580 m_-5282972956275044657h0" height="30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="360">&nbsp;</td> <td class="m_-5282972956275044657w0" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="60">&nbsp;</td> <td class="m_-5282972956275044657w0" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="160">&nbsp;</td> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30">&nbsp;</td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30">&nbsp;</td> <td class="m_-5282972956275044657w580" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" valign="top" width="360"> <p align="left" class="m_-5282972956275044657footer-content-left" id="m_-5282972956275044657permission-reminder" style="font-size:12px;line-height:15px;color:#d4d4d4;margin-top:0px;margin-bottom:15px;white-space:normal"> <span>Sent with ♥ from Jobo</span> </p> <p align="left" class="m_-5282972956275044657footer-content-left" style="font-size:12px;line-height:15px;color:#d4d4d4;margin-top:0px;margin-bottom:15px"> <a href="https://joboapp.com/#ref=fm" style="color:#c4c4c4;text-decoration:none;font-weight:bold" target="_blank">We are hiring</a></p> </td> <td class="m_-5282972956275044657hide m_-5282972956275044657w0" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="60">&nbsp;</td> <td class="m_-5282972956275044657hide m_-5282972956275044657w0" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" valign="top" width="160"> <p align="right" class="m_-5282972956275044657footer-content-right" id="m_-5282972956275044657street-address" style="font-size:11px;line-height:16px;margin-top:0px;margin-bottom:15px;color:#d4d4d4;white-space:normal"> <span>Jobo</span><br style="line-height:100%"> <span>+84 968 269 860</span><br style="line-height:100%"> <span>25T2 Hoàng Đạo Thúy,HN<br>162 Pasteur,Q1,HCM</span></p> </td> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30">&nbsp;</td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30">&nbsp;</td> <td class="m_-5282972956275044657w580 m_-5282972956275044657h0" height="15" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="360">&nbsp;</td> <td class="m_-5282972956275044657w0" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="60">&nbsp;</td> <td class="m_-5282972956275044657w0" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="160">&nbsp;</td> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30">&nbsp;</td> </tr> </tbody> </table> </td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w640" height="60" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="640">&nbsp;</td> </tr> </tbody> </table> </td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w640" height="60" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="640">&nbsp;</td> </tr> </tbody> </table></div>'

    if (mail.image) {
        html = header + content + image + footer
    } else {
        html = header + content + footer
    }
    sendEmail(email, mail.title, html)
}

function sendEmailTemplate_User(mail, email) {
    var html = '<!doctype html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><title></title> <!--[if !mso]><!-- --> <meta http-equiv="X-UA-Compatible" content="IE=edge"> <!--<![endif]--> <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"> <style type="text/css"> #outlook a { padding: 0; } .ReadMsgBody { width: 100%; } .ExternalClass { width: 100%; } .ExternalClass * { line-height: 100%; } body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; } table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; } img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; } p { display: block; margin: 13px 0; } </style> <!--[if !mso]><!--> <style type="text/css"> @media only screen and (max-width: 480px) { @-ms-viewport { width: 320px; } @viewport { width: 320px; } } </style> <!--<![endif]--> <!--[if mso]> <xml> <o:OfficeDocumentSettings> <o:AllowPNG/> <o:PixelsPerInch>96</o:PixelsPerInch> </o:OfficeDocumentSettings> </xml> <![endif]--> <!--[if lte mso 11]> <style type="text/css"> .outlook-group-fix { width: 100% !important; } </style> <![endif]--> <style type="text/css"> @media only screen and (min-width: 480px) { .mj-column-per-100 { width: 100% !important; } .mj-column-per-50 { width: 50% !important; } .mj-column-per-80 { width: 80% !important; } .mj-column-per-20 { width: 20% !important; } } </style></head><body><div> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;"> <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;max-width:600px;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-100 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="left"> <div class="" style="cursor:auto;color:#000000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;"> <p>' + mail.description1 + '</p> <p>' + mail.description2 + '</p> </div> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;"> <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;max-width:600px;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-50 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="center"> <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0px;" align="center" border="0"> <tbody> <tr> <td style="width:400px;"><img alt="" title="" height="auto" src="' + mail.data.avatar + '" style="border:none;border-radius:;display:block;outline:none;text-decoration:none;width:100%;height:auto;" width="400"></td> </tr> </tbody> </table> </td> </tr> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="justify"> <div class="" style="cursor:auto;color:#000;font-family:' + font + ';font-size:28px;font-weight:bold;line-height:22px;text-align:justify;"> ' + mail.data.name + ' </div> </td> </tr> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="justify"> <div class="" style="cursor:auto;color:#000;font-family:' + font + ';font-size:15px;line-height:22px;text-align:justify;"> ' + mail.data.job + ' </div> </td> </tr> <tr style="border-collapse:collapse;"> <td class="m_-5282972956275044657w580" style="padding:10px 25px;font-family:' + font + ';font-weight:300;border-collapse:collapse" width="580"> <div><a href="' + CONFIG.WEBURL + mail.linktoaction + '" style="padding:5px; background: #1FBDF1;background: -webkit-linear-gradient(to left, #1FBDF1, #39DFA5); background: linear-gradient(to left, #1FBDF1, #39DFA5);color:#ffffff;display:inline-block;font-family:sans-serif;font-size:16px;text-align:center;line-height:40px;text-decoration:none;width:120px; border-radius: 60px;" target="_blank"> ' + mail.calltoaction + '</a></div> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;"> <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;max-width:600px;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-100 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="left"> <div class="" style="cursor:auto;color:#000000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;"> <p>' + mail.description3 + '</p><p>Rất vui được giúp bạn!</p> <p style="margin-bottom:15px">Khánh Thông, CEO & Founder - Jobo</p> </div> </td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w580" height="10" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="580">&nbsp;</td> </tr> </tbody> </table> </td> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30">&nbsp;</td> </tr> </tbody> </table> </td> </tr> <tr style="border-collapse:collapse"> <td bgcolor="#ffffff" class="m_-5282972956275044657w640" height="15" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="640">&nbsp;</td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w640" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="640"> <table bgcolor="#ffffff" border="0" cellpadding="0" cellspacing="0" class="m_-5282972956275044657w640" id="m_-5282972956275044657footer" style="border-top-width:1px;border-top-style:solid;border-top-color:#f1f1f1;background-color:#ffffff;color:#d4d4d4" width="640"> <tbody> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30">&nbsp;</td> <td class="m_-5282972956275044657w580 m_-5282972956275044657h0" height="30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="360">&nbsp;</td> <td class="m_-5282972956275044657w0" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="60">&nbsp;</td> <td class="m_-5282972956275044657w0" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="160">&nbsp;</td> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30">&nbsp;</td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30">&nbsp;</td> <td class="m_-5282972956275044657w580" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" valign="top" width="360"> <p align="left" class="m_-5282972956275044657footer-content-left" id="m_-5282972956275044657permission-reminder" style="font-size:12px;line-height:15px;color:#d4d4d4;margin-top:0px;margin-bottom:15px;white-space:normal"> <span>Sent with ♥ from Jobo</span> </p> <p align="left" class="m_-5282972956275044657footer-content-left" style="font-size:12px;line-height:15px;color:#d4d4d4;margin-top:0px;margin-bottom:15px"> <a href="https://joboapp.com/#ref=fm" style="color:#c4c4c4;text-decoration:none;font-weight:bold" target="_blank">Xem thêm</a></p> </td> <td class="m_-5282972956275044657hide m_-5282972956275044657w0" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="60">&nbsp;</td> <td class="m_-5282972956275044657hide m_-5282972956275044657w0" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" valign="top" width="160"> <p align="right" class="m_-5282972956275044657footer-content-right" id="m_-5282972956275044657street-address" style="font-size:11px;line-height:16px;margin-top:0px;margin-bottom:15px;color:#d4d4d4;white-space:normal"> <span>Jobo</span><br style="line-height:100%"> <span>+84 968 269 860</span><br style="line-height:100%"> <span>25T2 Hoàng Đạo Thúy,HN - 162 Pasteur,Q1</span></p> </td> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30">&nbsp;</td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30">&nbsp;</td> <td class="m_-5282972956275044657w580 m_-5282972956275044657h0" height="15" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="360">&nbsp;</td> <td class="m_-5282972956275044657w0" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="60">&nbsp;</td> <td class="m_-5282972956275044657w0" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="160">&nbsp;</td> <td class="m_-5282972956275044657w30" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="30">&nbsp;</td> </tr> </tbody> </table> </td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w640" height="60" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="640">&nbsp;</td> </tr> </tbody> </table> </td> </tr> <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w640" height="60" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="640">&nbsp;</td> </tr> </tbody> </table></div>'

    sendEmail(email, mail.title, html, mail.key)
}

function sendemailMarketing(mail, email, userId) {
    var card = {}

    var header = '<!doctype html>\n' +
        '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">\n' +
        '\n' +
        '<head>\n' +
        '    <title></title>\n' +
        '    <!--[if !mso]><!-- -->\n' +
        '    <meta http-equiv="X-UA-Compatible" content="IE=edge">\n' +
        '    <!--<![endif]-->\n' +
        '    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">\n' +
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
        '    <style type="text/css">\n' +
        '        #outlook a {\n' +
        '            padding: 0;\n' +
        '        }\n' +
        '\n' +
        '        .ReadMsgBody {\n' +
        '            width: 100%;\n' +
        '        }\n' +
        '\n' +
        '        .ExternalClass {\n' +
        '            width: 100%;\n' +
        '        }\n' +
        '\n' +
        '        .ExternalClass * {\n' +
        '            line-height: 100%;\n' +
        '        }\n' +
        '\n' +
        '        body {\n' +
        '            margin: 0;\n' +
        '            padding: 0;\n' +
        '            -webkit-text-size-adjust: 100%;\n' +
        '            -ms-text-size-adjust: 100%;\n' +
        '        }\n' +
        '\n' +
        '        table,\n' +
        '        td {\n' +
        '            border-collapse: collapse;\n' +
        '            mso-table-lspace: 0pt;\n' +
        '            mso-table-rspace: 0pt;\n' +
        '        }\n' +
        '\n' +
        '        img {\n' +
        '            border: 0;\n' +
        '            height: auto;\n' +
        '            line-height: 100%;\n' +
        '            outline: none;\n' +
        '            text-decoration: none;\n' +
        '            -ms-interpolation-mode: bicubic;\n' +
        '        }\n' +
        '\n' +
        '        p {\n' +
        '            display: block;\n' +
        '            margin: 13px 0;\n' +
        '        }\n' +
        '    </style>\n' +
        '    <!--[if !mso]><!-->\n' +
        '    <style type="text/css">\n' +
        '        @media only screen and (max-width:480px) {\n' +
        '            @-ms-viewport {\n' +
        '                width: 320px;\n' +
        '            }\n' +
        '            @viewport {\n' +
        '                width: 320px;\n' +
        '            }\n' +
        '        }\n' +
        '    </style>\n' +
        '    <!--<![endif]-->\n' +
        '    <!--[if mso]>\n' +
        '    <xml>\n' +
        '        <o:OfficeDocumentSettings>\n' +
        '            <o:AllowPNG/>\n' +
        '            <o:PixelsPerInch>96</o:PixelsPerInch>\n' +
        '        </o:OfficeDocumentSettings>\n' +
        '    </xml>\n' +
        '    <![endif]-->\n' +
        '    <!--[if lte mso 11]>\n' +
        '    <style type="text/css">\n' +
        '        .outlook-group-fix {\n' +
        '            width:100% !important;\n' +
        '        }\n' +
        '    </style>\n' +
        '    <![endif]-->\n' +
        '\n' +
        '    <!--[if !mso]><!-->\n' +
        '    <link href="https://fonts.googleapis.com/css?family=Ubuntu:300,400,500,700" rel="stylesheet" type="text/css">\n' +
        '    <style type="text/css">\n' +
        '        @import url(https://fonts.googleapis.com/css?family=Ubuntu:300,400,500,700);\n' +
        '    </style>\n' +
        '    <!--<![endif]-->\n' +
        '    <style type="text/css">\n' +
        '        @media only screen and (min-width:480px) {\n' +
        '            .mj-column-per-50 {\n' +
        '                width: 50%!important;\n' +
        '            }\n' +
        '        }\n' +
        '    </style>\n' +
        '</head>\n' +
        '\n' +
        '<body>\n' +
        '\n' +
        '<div class="mj-container">';
    var footer = '</div>\n' +
        '</body>\n' +
        '\n' +
        '</html>';

    var image = ' <!--[if mso | IE]>\n' +
        '    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;">\n' +
        '        <tr>\n' +
        '            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">\n' +
        '    <![endif]-->\n' +
        '    <div style="margin:0px auto;max-width:600px;">\n' +
        '        <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0">\n' +
        '            <tbody>\n' +
        '            <tr>\n' +
        '                <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;">\n' +
        '                    <!--[if mso | IE]>\n' +
        '                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">\n' +
        '                        <tr>\n' +
        '                            <td style="vertical-align:undefined;width:600px;">\n' +
        '                    <![endif]-->\n' +
        '                    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0px;" align="center" border="0">\n' +
        '                        <tbody>\n' +
        '                        <tr>\n' +
        '                            <td style="width:550px;"><img alt="" title="" height="auto" src="' + mail.image + '" style="border:none;border-radius:0px;display:block;font-size:13px;outline:none;text-decoration:none;width:100%;height:auto;" width="550"></td>\n' +
        '                        </tr>\n' +
        '                        </tbody>\n' +
        '                    </table>\n' +
        '                    <!--[if mso | IE]>\n' +
        '                    </td></tr></table>\n' +
        '                    <![endif]-->\n' +
        '                </td>\n' +
        '            </tr>\n' +
        '            </tbody>\n' +
        '        </table>\n' +
        '    </div>\n' +
        '    <!--[if mso | IE]>\n' +
        '    </td></tr></table>\n' +
        '    <![endif]-->';

    var text = '\n' +
        '    <!--[if mso | IE]>\n' +
        '    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;">\n' +
        '        <tr>\n' +
        '            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">\n' +
        '    <![endif]-->\n' +
        '    <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;">' + mail.description + '</div>\n' +
        '    <!--[if mso | IE]>\n' +
        '    </td></tr></table>\n' +
        '    <![endif]-->';

    var button = '  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;">\n' +
        '        <tr>\n' +
        '            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">\n' +
        '    <![endif]-->\n' +
        '    <div style="margin:0px auto;max-width:600px;">\n' +
        '        <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0">\n' +
        '            <tbody>\n' +
        '            <tr>\n' +
        '                <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;">\n' +
        '                    <!--[if mso | IE]>\n' +
        '                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">\n' +
        '                        <tr>\n' +
        '                            <td style="vertical-align:undefined;width:600px;">\n' +
        '                    <![endif]-->\n' +
        '                    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;" align="justify" border="0">\n' +
        '                        <tbody>\n' +
        '                        <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w580" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="580"> <div style="text-align:center"><a href="' + mail.linktoaction + '" style="background: #1FBDF1;background: -webkit-linear-gradient(to left, #1FBDF1, #39DFA5); background: linear-gradient(to left, #1FBDF1, #39DFA5);color:#ffffff;display:inline-block;font-family:sans-serif;font-size:16px;font-weight:bold;line-height:60px;text-align:center;text-decoration:none;width:300px" target="_blank"> ' + mail.calltoaction + '</a></div> </td> </tr>\n' +
        '                        </tbody>\n' +
        '                    </table>\n' +
        '                    <!--[if mso | IE]>\n' +
        '                    </td></tr></table>\n' +
        '                    <![endif]-->\n' +
        '                </td>\n' +
        '            </tr>\n' +
        '            </tbody>\n' +
        '        </table>\n' +
        '    </div>\n' +
        '    <!--[if mso | IE]>\n' +
        '    </td></tr></table>\n' +
        '    <![endif]-->';

    var card_header = '  <!--[if mso | IE]>\n' +
        '    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;">\n' +
        '        <tr>\n' +
        '            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">\n' +
        '    <![endif]-->\n' +
        '    <div style="margin:0px auto;max-width:600px;">\n' +
        '        <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0">\n' +
        '            <tbody>\n' +
        '            <tr>\n' +
        '                <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;">\n' +
        '                    <!--[if mso | IE]>\n' +
        '                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">\n' +
        '                        <tr>';

    var card_footer = '  </tr>\n' +
        '\n' +
        '                    </table>\n' +
        '                    <![endif]-->\n' +
        '                </td>\n' +
        '            </tr>\n' +
        '            </tbody>\n' +
        '        </table>\n' +
        '    </div>\n' +
        '    <!--[if mso | IE]>\n' +
        '    </td></tr></table>\n' +
        '    <![endif]-->'

    var card_body = '<td style="vertical-align:top;width:300px;">\n' +
        '                    <![endif]-->\n' +
        '                    <div class="mj-column-per-50 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;">\n' +
        '                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">\n' +
        '                            <tbody>\n' +
        '                            <tr>\n' +
        '                                <td style="word-wrap:break-word;font-size:0px;padding:10px 25px;" align="center">\n' +
        '                                    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0px;" align="center" border="0">\n' +
        '                                        <tbody>\n' +
        '                                        <tr>\n' +
        '                                            <td style="width:165px;"><img alt="" title="" height="auto" src="' + card.image + '" style="border:none;border-radius:0px;display:block;font-size:13px;outline:none;text-decoration:none;width:100%;height:auto;" width="165"></td>\n' +
        '                                        </tr>\n' +
        '                                        </tbody>\n' +
        '                                    </table>\n' +
        '                                </td>\n' +
        '                            </tr>\n' +
        '                            <tr>\n' +
        '                                <td style="word-wrap:break-word;font-size:0px;padding:10px 25px;" align="center">\n' +
        '                                    <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:16px;font-weight:bold;line-height:22px;text-align:center;">' + card.title + '</div>\n' +
        '                                </td>\n' +
        '                            </tr>\n' +
        '                            <tr>\n' +
        '                                <td style="word-wrap:break-word;font-size:0px;padding:10px 25px;" align="center">\n' +
        '                                    <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:center;">' + card.body + '</div>\n' +
        '                                </td>\n' +
        '                            </tr>\n' +
        '                            <tr>\n' +
        '                                <td style="word-wrap:break-word;font-size:0px;padding:10px 25px;" align="center">\n' +
        '                                    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;" align="center" border="0">\n' +
        '                                        <tbody>\n' +
        '                                        <tr>\n' +
        '                                            <td style="border:none;border-radius:40px;color:#ffffff;cursor:auto;padding:10px 25px;" align="center" valign="middle" bgcolor="#1FBDF1">\n' +
        '<a href="' + card.linktoaction + '"><p style="text-decoration:none;background:#1FBDF1;color:#ffffff;font-family:' + font + ';font-size:12px;font-weight:normal;line-height:120%;text-transform:none;margin:0px;">' + card.calltoaction + '</p> </a>\n' +
        '                                            </td>\n' +
        '                                        </tr>\n' +
        '                                        </tbody>\n' +
        '                                    </table>\n' +
        '                                </td>\n' +
        '                            </tr>\n' +
        '                            </tbody>\n' +
        '                        </table>\n' +
        '                    </div>\n' +
        '                    <!--[if mso | IE]>\n' +
        '                    </td>';
    var outtro = '<!--[if mso | IE]>\n' +
        '    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;">\n' +
        '        <tr>\n' +
        '            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">\n' +
        '    <![endif]-->\n' +
        '    <div style="margin:0px auto;max-width:600px;">\n' +
        '        <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0">\n' +
        '            <tbody>\n' +
        '            <tr>\n' +
        '                <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;">\n' +
        '                    <!--[if mso | IE]>\n' +
        '                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">\n' +
        '                        <tr>\n' +
        '                            <td style="vertical-align:undefined;width:600px;">\n' +
        '                    <![endif]-->\n' +
        '                    <p style="font-size:1px;margin:0px auto;border-top:1px solid #d4d4d4;width:100%;"></p>\n' +
        '                    <!--[if mso | IE]><table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" style="font-size:1px;margin:0px auto;border-top:1px solid #d4d4d4;width:100%;" width="600"><tr><td style="height:0;line-height:0;"> </td></tr></table><![endif]-->\n' +
        '                    <!--[if mso | IE]>\n' +
        '                    </td><td style="vertical-align:undefined;width:50px;">\n' +
        '                    <![endif]-->\n' +
        '                    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0px;" align="left" border="0">\n' +
        '                        <tbody>\n' +
        '                        <tr>\n' +
        '                            <td style="width:50px;"><img alt="" title="" height="auto" src="https://jobo.asia/img/logo.png" style="border:none;border-radius:0px;display:block;font-size:13px;outline:none;text-decoration:none;width:100%;height:auto;" width="50"></td>\n' +
        '                        </tr>\n' +
        '                        </tbody>\n' +
        '                    </table>\n' +
        '                    <!--[if mso | IE]>\n' +
        '                    </td><td style="vertical-align:undefined;width:200px;">\n' +
        '                    <![endif]-->\n' +
        '                    <div style="cursor:auto;color:#000000;font-family:Ubuntu, Helvetica, Arial, sans-serif;font-size:11px;line-height:22px;text-align:right;"><a href="https://goo.gl/awK5qg" style="color: #000000; text-decoration: none;">We are hiring</a></div>\n' +
        '                    <!--[if mso | IE]>\n' +
        '                    </td></tr></table>\n' +
        '                    <![endif]-->\n' +
        '                </td>\n' +
        '            </tr>\n' +
        '            </tbody>\n' +
        '        </table>\n' +
        '    </div>\n' +
        '    <!--[if mso | IE]>\n' +
        '    </td></tr></table>\n' +
        '    <![endif]-->'


    var htmlMail = ''

    if (mail.description1) {
        mail.description = mail.description1
        htmlMail = htmlMail + header + '\n' +
            '    <!--[if mso | IE]>\n' +
            '    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;">\n' +
            '        <tr>\n' +
            '            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">\n' +
            '    <![endif]-->\n' +
            '    <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;">' + mail.description + '</div>\n' +
            '    <!--[if mso | IE]>\n' +
            '    </td></tr></table>\n' +
            '    <![endif]-->';
    }
    if (mail.image) {
        htmlMail = htmlMail + image
    }
    if (mail.description2) {
        mail.description = mail.description2
        htmlMail = htmlMail + '\n' +
            '    <!--[if mso | IE]>\n' +
            '    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;">\n' +
            '        <tr>\n' +
            '            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">\n' +
            '    <![endif]-->\n' +
            '    <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;">' + mail.description + '</div>\n' +
            '    <!--[if mso | IE]>\n' +
            '    </td></tr></table>\n' +
            '    <![endif]-->';
    }
    if (mail.linktoaction) {
        htmlMail = htmlMail + button

    }
    if (mail.description3) {
        mail.description = mail.description3
        htmlMail = htmlMail + '\n' +
            '    <!--[if mso | IE]>\n' +
            '    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;">\n' +
            '        <tr>\n' +
            '            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">\n' +
            '    <![endif]-->\n' +
            '    <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;">' + mail.description + '</div>\n' +
            '    <!--[if mso | IE]>\n' +
            '    </td></tr></table>\n' +
            '    <![endif]-->';
    }
    if (mail.data) {
        htmlMail = htmlMail + card_header
        for (var i in mail.data) {

            var card = mail.data[i]
            console.log(card)
            htmlMail = htmlMail + '<td style="vertical-align:top;width:300px;">\n' +
                '                    <![endif]-->\n' +
                '                    <div class="mj-column-per-50 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;">\n' +
                '                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">\n' +
                '                            <tbody>\n' +
                '                            <tr>\n' +
                '                                <td style="word-wrap:break-word;font-size:0px;padding:10px 25px;" align="center">\n' +
                '                                    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0px;" align="center" border="0">\n' +
                '                                        <tbody>\n' +
                '                                        <tr>\n' +
                '                                            <td style="width:165px;"><img alt="" title="" height="auto" src="' + card.image + '" style="border:none;border-radius:0px;display:block;font-size:13px;outline:none;text-decoration:none;width:100%;height:auto;" width="165"></td>\n' +
                '                                        </tr>\n' +
                '                                        </tbody>\n' +
                '                                    </table>\n' +
                '                                </td>\n' +
                '                            </tr>\n' +
                '                            <tr>\n' +
                '                                <td style="word-wrap:break-word;font-size:0px;padding:10px 25px;" align="center">\n' +
                '                                    <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:16px;font-weight:bold;line-height:22px;text-align:center;">' + card.title + '</div>\n' +
                '                                </td>\n' +
                '                            </tr>\n' +
                '                            <tr>\n' +
                '                                <td style="word-wrap:break-word;font-size:0px;padding:10px 25px;" align="center">\n' +
                '                                    <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:center;">' + card.body + '</div>\n' +
                '                                </td>\n' +
                '                            </tr>\n' +
                '                            <tr>\n' +
                '                                <td style="word-wrap:break-word;font-size:0px;padding:10px 25px;" align="center">\n' +
                '                                    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;" align="center" border="0">\n' +
                '                                        <tbody>\n' +
                '                                        <tr>\n' +
                '                                            <td style="border:none;border-radius:40px;color:#ffffff;cursor:auto;padding:10px 25px;" align="center" valign="middle" bgcolor="#1FBDF1">\n' +
                '<a href="' + card.linktoaction + '"><p style="text-decoration:none;background:#1FBDF1;color:#ffffff;font-family:' + font + ';font-size:12px;font-weight:normal;line-height:120%;text-transform:none;margin:0px;">' + card.calltoaction + '</p> </a>\n' +
                '                                            </td>\n' +
                '                                        </tr>\n' +
                '                                        </tbody>\n' +
                '                                    </table>\n' +
                '                                </td>\n' +
                '                            </tr>\n' +
                '                            </tbody>\n' +
                '                        </table>\n' +
                '                    </div>\n' +
                '                    <!--[if mso | IE]>\n' +
                '                    </td>';
        }
        htmlMail = htmlMail + card_footer
    }

    if (mail.description4) {
        mail.description = mail.description4
        htmlMail = htmlMail + '\n' +
            '    <!--[if mso | IE]>\n' +
            '    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;">\n' +
            '        <tr>\n' +
            '            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">\n' +
            '    <![endif]-->\n' +
            '    <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;">' + mail.description + '</div>\n' +
            '    <!--[if mso | IE]>\n' +
            '    </td></tr></table>\n' +
            '    <![endif]-->';
    }
    if (mail.outtro) {
        htmlMail = htmlMail + outtro
    }

    htmlMail = htmlMail + footer


    if (mail.from && dataUser[mail.from] && dataUser[mail.from].email) {
        var mailAddress = {
            email: dataUser[mail.from].email,
            name: dataUser[mail.from].name + '| Jobo'
        }
    } else {
        var mailAddress = {
            email: 'contact@jobo.asia',
            name: 'Jobo - Việc làm lương tốt'
        }
    }

    var bodyHtml = htmlMail
    var subject = mail.title
    var mailOptions = {
        from: {
            name: mailAddress.name,
            address: mailAddress.email
        },
        to: email,
        subject: subject,
        html: bodyHtml
    };
    return mailTransport.sendMail(mailOptions).then(function () {
        console.log('New email sent to: ' + email);
        if (userId) {
            emailRef.child(userId + '/' + subject).update({sent: true}, function (a) {
                console.log('save', a)
            });
        }

    }, function (error) {
        console.log('Some thing wrong when sent email to ' + email + ':' + error);
    });
}

app.get('/registerheadhunter', function (req, res) {
    var id = req.param('id')
    emailRef.child(id).once('value', function (data) {
        var user = data.val()
        if(user){
            emailRef.child(id).update({headhunter: new Date().getTime()}).then(function () {
                res.send('Bạn đã đăng ký thành công, hãy sử dụng mã giới thiệu: ' + user.email + ' và chia sẻ link ứng tuyển cho bạn bè nhé')

            })
        } else {
            res.send('Xảy ra lỗi')
        }

    })


})


app.get('/sendemailMarketing', function (req, res) {
    // var mailStr = req.param('mail')
    // var mail = JSON.parse(mailStr)
    var mail = {to: 'all'}
    if (mail.to == 'all') {
        emailRef.once('value', function (snap) {
            // var dataEmail = snap.val()
            // var arrayEmail = []
            // for (var i in dataEmail) {
            //     arrayEmail.push(dataEmail[i])
            // }
            var arrayEmail = [{
                email: 'thonglk.mac@gmail.com',
                name: 'Lê Khánh Thông',
                id: 'sdfsdfsdf'
            }, {
                email: 'thonglk@joboapp.com',
                name: 'Lê Khánh Hưng',
                id: '3243423'
            }]
            return new Promise(function (resolve, reject) {
                resolve(arrayEmail)
            }).then(function (arrayEmail) {

                var k = 0;                     //  set your counter to 1
                function myLoop() {
                    //  create a loop function
                    setTimeout(function () {    //  call a 3s setTimeout when the loop is called
                        var sendData = arrayEmail[k]
                        var user = sendData
                        var mail = {
                            title: 'Giới thiệu việc làm cho bạn bè, Nhận ngay 1,000,000đ cho 1 người giới thiệu',
                            image: 'https://firebasestorage.googleapis.com/v0/b/jobfast-359da.appspot.com/o/image%2Fthonglk?alt=media&token=165b3f68-72a5-44df-a7fe-42a75f4af31e',
                            description2: 'Chào ' + getLastName(user.name) + ', chương trình <b>Become a freelance headhunter at Jobo </b> là cơ hội giúp các bạn phát triển khả năng bản thân, có thêm thu nhập vô cùng hấp dẫn và giới thiệu kênh tìm việc hiệu quả cho bạn bè.<br> <br>\n' +
                            '\n' +
                            '➡ TẠI SAO BẠN NÊN THAM GIA <br>\n' +
                            '🎖️ Hoa hồng vô cùng hấp dẫn (lên đến 1,000,000đ khi người giới thiệu ứng tuyển thành công)  <br>\n' +
                            '🎖️ Không phải đến văn phòng làm việc, chỉ cần làm việc online vẫn có thêm thu nhập  <br>\n' +
                            '🎖️ Hệ thống quản lý thông tin minh bạch và rõ ràng. Bạn có thể tự kiểm tra kết quả công việc của mình. <br>\n' +
                            '🎖️ Hỗ trợ chuyên nghiệp và nhanh chóng. Bất cứ khi nào có khó khăn bạn có thể liên hệ ngay với Jobo để nhận được sự hỗ trợ.  <br> <br>\n' +
                            '🌐 DANH SÁCH VIỆC LÀM:  <br>\n' +
                            '<b>Marketing & Sale</b><br>\n' +
                            '1. Nhân viên kinh doanh | AIA Vietnam | HCM (8 người)<br>\n' +
                            '🏆 Phần thưởng: 1,000,000đ/người  <br>\n' +
                            '🔗 Link: https://jobo.asia/view/store/s9111250738949#ref=' + user.email + ' <br>\n' +
                            '2. Nhân viên kinh doanh | Jobo Vietnam | HN,HCM (4 người) <br>\n' +
                            '🏆: 1,000,000đ/người <br>\n' +
                            '🔗 : https://jobo.asia/view/store/-KlCK75iK0bf7zFdpHB1#ref=' + user.email + '<br>\n' +
                            '3. Nhân viên bán hàng | CORÈLE V | HCM (4 người) <br>\n' +
                            '🏆: 150,000đ/người <br>\n' +
                            '🔗: https://jobo.asia/view/store/s95995521315678#ref=' + user.email + '<br>\n' +
                            '<b>Food Service</b><br>\n' +
                            '1. Phục vụ | Góc Hà Thành | Hà Nội (12 người) <br>\n' +
                            '🏆: 150,000đ/người <br>\n' +
                            '🔗: https://jobo.asia/view/store/-Kop_Dcf9r_gj94B_D3z?job=server#ref=' + user.email + ' <br>\n' +
                            '2. Phục vụ | Ụt Ụt BBQ | SG (30 người) <br>\n' +
                            '🏆: 150,000đ/người <br>\n' +
                            '🔗: https://jobo.asia/view/store/-Ko888eO-cKhfXzJzSQh?job=server#ref=' + user.email + '<br>' +
                            '(trên đây là những công việc ưu tiên tuyển gấp trong tuần, còn hơn 150 công việc khác sẽ được giới thiệu trong tuần sau.)<br>\n' +
                            '\n' +
                            '➡ CÁCH THỨC HOẠT ĐỘNG:<br>\n' +
                            '◆ Mã giới thiệu của bạn chính là ' + user.email + ' , đã được gắn ở link phía trên <br>\n' +
                            '◆ Chia sẻ cho bạn bè của mình (bạn bè quen biết, các câu lạc bộ, tổ chức sinh viên tại trường đang theo học/ các trường lân cận,...) để họ ứng tuyển qua đường link đã gắn mã giới thiệu của bạn <br>\n' +
                            '◆ Bạn sẽ được nhận thông báo mỗi khi bạn bè ứng tuyển, được mời đi phỏng vấn và được chọn (thông báo về email này). <br><br>\n' +
                            '➡ HOA HỒNG VÀ THANH TOÁN:<br>\n' +
                            '◆ Khi bạn giới thiệu bạn bè tìm việc thành công, bạn được phép yêu cầu thanh toán, sẽ được gửi tới tài khoản ngân hàng mà bạn cung cấp.<br><br>\n',
                            description3: '➡ <b>TOP WEEKLY FREELANCE HEADHUNTER:</b><br>\n' +
                            '1️⃣ huyenmy07 💸 2,580,000 đ<br>\n' +
                            '2️⃣ thaohuynh 💸 1,450,000 đ<br>\n' +
                            '3️⃣ chauchau 💸 800,000 đ<br>\n' +
                            '4️⃣ linhdieu 💸 740,000 đ<br>\n' +
                            '5️⃣ my.nt 💸 670,000 đ<br><br>_____________________<br>\n' +
                            '❖ Jobo Technologies, Inc.<br>\n' +
                            '◆ Email: contact@jobo.asia<br>\n' +
                            '◆ Hotline: 0968 269 860<br>\n' +
                            '◆ Địa chỉ HN: 25T2 Hoàng Đạo Thúy, HN<br>\n' +
                            '◆ Địa chỉ SG: số 162 Pasteur, Q1, HCM',
                            linktoaction: 'https://jobohihi.herokuapp.com/registerheadhunter?key=' + user.id,
                            calltoaction: 'ĐĂNG KÝ LÀM HEADHUNTER!'
                        }
                        if (sendData) {
                            if (!sendData[mail.title]) {

                                sendemailMarketing(mail, user.email)

                                k++;
                                console.log(k)
                                if (k < arrayEmail.length) {
                                    myLoop();
                                }
                            } else {
                                k++;
                                myLoop();

                            }
                        } else {
                            console.log('out of email')
                        }

                    }, 100)
                }

                myLoop();
                res.send('sent' + arrayEmail.length)
            })
        })

    } else {
        sendemailMarketing(mail, mail.to)
        res.send('mail sent to ' + mail.to)
    }
})

function sendNotification(userData, mail, letter, web, mobile, messenger, time) {
    if (userData) {
        if (!time) {
            time = new Date().getTime() + 5 * 1000
        }

        if (mail.data && mail.data.avatar) {
            mail.avatar = mail.data.avatar
        }
        mail.createdAt = new Date().getTime()
        mail.to = userData.userId
        mail.time = time
        mail.key = notificationRef.push().key;
        notificationRef.child(mail.key).update(mail)


        if (userData.email && userData.wrongEmail != true && letter) {
            if (mail.data) {
                schedule.scheduleJob(time, function () {
                    sendEmailTemplate_User(mail, userData.email)
                });
            } else {
                schedule.scheduleJob(time, function () {
                    sendEmailTemplate(mail, userData.email)
                });
            }
        }

        if (userData.webToken && web) {
            schedule.scheduleJob(time, function () {
                sendNotificationToGivenUser(userData.webToken, mail.body, mail.title, mail.linktoaction, 'web', mail.key)
            });
        }

        if (userData.mobileToken && mobile) {
            schedule.scheduleJob(time, function () {
                sendNotificationToGivenUser(userData.mobileToken, mail.body, mail.title, mail.linktoaction, 'app', mail.key)

            });
        }
        if (userData.messengerId && messenger) {
            schedule.scheduleJob(time, function () {
                sendMessenger(userData.messengerId, mail.body, mail.calltoaction, mail.linktoaction, mail.key)

            });
        }


    }
}

// Analytics

function StaticCountingNewUser(dateStart, dateEnd) {
    if (!dateStart) {
        dateStart = 0
    }
    if (!dateEnd) {
        dateEnd = 0
    }
    var total = 0;
    var employer = {
        employer: 0,
        store: 0,
        premium: 0
    };
    var jobseeker = {
        hn: 0,
        sg: 0,
        other: 0,
        hn_ve: 0,
        sg_ve: 0,
        other_ve: 0
    };
    var noEmail = 0;
    var noPhone = 0;
    var noProfile = 0;

    var act = {
        userLikeStore: 0,
        storeLikeUser: 0,
        match: 0,
        success: 0,
        meet: 0,
    }

    var provider = {
        facebook: 0,
        normal: 0
    }
    for (var i in dataUser) {
        var userData = dataUser[i];
        if (userData.createdAt) {
            if ((userData.createdAt > dateStart || dateStart == 0) && (userData.createdAt < dateEnd || dateEnd == 0)) {
                total++
                if (userData.type == 1) {
                    employer.employer++


                } else if (userData.type == 2) {
                    if (dataProfile && dataProfile[i] && dataProfile[i].location) {
                        var profileData = dataProfile[i]
                        var disToHn = getDistanceFromLatLonInKm(profileData.location.lat, profileData.location.lng, CONFIG.address.hn.lat, CONFIG.address.hn.lng)
                        if (disToHn < 100) {
                            jobseeker.hn++
                            if (profileData.verify) {
                                jobseeker.hn_ve++
                            }
                        } else {
                            var disToSg = getDistanceFromLatLonInKm(profileData.location.lat, profileData.location.lng, CONFIG.address.sg.lat, CONFIG.address.sg.lng)
                            if (disToSg < 100) {
                                jobseeker.sg++
                                if (profileData.verify) {
                                    jobseeker.sg_ve++
                                }
                            } else {
                                jobseeker.other++
                                if (profileData.verify) {
                                    jobseeker.other_ve++
                                }
                            }
                        }
                    }
                }
                if (!userData.email) {
                    noEmail++
                }
                if (!userData.phone) {
                    noPhone++
                }
                if (dataProfile && !dataProfile[i]) {
                    noProfile++
                }
                if (userData.provider == 'facebook') {
                    provider.facebook++
                } else if (userData.provider == 'normal') {
                    provider.normal++
                }
            }
        } else {
            console.log('Static_User_No_CreatedAt', i)

        }
    }
    for (var i in dataStore) {
        var storeData = dataStore[i];
        if (storeData.createdAt) {
            if ((storeData.createdAt > dateStart || dateStart == 0) && (storeData.createdAt < dateEnd || dateEnd == 0)) {
                employer.store++
                if (storeData.createdBy
                    && dataUser[storeData.createdBy]
                    && dataUser[storeData.createdBy].package == 'premium') {
                    employer.premium++
                }

            }


        } else {
            console.log('Static_Store_No_CreatedAt', i)
            if (!storeData.storeName) {
                storeRef.child(i).remove(function (a) {
                    console.log('store_Delete')
                })
            }
        }
    }

    for (var i in likeActivity) {
        var likeData = likeActivity[i];
        if (
            likeData.likeAt &&
            (likeData.likeAt > dateStart || dateStart == 0) &&
            (likeData.likeAt < dateEnd || dateEnd == 0)
        ) {
            if (likeData.type == 2) {
                act.userLikeStore++
            }
            if (likeData.type == 1) {
                act.storeLikeUser++
            }
            if (likeData.status == 1) {
                act.match++
            }
        }
        if (
            likeData.matchedAt &&
            (likeData.matchedAt > dateStart || dateStart == 0) &&
            (likeData.matchedAt < dateEnd || dateEnd == 0)
        ) {
            act.match++
        }

        if (likeData.success &&
            (likeData.success > dateStart || dateStart == 0) &&
            (likeData.success < dateEnd || dateEnd == 0)
        ) {
            act.success++
        }
        if (likeData.meet &&
            (likeData.meet > dateStart || dateStart == 0) &&
            (likeData.meet < dateEnd || dateEnd == 0)) {
            act.meet++
        }
    }

    return new Promise(function (resolve, reject) {
        var data = {
            dateStart: dateStart,
            dateEnd: dateEnd,
            total: total,
            employer: employer,
            jobseeker: jobseeker,
            noEmail: noEmail,
            noPhone: noPhone,
            noProfile: noProfile,
            provider: provider,
            act: act

        };
        console.log(data);
        resolve(data)
    })

}


function analyticsRemind() {
    var dateStart = new Date()
    dateStart.setHours(0, 0, 0, 0)
    var datenow = dateStart.getTime()
    var dayy = dateStart.getDate() + '/' + dateStart.getMonth()
    StaticCountingNewUser(datenow, datenow + 86400 * 1000).then(function (data) {
        var mail = {
            title: dayy + '| Jobo KPI Result ',
            preview: `Từ ${dayy} đến ${new Date(data.dateEnd)}: Total User: ${data.total}`,
            subtitle: '',
            description1: 'Dear friend,',
            description2: `Từ ${dayy} đến ${new Date(data.dateEnd)}:<br> Total User: ${data.total} <br> <b>Employer:</b><br> - New account: ${data.employer.employer} <br> - New store: ${data.employer.store} <br> - New premium: ${data.employer.premium}<br> <b>Jobseeker:</b><br> - HN: ${data.jobseeker.hn} <br> -SG: ${data.jobseeker.sg} <br> <b>Operation/Sale:</b> <br>- Ứng viên thành công: ${data.act.success} <br> - Ứng viên đi phỏng vấn:${data.act.meet} <br> - Lượt ứng tuyển: ${data.act.userLikeStore} <br> - Lượt tuyển: ${data.act.storeLikeUser} <br> - Lượt tương hợp: ${data.act.match}`,
            description3: 'Keep up guys! We can do it <3',
            calltoaction: 'Hello the world',
            linktoaction: 'https://www.messenger.com/t/979190235520989',
            image: ''
        }

        for (var i in dataUser) {
            if (dataUser[i].admin == true) {
                console.log(dataUser[i].email)
                sendNotification(dataUser[i], mail, true, true, true)
            }
        }
    })
}

app.get('/sendRemind', function (req, res) {
    analyticsRemind()
    res.send('sendRemind done')
})
schedule.scheduleJob({hour: 18, minute: 0}, function () {
    analyticsRemind()
});
app.get('/admin/analyticsUser', function (req, res) {
        var dateStart = new Date()
        dateStart.setHours(0, 0, 0, 0)
        dateStart = dateStart.getTime()
        console.log(dateStart);
        var ObjectData = {}
        var day = 360;
        var i = 0;
        var dateNow = dateStart;
        StaticCountingNewUser().then(function (data) {
            ObjectData.all = data
        });

        function myloop() {
            if (i < day && dateNow > 1482598800000) {
                dateNow = dateStart - 86400 * 1000 * i;
                StaticCountingNewUser(dateNow, dateNow + 86400 * 1000).then(function (data) {
                    ObjectData[dateNow] = data
                    i++
                    myloop()
                })
            } else {
                res.send(ObjectData)
            }
        }

        myloop()
    }
);

app.get('/admin/analytics', function (req, res) {
        checkInadequateProfile().then(function (data) {
            res.send(data)
        })
    }
);

//
// // Remind:
// function ReminderInstallApp() {
//     for (var i in dataUser) {
//         var userData = dataUser[i]
//         if (!userData.mobileToken) {
//             if (userData.type == 1) {
//                 var mail = {
//                     title: "Jobo sẽ giúp bạn không bỏ lỡ những tài năng",
//                     preview: "Cài đặt ngay Jobo để tương tác với ứng viên tiềm năng",
//                     subtitle: '',
//                     description1: 'Xin chào ' + getLastName(userData.name),
//                     description2: "Bạn đã cài đặt Jobo chưa? Nếu chưa thì hãy nhanh tay lên nhé và nhớ bật thông báo để Jobo đưa tin nhé",
//                     description3: 'Tài khoản để anh/chị sử dụng là: Email:' + userData.email,
//                     calltoaction: 'Bắt đầu cài đặt app và tìm kiếm ứng viên tiềm năng',
//                     linktoaction: CONFIG.WEBURL + '/go',
//                     image: ''
//                 }
//                 sendNotification(userData, mail, true, true, true)
//             } else if (userData.type == 2) {
//                 var mail = {
//                     title: "Hãy để Jobo giúp bạn tìm kiếm việc làm nhanh hơn nhé",
//                     preview: "Nhanh tay cài đặt Jobo để tìm việc nhanh nào",
//                     subtitle: '',
//                     description1: 'Xin chào ' + getLastName(userData.name),
//                     description2: "Nếu bạn lọt vào mắt xanh của nhà tuyển dụng, chúng tôi sẽ thông báo cho bạn qua email hoặc thông báo điện thoại, nhưng để nhanh hơn thì hãy bật thông báo nhé, có việc ngay lập tức đấy",
//                     description3: 'Tài khoản để bạn sử dụng là: Email: ' + userData.email,
//                     calltoaction: 'Bắt đầu tìm việc',
//                     linktoaction: CONFIG.WEBURL + '/go',
//                     image: ''
//                 }
//                 sendNotification(userData, mail, true, true, true)
//             }
//         }
//     }
// }
//
// schedule.scheduleJob({hour: 12, minute: 14, dayOfWeek: 0}, function () {
//     ReminderInstallApp()
// });
//
// function ReminderJobseekerUpdateAvatar() {
//     for (var i in dataProfile) {
//         var profile = dataProfile[i]
//         if (!profile.avatar) {
//             var mail = {
//                 title: "Bạn quên cập nhật ảnh đại diện rồi này!",
//                 body: "Dear " + getLastName(profile.name) + " nhanh tay hoàn thành hồ sơ đi nào, có rất nhiều nhà tuyển dụng đang chờ đợi tài năng như bạn đấy!",
//                 subtitle: '',
//                 description1: 'Jobo xin chào ' + getLastName(profile.name),
//                 description2: 'Hiện tại hồ sơ của bạn đang thiếu ảnh đại diện đấy, hãy để nhà tuyển dụng thấy được gương mặt đầy tìm năng của bạn nào',
//                 description3: 'Nào, nhấc điện thoại lên và cập nhật anh đại diện của bạn đi nào, có khó khăn gì hãy gọi cho Jobo nhé (0968269860), khó khăn gì cứ hỏi, ngại ngùng chi nữa ',
//                 calltoaction: 'Cập nhật và gặp nhà tuyển dụng nào!',
//                 linktoaction: CONFIG.WEBURL,
//                 description4: ''
//             }
//             var userData = dataUser[i]
//             sendNotification(userData, mail, true, true, true)
//         }
//     }
// }
//
// schedule.scheduleJob({hour: 12, minute: 30, dayOfWeek: 1}, function () {
//     ReminderJobseekerUpdateAvatar()
// })
//
// function ReminderUpdateDeadline() {
//     for (var i in dataJob) {
//         var job = dataJob[i]
//         if (!job.deadline) {
//             var storeData = dataStore[job.storeId]
//             var userData = dataUser[storeData.createdBy]
//             var mail = {
//                 title: "Bạn đã tuyển đủ nhân viên chưa?",
//                 body: "Cập nhật lại vị trí nhân viên giúp Jobo nhé!",
//                 subtitle: '',
//                 description1: 'Jobo xin chào ' + storeData.storeName,
//                 description2: 'Cập nhật lại thông tin và ngày hết hạn để hỗ trợ Jobo giúp bạn tuyển dụng nhé, nhanh lắm!',
//                 description3: 'Sao bạn không làm một vòng +4000 hồ sơ để tìm cho mình một nhân viên nhỉ?!',
//                 calltoaction: 'Cập nhật để tìm ứng viên!',
//                 linktoaction: CONFIG.WEBURL,
//                 description4: '',
//             };
//             sendNotification(userData, mail, true, true, true)
//         }
//     }
// }
//
// schedule.scheduleJob({hour: 12, minute: 14, dayOfWeek: 2}, function () {
//     ReminderUpdateDeadline()
// });
//
// function ReminderUpdateExpect_Job() {
//     for (var i in dataProfile) {
//         var profile = dataProfile[i]
//         if (!profile.job) {
//             var userData = dataUser[i]
//             var mail = {
//                 title: "Hãy cho Jobo biết bạn đang cần tìm việc gì nào?",
//                 body: "Vị trí mong muốn của bạn như thế nào,  bật mí cho Jobo biết để Jobo tìm giúp bạn nhé !",
//                 subtitle: '',
//                 description1: 'Xin chào ' + getLastName(userData.name),
//                 description2: 'Hãy cho Jobo biết vị trí mong muốn của bạn đi nào!',
//                 description3: 'Chúng ta cùng lướt hơn 300 công việc xung quanh bạn nhé',
//                 calltoaction: 'Xem profile của bạn',
//                 linktoaction: CONFIG.WEBURL + '/view/profile/' + userData.userId,
//                 image: ''
//             };
//             sendNotification(userData, mail, true, true, true)
//         }
//     }
// }
//
// schedule.scheduleJob({hour: 12, minute: 14, dayOfWeek: 4}, function () {
//     ReminderUpdateExpect_Job()
// });
//
//
// function ReminderAvatarUpdate() {
//     for (var i in dataUser) {
//         console.log('start')
//         var userData = dataUser[i]
//         if (userData.userId && dataProfile && dataProfile[userData.userId] && !dataProfile[userData.userId].avatar) {
//             var mail = {
//                 title: "Cập nhật ảnh đại diện của bạn đi nào, nhà tuyển dụng đang chờ kìa",
//                 body: "Cùng Jobo cập nhật ảnh đại diện nhé!",
//                 subtitle: '',
//                 description1: 'Jobo xin chào ' + getLastName(dataProfile[userData.userId].name),
//                 description2: 'Có rất nhiều nhà tuyển dụng đã xem hồ sơ của bạn nhưng vì bạn quên cập nhật ảnh đại diện nên họ đã lỡ mất một nhân viên tìm năng, xinh đẹp như bạn rồi ',
//                 description3: 'Cùng cập nhật ảnh đại diện để tìm việc nhé',
//                 calltoaction: 'Bắt đầu nào',
//                 linktoaction: CONFIG.WEBURL,
//                 image: ''
//             };
//             sendNotification(userData, mail, true, true, true)
//         }
//     }
// }
//
// schedule.scheduleJob({hour: 12, minute: 14, dayOfWeek: 6}, function () {
//     ReminderAvatarUpdate()
// });
//
// function ReminderCreateProfile() {
//     for (var i in dataUser) {
//         console.log('start')
//         var userData = dataUser[i]
//         if (userData.userId && !dataProfile[i] && userData.type == 2) {
//             var how = ''
//             if (userData.provider == 'facebook') {
//                 how = 'bằng tài khoản facebook ' + userData.name + ' (' + userData.email + ')'
//             } else {
//                 how = 'bằng tài khoản với Email: ' + userData.email + ' / Password: tuyendungjobo'
//             }
//             var mail = {
//                 title: "Bạn muốn tìm được việc làm? Chỉ cần tạo hồ sơ trên Jobo",
//                 body: "Bạn chỉ cần tạo hồ sơ, còn lại cứ để Jobo lo!",
//                 subtitle: '',
//                 description1: 'Jobo xin chào ' + getLastName(userData.name),
//                 description2: 'Hồ sơ của bạn đang thiếu thông tin đó, cùng Jobo cập nhật và tìm nhà tuyển dụng nào',
//                 description3: 'Hãy vào app hoặc website https://joboapp.com, đăng nhập ' + how,
//                 calltoaction: 'Truy cập Jobo',
//                 linktoaction: CONFIG.WEBURL,
//                 image: ''
//             };
//             sendNotification(userData, mail, true, true, true)
//         }
//     }
// }
//
// schedule.scheduleJob({hour: 9, minute: 5, dayOfWeek: 6}, function () {
//     ReminderCreateProfile()
// });

function isWhere(storeId) {
    var storeData = dataStore[storeId]
    if (storeData) {
        var disToHN = getDistanceFromLatLonInKm(storeData.location.lat, storeData.location.lng, CONFIG.address.hn.lat, CONFIG.address.hn.lng)
        var disToSG = getDistanceFromLatLonInKm(storeData.location.lat, storeData.location.lng, CONFIG.address.sg.lat, CONFIG.address.sg.lng)
        if (disToHN < 100) {
            return 'hn'
        } else if (disToSG < 100) {
            return 'hcm'
        }
    } else {
        return null
    }

}


function PostStoreLoop(storeId, poster) {
    var where = isWhere(storeId)


    var a = 0

    function loop() {
        var group = groupArray[a];
        var send = createJDStore(storeId);
        if (send && group.groupId && (group.area == where || group.area == 'vn')) {
            var data = {};
            if (!poster) {
                if (group.poster.length > 0) {
                    console.log('group.poster.length', group.poster.length)
                    var random = Math.round(Math.random() * group.poster.length)
                    console.log('random', random)
                    poster = group.poster[random]
                } else {
                    poster = 'thuythuy'
                }

            }
            console.log(poster)
            data[poster] = 'tried';
            groupRef.child(group.groupId).update(data)

            graph.post(group.groupId + "/feed?access_token=" + facebookAccount[poster],
                {
                    "message": send.text
                },
                function (err, res) {
                    // returns the post id
                    if (err) {
                        console.log(err.message);
                    } else {
                        var postId = res.id
                        console.log(postId);
                        var array = postId.split('_')
                        var groupId = array[0]
                        data[poster] = true
                        groupRef.child(groupId).update(data)
                    }
                    a++
                    if (a < groupArray.length) {
                        console.log('loop')
                        loop()
                    }

                });
        }
    }

    loop()


}

function PostStore(storeId, poster) {
    var where = isWhere(storeId)

    setTimeout(function () {
        for (var i in groupData) {


            var send = createJDStore(storeId);
            if (send && groupData[i].groupId && (groupData[i].area == where || groupData[i].area == 'vn')) {
                var data = {};
                if (!poster) {
                    if (groupData[i].poster) {
                        var random = Math.round(Math.random() * groupData[i].poster.length)
                        poster = groupData[i].poster[random]
                    } else {
                        poster = 'thuythuy'
                    }

                }
                console.log(poster)
                data[poster] = 'tried';
                groupRef.child(groupData[i].groupId).update(data)

                graph.post(groupData[i].groupId + "/feed?access_token=" + facebookAccount[poster],
                    {
                        "message": send.text
                    },
                    function (err, res) {
                        // returns the post id
                        if (err) {
                            console.log(err.message);
                        } else {
                            var postId = res.id
                            console.log(postId);
                            var array = postId.split('_')
                            var groupId = array[0]
                            data[poster] = true
                            groupRef.child(groupId).update(data)
                        }

                    });
            }

        }


    }, 5000)

}

app.get('/PostToGroup', function (req, res) {
    var text = req.param('text');
    var where = req.param('where');
    var poster = req.param('poster');
    var job = req.param('job');

    PostToGroup(text, poster, where, job);
    res.send(text)
});

function PostToGroup(text, poster, where, job) {
    for (var i in groupData) {

        if (groupData[i].groupId
            && (groupData[i].area == where || groupData[i].area == 'vn')
            && ((groupData[i].job && groupData[i].job.match(job)) || !job )
        ) {
            var data = {};
            if (!poster) {
                if (groupData[i].poster) {
                    var random = Math.round(Math.random() * groupData[i].poster.length)
                    poster = groupData[i].poster[random]
                } else {
                    poster = 'thuythuy'
                }
            }
            console.log(poster)
            data[poster] = 'tried';
            groupRef.child(groupData[i].groupId).update(data)

            graph.post(groupData[i].groupId + "/feed?access_token=" + facebookAccount[poster],
                {
                    "message": text
                },
                function (err, res) {
                    // returns the post id
                    if (err) {
                        console.log(err.message);
                    } else {
                        var postId = res.id
                        console.log(postId);
                        var array = postId.split('_')
                        var groupId = array[0]
                        data[poster] = true
                        groupRef.child(groupId).update(data)
                    }

                });
        }
    }
}


app.get('/PostStore', function (req, res) {
    var storeId = req.param('storeId');
    var poster = req.param('poster');
    PostStoreLoop(storeId, poster);
});

var rule3 = new schedule.RecurrenceRule();
rule3.hour = 15;
rule3.minute = 0;

schedule.scheduleJob(rule3, function () {
    PostStore('-Ko888eO-cKhfXzJzSQh', 'myhuyen2');
});

var rule4 = new schedule.RecurrenceRule();
rule4.hour = 10;
rule4.minute = 26;

schedule.scheduleJob(rule4, function () {
    PostStore('s28259779165860', 'dong');
});


function PostListJob(ref, where, poster) {
    getShortPremiumJob(ref);
    setTimeout(function () {
        var job = 'VIỆC LÀM LƯƠNG TỐT VÀ THEO CA \n JOBO mang đến rất rất nhiều cơ hội việc làm tại HN, SG nè!  🔥\n' +
            '🎖️ LƯƠNG CAO TỪ 5 TRIỆU TRỞ LÊN.\n' +
            '🎖️ Không cần kinh nghiệm\n' +
            '🎖️ Được hướng dẫn tận tình\n' +
            '🎖️ Không cần CV\n' +
            '🎖️ Lương thưởng x1.2 x1.3 nếu gắn bó lâu dài \n' + createListPremiumJob(where) + ' \n------------------ \n Jobo là ứng dụng tìm việc parttime và thời vụ lương cao \n 🏆 Giải nhì cuộc thi Khởi nghiệp của đại sứ Mỹ \n ️🏆Jobo trên VTV1 Quốc gia khởi nghiệp: https://goo.gl/FVg9AD\n ️🏆 Jobo trên VTV Cà phê khởi nghiệp: https://goo.gl/9CjSco\n ️🔹VP Hà Nội: Toong Coworking space, 25T2 Hoàng Đạo Thuý \n 🔹VP Sài Gòn: 162 Pasteur, Quận 1';

        if (Object.keys(shortLinkData).length > 1) {


            for (var i in groupData) {
                if (groupData[i].groupId && (groupData[i].area == where || groupData[i].area == 'vn')) {
                    var data = {};

                    if (!poster) {
                        if (groupData[i].poster) {
                            var random = Math.round(Math.random() * groupData[i].poster.length)
                            poster = groupData[i].poster[random]
                        } else {
                            poster = 'thuythuy'
                        }

                    }
                    console.log(poster)

                    data[poster] = 'tried'
                    groupRef.child(groupData[i].groupId).update(data)

                    graph.post(groupData[i].groupId + "/feed?access_token=" + facebookAccount[poster],
                        {
                            "message": job
                        },
                        function (err, res) {
                            // returns the post id
                            if (err) {
                                console.log(err.message);
                            } else {
                                var postId = res.id
                                console.log(postId);
                                var array = postId.split('_')
                                var groupId = array[0]
                                data[poster] = true
                                groupRef.child(groupId).update(data)
                            }

                        });
                }
            }

        } else {
            console.log('no')
        }
    }, 10000)
}

var rule = new schedule.RecurrenceRule();
rule.hour = 19;
rule.minute = 49;

schedule.scheduleJob(rule, function () {
    PostListJob('dailyhcm', 'hcm');
});

var rule2 = new schedule.RecurrenceRule();
rule2.hour = 12;
rule2.minute = 55;

schedule.scheduleJob(rule2, function () {
    PostListJob('dailyhn', 'hn');
});

app.get('/PostListJob', function (req, res) {
    PostListJob('dailyhn', 'hn');
});


function Notification_FirstRoundInterview() {
    var dataliked = _.where(likeActivity, {storeId: 's35071407305077', status: 0, type: 2});

    for (var i in dataliked) {
        var likeData = dataliked[i]
        var userData = dataUser[likeData.userId]
        var how = ''
        if (userData.provider == 'facebook') {
            how = 'bằng tài khoản facebook ' + userData.name + ' (' + userData.email + ')'
        } else {
            how = 'bằng tài khoản với Email: ' + userData.email + ' / Password: tuyendungjobo'

        }
        var mail = {
            title: likeData.storeName + ' | Chúc mừng bạn đã vượt qua vòng hồ sơ',
            body: likeData.storeName + ' xin chúc mừng bạn đã vượt qua vòng hô sơ, đến với vòng 2 là vòng phỏng vấn online, Bạn hãy thực hiện vòng phỏng vấn này bằng cách trả lời 2 câu hỏi phỏng vấn dưới đây và ghi hình lại rồi gửi về cho chúng tôi <br> Câu 1: Hãy giới thiệu bản thân trong vòng 30s <br> Câu 2: Tại sao chúng tôi nên chọn bạn? ',
            subtitle: '',
            description1: 'Chào ' + getLastName(likeData.userName),
            description2: likeData.storeName + ' xin chúc mừng bạn đã vượt qua vòng hô sơ, đến với vòng 2 là vòng phỏng vấn online, Bạn hãy thực hiện vòng phỏng vấn này bằng cách trả lời 2 câu hỏi phỏng vấn dưới đây và ghi hình lại rồi gửi về cho chúng tôi <br> Câu 1: Hãy giới thiệu bản thân trong vòng 30s <br> Câu 2: Tại sao chúng tôi nên chọn bạn? ',
            description3: 'Lưu ý:<br>  - Mỗi câu hỏi tối đa dài 30s <br> - Ghi hình rõ mặt và đủ ánh sáng <br> Cách thức thực hiện: <br> 1. Sử dụng thiết bị ghi hình như điện thoại hoặc laptop, quay liên tục các câu hỏi. <br> 2. Đăng nhập vào Joboapp bằng tài khoản của bạn, đi tới trang "chỉnh sửa hồ sơ", upload video vào phần "video giới thiệu" <br>3. Sau khi thực hiện xong vui lòng thông báo cho chúng tôi bằng cách trả lời email hoặc gọi điện tới 0968269860',
            calltoaction: 'Truy cập Jobo',
            linktoaction: CONFIG.WEBURL,
            description4: 'Hãy vào app hoặc website https://joboapp.com, đăng nhập ' + how,
            image: ''
        };
        sendNotification(userData, mail, true, true, true)
    }
}

function Email_happyBirthDayProfile() {
    for (var i in dataProfile) {
        var profileData = dataProfile[i]
        if (profileData.userId && dataProfile && profileData && profileData.birth) {
            var userData = dataUser[i]
            var mail = {
                title: "Chúc mừng sinh nhật " + getLastName(profileData.name) + " <3 <3 <3",
                body: "Hãy để những lời chúc sâu lắng của chúng tôi luôn ở bên cạnh cuộc sống tuyệt vời của bạn. Jobo hy vọng trong năm tới bạn luôn khỏe mạnh và thuận buồm xuôi gió trong công việc. Sinh nhật vui vẻ!!",
                subtitle: '',
                description1: 'Dear ' + getLastName(profileData.name),
                description2: 'Hãy để những lời chúc sâu lắng của chúng tôi luôn ở bên cạnh cuộc sống tuyệt vời của bạn. Jovo hy vọng trong năm tới bạn luôn khỏe mạnh và thuận buồm xuôi gió trong công việc. Sinh nhật vui vẻ!!',
                description3: 'Jobo luôn cố gắng giúp bạn tìm được việc làm phù hợp nhanh nhất có thể',
                calltoaction: 'Xem chi tiết',
                linktoaction: CONFIG.WEBURL,
                image: ''
            };
            schedule.scheduleJob(profileData.birth, function () {
                sendNotification(userData, mail, true, true, true)
            });

        }
    }
}

function Email_sendListInterviewedToEmployer(storeId) {
    var storeData = dataStore[storeId]
    var userInfo = dataUser[storeData.createdBy]
    var liked = _.where(likeActivity, {storeId: storeId, status: 0, type: 2});

    var profileEmail = ''
    for (var i in liked) {
        var likeData = liked[i]
        var card = dataProfile[likeData.userId];
        card.url = CONFIG.WEBURL + '/view/profile/' + card.userId;
        profileEmail = profileEmail + '<td style="vertical-align:top;width:200px;"> <![endif]--> <div class="mj-column-per-33 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="center"> <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0px;" align="center" border="0"> <tbody> <tr> <td style="width:150px;"><img alt="" title="" height="auto" src="' + card.avatar + '" style="border:none;border-radius:0px;display:block;outline:none;text-decoration:none;width:100%;height:auto;" width="150"></td> </tr> </tbody> </table> </td> </tr> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="center"> <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:16px;font-weight:bold;line-height:22px;text-align:center;"> ' + card.name + ' </div> </td> </tr> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="justify"> <div class="" style="cursor:auto;color:#000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:center;" ></div> </td> </tr> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="center"> <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;" align="center" border="0"> <tbody>  <tr> <td  style="border:none;border-radius:40px;background: #1FBDF1;background: -webkit-linear-gradient(to left, #1FBDF1, #39DFA5); background: linear-gradient(to left, #1FBDF1, #39DFA5);cursor:auto;padding:10px 25px;"align="center" valign="middle" bgcolor="#8ccaca"><a href="' + card.url + '"> <p style="text-decoration:none;line-height:100%;color:#ffffff;font-family:helvetica;font-size:12px;font-weight:normal;text-transform:none;margin:0px;">Xem hồ sơ</p></a> </td> </tr></tbody> </table> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td>'

        console.log(card.name)
    }

    return new Promise(function (resolve, reject) {
        resolve(profileEmail)
    }).then(function (profileEmail) {
        console.log('sone')
        var headerEmail = '<!doctype html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head> <title></title> <!--[if !mso]><!-- --> <meta http-equiv="X-UA-Compatible" content="IE=edge"> <!--<![endif]--> <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"> <style type="text/css"> #outlook a { padding: 0; } .ReadMsgBody { width: 100%; } .ExternalClass { width: 100%; } .ExternalClass * { line-height: 100%; } body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; } table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; } img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; } p { display: block; margin: 13px 0; } </style> <!--[if !mso]><!--> <style type="text/css"> @media only screen and (max-width:480px) { @-ms-viewport { width: 320px; } @viewport { width: 320px; } } </style> <!--<![endif]--> <!--[if mso]><xml> <o:OfficeDocumentSettings> <o:AllowPNG/> <o:PixelsPerInch>96</o:PixelsPerInch> </o:OfficeDocumentSettings></xml><![endif]--> <!--[if lte mso 11]><style type="text/css"> .outlook-group-fix { width:100% !important; }</style><![endif]--> <style type="text/css"> @media only screen and (min-width:480px) { .mj-column-per-33 { width: 33.333333333333336%!important; } } </style></head><body> <div> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" > <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-100 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="left"> <div class="" style="cursor:auto;color:#000000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;"> <p>Chào ' + storeData.storeName + '</p> <p>Jobo gửi đối tác danh sách ứng viên đã được kiểm và phỏng vấn sơ lược:</p> </div> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="500" align="center" style="width:500px;"> <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;max-width:500px;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr>'

        var footerEmail = '<!--[if mso | IE]> </td></tr></table> <![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;"> <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;max-width:600px;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-100 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="left"> <div class="" style="cursor:auto;color:#000000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;"> <p>Đối tác lựa chọn những ứng viên phù hợp rồi Jobo sẽ thông báo cho ứng viên đi nhận việc.</p>  <p>Jobo rất vinh dự được làm việc với đối tác!</p> <p>Khánh Thông - CEO & Founder, Jobo</p></div> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;"> <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;max-width:600px;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-100 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;"><p style="font-size:1px;margin:0px auto;border-top:1px solid #E0E0E0;width:100%;"></p> <!--[if mso | IE]> <table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" style="font-size:1px;margin:0px auto;border-top:1px solid #E0E0E0;width:100%;" width="600"> <tr> <td style="height:0;line-height:0;"></td> </tr> </table><![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-80 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="left"> <div class="" style="cursor:auto;color:#000000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;"> <p>Sent with ♥ from Jobo</p> +84 968 269 860<br> joboapp.com </div> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-20 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="left"> <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0px;" align="left" border="0"> <tbody> <tr> <td style="width:70px;"><img alt="" title="" height="auto" src="' + CONFIG.WEBURL + '/img/logo.png" style="border:none;border-radius:;display:block;outline:none;text-decoration:none;width:100%;height:auto;" width="70"></td> </tr> </tbody> </table> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--></div></body></html>'

        var email = userInfo.email;
        console.log('send, ' + email);

        var htmlEmail = headerEmail + profileEmail + footerEmail


        if (email && userInfo.wrongEmail != true) {
            var mailOptions = {
                from: {
                    name: 'Khánh Thông | Jobo - Tìm việc nhanh',
                    address: 'hello@joboapp.com'
                },
                to: 'thonglk.mac@gmail.com',
                bcc: 'darkidroll@gmail.com',
                subject: 'Jobo - ' + storeData.storeName + ' | Gửi danh sách ứng viên phỏng vấn',
                html: htmlEmail

            };

            return mailTransport.sendMail(mailOptions).then(function () {
                console.log('New email sent to: ' + email);
            }, function (error) {
                console.log('Some thing wrong when sent email to ' + email + ':' + error);
            });
        }
    })


}

function Email_sendListLikedToEmployer(storeId) {
    var storeData = dataStore[storeId]
    var userInfo = dataUser[storeData.createdBy];
    var liked = _.where(likeActivity, {storeId: storeId, status: 0, type: 2});

    var profileEmail = '';
    for (var i in liked) {

        if (liked[i].userId && dataProfile[liked[i].userId]) {
            var likeData = liked[i]
            var card = dataProfile[likeData.userId];
            card.url = CONFIG.WEBURL + '/view/profile/' + card.userId;
            profileEmail = profileEmail + '<td style="vertical-align:top;width:200px;"> <![endif]--> <div class="mj-column-per-33 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="center"> <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0px;" align="center" border="0"> <tbody> <tr> <td style="width:150px;"><img alt="" title="" height="auto" src="' + card.avatar + '" style="border:none;border-radius:0px;display:block;outline:none;text-decoration:none;width:100%;height:auto;" width="150"></td> </tr> </tbody> </table> </td> </tr> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="center"> <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:16px;font-weight:bold;line-height:22px;text-align:center;"> ' + card.name + ' </div> </td> </tr> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="justify"> <div class="" style="cursor:auto;color:#000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:center;" ></div> </td> </tr> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="center"> <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;" align="center" border="0"> <tbody>  <tr> <td  style="border:none;border-radius:40px;background: #1FBDF1;background: -webkit-linear-gradient(to left, #1FBDF1, #39DFA5); background: linear-gradient(to left, #1FBDF1, #39DFA5);cursor:auto;padding:10px 25px;"align="center" valign="middle" bgcolor="#8ccaca"><a href="' + card.url + '"> <p style="text-decoration:none;line-height:100%;color:#ffffff;font-family:helvetica;font-size:12px;font-weight:normal;text-transform:none;margin:0px;">Xem hồ sơ</p></a> </td> </tr></tbody> </table> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td>'

            console.log(card.name)
        }

    }

    return new Promise(function (resolve, reject) {
        resolve(profileEmail)
    }).then(function (profileEmail) {
        console.log('sone')
        var headerEmail = '<!doctype html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head> <title></title> <!--[if !mso]><!-- --> <meta http-equiv="X-UA-Compatible" content="IE=edge"> <!--<![endif]--> <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"> <style type="text/css"> #outlook a { padding: 0; } .ReadMsgBody { width: 100%; } .ExternalClass { width: 100%; } .ExternalClass * { line-height: 100%; } body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; } table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; } img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; } p { display: block; margin: 13px 0; } </style> <!--[if !mso]><!--> <style type="text/css"> @media only screen and (max-width:480px) { @-ms-viewport { width: 320px; } @viewport { width: 320px; } } </style> <!--<![endif]--> <!--[if mso]><xml> <o:OfficeDocumentSettings> <o:AllowPNG/> <o:PixelsPerInch>96</o:PixelsPerInch> </o:OfficeDocumentSettings></xml><![endif]--> <!--[if lte mso 11]><style type="text/css"> .outlook-group-fix { width:100% !important; }</style><![endif]--> <style type="text/css"> @media only screen and (min-width:480px) { .mj-column-per-33 { width: 33.333333333333336%!important; } } </style></head><body> <div> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" > <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-100 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="left"> <div class="" style="cursor:auto;color:#000000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;"> <p>Chào ' + storeData.storeName + '</p> <p>Jobo gửi danh sách ứng viên đã ứng tuyển vào vị trí ' + getStringJob(storeData.job) + ' của đối tác:</p> </div> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="500" align="center" style="width:500px;"> <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;max-width:500px;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr>'

        var footerEmail = '<!--[if mso | IE]> </td></tr></table> <![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;"> <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;max-width:600px;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-100 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="left"> <div class="" style="cursor:auto;color:#000000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;"> <p>Đối tác lựa chọn những ứng viên phù hợp và tuyển nhé<br> <b>Cách thức liên hệ ứng viên:</b><br>\n' +
            ' 1. Đối tác sẽ được xem thông tin hồ sơ của ứng viên Jobo hoàn toàn miễn phí, và chỉ mất phí khi muốn liên hệ với ứng viên.<br>2. Để liên hệ với 1 ứng viên, đối tác cần 1 điểm mở khoá thông tin liên hệ.<br>3. Đối tác có thể mua 10 điểm/ 300.000 vnd. <br> Để mua gói mở khoá, đối tác vui lòng chuyển khoản phí về tài khoản dưới đây của Jobo: <br>\n' +
            'THÔNG TIN CHUYỂN KHOẢN<br>\n' +
            '• Họ và tên: Lê Khánh Thông<br>\n' +
            '• Số tài khoản: 109001400392<br>\n' +
            '• Số tiền: 300.000VND<br>\n' +
            '• Vietinbank Ngân hàng TMCP Công thương Việt Nam – Chi nhánh TP Vinh<br>\n' +
            '• Nội dung chuyển khoản: ' + storeData.storeName + ' _basic<br>\n' +
            '\n' +
            'Sau đó đối tác hãy liên hệ vào số hotline 0968 269 860 để được kích hoạt tài khoản..</p>  <p>Jobo rất vinh dự được làm việc với đối tác!</p> <p>Khánh Thông - CEO & Founder, Jobo</p></div> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;"> <tr> <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"> <![endif]--> <div style="margin:0px auto;max-width:600px;"> <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0"> <tbody> <tr> <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;"> <!--[if mso | IE]> <table role="presentation" border="0" cellpadding="0" cellspacing="0"> <tr> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-100 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;"><p style="font-size:1px;margin:0px auto;border-top:1px solid #E0E0E0;width:100%;"></p> <!--[if mso | IE]> <table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" style="font-size:1px;margin:0px auto;border-top:1px solid #E0E0E0;width:100%;" width="600"> <tr> <td style="height:0;line-height:0;"></td> </tr> </table><![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-80 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="left"> <div class="" style="cursor:auto;color:#000000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;"> <p>Sent with ♥ from Jobo</p> +84 968 269 860<br> joboapp.com </div> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td> <td style="vertical-align:top;width:600px;"> <![endif]--> <div class="mj-column-per-20 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;"> <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"> <tbody> <tr> <td style="word-break:break-word;font-size:0px;padding:10px 25px;" align="left"> <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0px;" align="left" border="0"> <tbody> <tr> <td style="width:70px;"><img alt="" title="" height="auto" src="' + CONFIG.WEBURL + '/img/logo.png" style="border:none;border-radius:;display:block;outline:none;text-decoration:none;width:100%;height:auto;" width="70"></td> </tr> </tbody> </table> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--> </td> </tr> </tbody> </table> </div> <!--[if mso | IE]> </td></tr></table> <![endif]--></div></body></html>'

        var email = userInfo.email;
        console.log('send, ' + email);

        var htmlEmail = headerEmail + profileEmail + footerEmail


        if (profileEmail.length > 0 && email && userInfo.wrongEmail != true) {
            var mailOptions = {
                from: {
                    name: 'Khánh Thông | Jobo - Tìm việc nhanh',
                    address: 'thonglk.mac@gmail.com'
                },
                to: email,
                cc: 'thonglk@joboapp.com',
                subject: 'Jobo - ' + storeData.storeName + ' | Gửi danh sách ứng viên phỏng vấn',
                html: htmlEmail,
                attachments: [
                    {
                        path: 'https://joboapp.com/img/proposal_pricing_included.pdf'
                    }
                ]
            };

            return mailTransport.sendMail(mailOptions).then(function () {
                console.log('New email sent to: ' + email);
            }, function (error) {
                console.log('Some thing wrong when sent email to ' + email + ':' + error);
            });
        }
    })
}

app.get('/sendList', function (req, res) {
    var storeId = req.param('storeId')
    if (storeId) {
        Email_sendListLikedToEmployer(storeId)
    } else {
        var now = new Date().getTime()
        var a = 0;
        for (var i in dataStore) {
            a++;
            var time = now + 60000 * a;
            schedule.scheduleJob(time, function () {
                Email_sendListLikedToEmployer(i)
            });
        }
    }
    res.send('done')
})

// automate Job post facebook


// start the server
http.createServer(app).listen(port);
https.createServer(credentials, app).listen(8443);
console.log('Server started!', port);

init();
