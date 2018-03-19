// grab the packages we need
var firebase = require("firebase-admin");
var express = require('express');
var axios = require('axios');

var app = express();
var port = process.env.PORT || 8081;
var fs = require('fs');
var http = require('http')
var https = require('https')
var request = require('request');
var bodyParser = require('body-parser');
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
var flat = require('flat')
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

//Mongoose//
var mongoose = require('mongoose');
var FacebookPost = require('./models/facebook-post');

var uri = 'mongodb://joboapp:joboApp.1234@ec2-54-157-20-214.compute-1.amazonaws.com:27017/joboapp';

mongoose.connect(uri);

console.log('Connected to MongoDB at ', uri);


const MongoClient = require('mongodb');


var md, userCol, profileCol, storeCol, jobCol, notificationCol, staticCol, leadCol, emailChannelCol

MongoClient.connect(uri, function (err, db) {
    if (err) console.log(err);

    md = db;
    userCol = md.collection('user');
    profileCol = md.collection('profile');
    storeCol = md.collection('store');
    jobCol = md.collection('job');
    notificationCol = md.collection('notification');
    staticCol = md.collection('static');
    leadCol = md.collection('lead');
    emailChannelCol = md.collection('emailChannel');

    console.log("Connected correctly to server.");
    init();
});


// TODO(DEVELOPER): Configure your email transport.

app.use(cors());
app.use(express.static(__dirname + '/static'));
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({extended: true})); // support encoded bodies
app.use(function (req, res, next) {
    res.contentType('application/json');
    next();
});


firebase.initializeApp({
    credential: firebase.credential.cert({
        "type": "service_account",
        "project_id": "jobo-chat",
        "private_key_id": "dadaa2894385e39becf4224109fd59ba866414f4",
        "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDZDEwnCY6YboXU\nd0fSmOAL8QuPVNj6P+fJc+sa7/HUqpcZrnubJAfPYjDCiUOf9p6mo2g5nQEZiiim\nQYiB+KMt8sHPvRtNF5tWeXN3s7quKAJcwCZC8RySeiR9EfKTniI6QrFwQt0pU1Ay\ncPg/whb1LwXoyA6C7PErOEJ+xsDQmCxEOLmGrbmDe81tBJZIBU8WupV7j9416qOs\n3iPnYIJxr6gqJWKNp6ALUM/48c1pAompn6aB7zOweyvvfC6ZKuMUfsEii5FDYR+A\n9eeeghZFXv9VLp4zpsWUZqytGEEW9xgWdC5aCbMN6PoAvhbrr+CEz2hqimMFEqyn\nfRnrDTx3AgMBAAECggEAEGqys90wMO1jJ//hqdcwUxbnVe8H/l2pDX68EKyHcRt6\nFFIzPTfLc28s2voA6G+B7n67mmf6tlDR5Elept4Ekawj5q+aCgm4ESFcj3hDrXqP\nOy65diTAkX+1lNQvseSrGBcFTsVv7vlDPp122XO3wtHMs5+2IUcEss0tkmM8IErO\nmuG1TweQccK6CU+GdvtZ0bsMv16S0fBz9hNfWQ0JRtiBSMeYJahf1wMKoLPHzdfU\nMyK39U3JPHOjaQaYkj80MAdXVOT4fjy7j//p7cLT57Exj4y8jHFpwI9XRawCyKrw\nl6yLzHpGQ4To5ERur8JUtMHF9gYctDr3XI5zZ1fZ0QKBgQDxoZQtlxWpfHBPXwB3\nwclUqfsTZHvmCBeGROX73+Hy2S84W0lrvmr3mrLMnl6syx8OS4tZdA3s8pbvj0HH\nFD8IXV2acc3Mf+OfQiawRowobSSeSPUr//vsPYfobsMtLzOjiO0n20p/nVV3gGCG\nZQyUDuHZVDvSBGz3bUXDeHiZLwKBgQDl9HuIBkW3pcpGvfBMqwOyRhLJFEXL14Nh\npwJ2nBs7eTd09S95+P14s2Y0U2AGc96FmElVrXk8teSn982pocAW3mdD6KgBpC6m\nlEGCJB9da7f27qspUpqsne1+a4GfhBrFp3IVx9HOYgDsJ/xSLnr+Ajhn5lNiJMN5\n3H3iuUSvOQKBgQDi3W4ej+gKxYc9PllWF2BMWXwe7Q1XIOnVawLzxXSDal7nbu40\ndwg/icOuUlNZsSxrY4pmZoxcmDgWnE6J9/xmgiLMS2WKR9kTQizI/LPDkRX8d0ua\nEDIb0Hm2RaiC1/qH5Jul/EKqJrKEDMiT5nQ03vQ19Nxlhzo35STHLmksiQKBgQCQ\nEES8CUHwNfutqh07yv/71g66zuqTNCdpLFpMuKwO7Hgj29+siKMz1SC4s2s7X6gP\nBkMbXBzSPhpMaOD93woayabkUoO+038ueT85KyxDONL97rRopQmmDyLUysFgkEC9\nh5PftVnp9Fgjm0Fmsxv2uqlf3lpq6CFW3R44xl0TcQKBgHC+jSs3fVr7/0uTVXIE\n89V+ypBbPfI4T2Fl9wPuizTxmLTbbnq3neIVurs6RyM5bWUSPIIoU59NajgCBATL\naE8us6ldgDneXCDGt8z1YwFtpLz5H9ItkOMFl4+Y3WLbk3mgdvpI5M8YsgcnDQ8y\nk1GnVuyRg5oTiYM6g7UTvLnx\n-----END PRIVATE KEY-----\n",
        "client_email": "firebase-adminsdk-h83yt@jobo-chat.iam.gserviceaccount.com",
        "client_id": "117827674445250600196",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://accounts.google.com/o/oauth2/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-h83yt%40jobo-chat.iam.gserviceaccount.com"
    }),
    databaseURL: 'https://jobo-chat.firebaseio.com'
});

var db = firebase.database()

function initData(ref) {
    if (!DATA[ref]) DATA[ref] = {}
    db.ref(ref).on('child_added', function (snap) {
        DATA[ref][snap.key] = snap.val()
    });
    db.ref(ref).on('child_changed', function (snap) {
        DATA[ref][snap.key] = snap.val()
    });
    db.ref(ref).on('child_removed', function (snap) {
        delete DATA[ref][snap.key]
    });
}

function saveData(ref, child, data) {
    return new Promise(function (resolve, reject) {
        if (!ref || !child || !data) reject({err: 'Insufficient'})

        db.ref(ref).child(child).update(data)
            .then(result => resolve(data)
            )
            .catch(err => reject(err)
            )
    })
}

var DATA = {}

initData('account')


var secondary = firebase.initializeApp({
    credential: firebase.credential.cert('adminsdk-jobo.json'),
    databaseURL: "https://jobo-b8204.firebaseio.com"
}, "secondary");
var joboPxl = firebase.initializeApp({
    credential: firebase.credential.cert('jobo-pxl.json'),
    databaseURL: "https://jobo-pxl.firebaseio.com"
}, 'jobo-pxl');

var joboTest = firebase.initializeApp({
    credential: firebase.credential.cert('jobotest.json'),
    databaseURL: "https://jobotest-15784.firebaseio.com"
}, 'joboTest');


var db = joboTest.database();
var db2 = joboPxl.database();


var configRef = db.ref('config');


var groupRef = db.ref('groupData');
var storeRef = db.ref('store');
var userRef = db.ref('user');
var profileRef = db.ref('profile');

var groupData, facebookAccount;
var a = 0,
    b = 0;

var configP = {
    l: 'letter',
    M: 'messenger',
    w: 'web',
    m: 'mobile',
    f: 'facebook'
}
var configT = {
    o: 'open',
    c: 'click'
}

function init() {

    groupRef.on('value', function (snap) {
        groupData = snap.val()
    });
    configRef.on('value', function (snap) {
        CONFIG = snap.val()
        facebookAccount = CONFIG.facebookAccount;
        graph.setAccessToken(CONFIG.default_accessToken);
    })
    //test


    var a = 0,
        b = 0;

    setInterval(function () {
        FacebookPost.find({'time': {$gt: Date.now(), $lt: Date.now() + 60000}})
            .then(posts => {
                posts.forEach(function (post) {
                    console.log('facebook', b++);
                    let promise = Promise.resolve(Object.assign({}, post, {schedule: true}));
                    schedule.scheduleJob(post.time, function () {
                        promise = PublishFacebook(post.to, post.content, post.poster, post.postId, post.channel)
                    });
                    return promise;
                })

            })


        notificationCol.find({'time': {$gt: Date.now(), $lt: Date.now() + 60000}})
            .toArray(function (err, notis) {
                if (err) return
                notis.forEach(noti => {
                    console.log('noti', a++);
                    schedule.scheduleJob(noti.time, function () {
                        startSend(noti.userData, noti.mail, noti.channel, noti.notiId).then(function (array) {
                            console.log('array', array)
                        })
                    })
                })
            });

    }, 60000);

    db2.ref('tempNoti2').on('child_added', function (snap) {
        var noti = snap.val()
        if (!noti) return
        if (!noti.notiId) noti.notiId = keygen()
        console.log('noti', noti.notiId);

        notificationCol.findOneAndUpdate({notiId: noti.notiId}, {$set: noti}, {upsert: true}).then(result => {
            if (noti.time < Date.now() + 60000) {
                console.log('noti sending now', a++);
                schedule.scheduleJob(noti.time, function () {
                    startSend(noti.userData, noti.mail, noti.channel, noti.notiId).then(function (array) {
                        console.log('array', array)
                    })
                })
            }
            db2.ref('tempNoti2').child(snap.key).remove()
        }).catch(err => console.log(err))
    })

}


app.get('/sendEmailSES', (req, res) => {
    var addressTo = req.param('email');
    var from = req.param('from');
    var emailMarkup = `<div style="cursor:auto;color:#000;font-family:${font};font-size:13px;line-height:22px;text-align:left;">Check it now</div>`

    let mailOptions = {
        from: {
            name: 'Jobo',
            address: from || 'contact@jobo.asia'
        },
        to: addressTo, // list of receivers
        subject: 'Test Email |' + Date.now(), // Subject line
        text: 'Hello world?', // plain text body
        // html: `${emailMarkup}`, // html body
    }
    var mailTransport = nodemailer.createTransport(ses({
        accessKeyId: 'AKIAIJJTKSHNDOBZWVEA',
        secretAccessKey: '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',
        region: 'us-west-2'
    }));

    // send mail with defined transport object
    mailTransport.sendMail(mailOptions, (error, info) => {
        if (error) res.status(500).json(error)
        res.send('Email sent:' + addressTo)

    });

})
app.get('/sendEmailZoho', (req, res) => {
    var addressTo = req.param('email');
    var from = req.param('from')
    var emailMarkup = `<div style="cursor:auto;color:#000;font-family:${font};font-size:13px;line-height:22px;text-align:left;"><img src="${addTrackingEmail(Date.now(), 'https://jobo.asia/file/jobo.png', 'o', 'l')}"/>Check it now</div>`;

    let mailOptions = {
        from: {
            name: 'Jobo | Tìm việc nhanh',
            address: from || CONFIG.email
        },
        to: addressTo, // list of receivers
        subject: 'Test Email Zoho |' + Date.now(), // Subject line
        html: emailMarkup, // html body
        // text: 'Hello world?', // plain text body
    }

    var mailSplit = from.split('@')
    var idEmail = mailSplit[0]
    console.log('idEmail', idEmail + ' ' + from)
    let mailTransport_sale = nodemailer.createTransport({
        host: 'smtp.zoho.com',
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: CONFIG.zoho_email[idEmail].email, // generated ethereal user
            pass: CONFIG.zoho_email[idEmail].password  // generated ethereal password
        }
    });

    // send mail with defined transport object
    mailTransport_sale.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error sent email', addressTo)
            res.status(500).json(error);
        }
        res.json('Email sent:' + ' ' + addressTo);

    });

})
app.get('/sendEmailGmail', (req, res) => {
    var addressTo = req.param('email');
    var from = req.param('from')
    var emailMarkup = `<div style="cursor:auto;color:#000;font-family:${font};font-size:13px;line-height:22px;text-align:left;"><img src="${addTrackingEmail(Date.now(), 'https://jobo.asia/file/jobo.png', 'o', 'l')}"/>Check it now</div>`;

    let mailOptions = {
        from: {
            name: 'Jobo | Tìm việc nhanh',
            address: from || CONFIG.email
        },
        to: addressTo, // list of receivers
        subject: 'Test Email Zoho |' + Date.now(), // Subject line
        html: emailMarkup, // html body
        // text: 'Hello world?', // plain text body
    }

    var mailSplit = from.split('@')
    var idEmail = mailSplit[0]
    console.log('idEmail', idEmail + ' ' + from)
    var gmailTransport = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: 'thonglk.mac@gmail.com', // generated ethereal user
            pass: 'usvhsadawnsbbnys'  // generated ethereal password
        }
    });

    // send mail with defined transport object
    gmailTransport.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error sent email', addressTo)
            res.status(500).json(error);
        }
        res.json('Email sent:' + ' ' + addressTo);

    });

})

app.get('/testSend', (req, res) => {
    var notitest = {
        "userData": {
            "admin": true,
            "createdAt": 1503224487723.0,
            "currentStore": "-KpkMo8NqK8EMeKlxTUi",
            "email": "thonglk@jobo.asia",
            "messengerId": "1226124860830528",
            "mobileToken": "eKfRyduIQDU:APA91bGofXHLJ2kfnSLbQTIH3AQzcVYhRDMUbHcYcVkasSO_kfFINNQ5bK0ThqJQnH-kS0C1PoPXqnCmZzNqeq2vujHjFwbRvWes14cWniOhqDMDBZHmWGY7STesjOJppVLMt5kRybnk",
            "name": "Khánh Thông",
            "package": "premium",
            "phone": "0968269860",
            "type": 1,
            "userId": "thonglk",
            "webToken": "fd7at9RvjMk:APA91bGtv-HAA6GRpPK0dQZH5RdEgizj1hWjFhVaRcvP2LiackhKcYIrf-eYy4y8UCJRNQBStFR8BElS62bg0xsMuoaWMX_JQwQk59rxkxCHb5VsApTeZcaN72fyHxPKf8LaQxO-SpNn"
        },
        "mail": {
            "title": "thông",
            "body": "haha",
            "description1": "huhu",
            "linktoaction": "https://google.com",
            "calltoaction": "Hihi"
        },
        "notiId": "HneEOS",
        "channel": {
            "web": true,
            "letter": true,
            "mobile": true,
            "messenger": true
        }
    }
    startSend(notitest.userData, notitest.mail, notitest.channel, notitest.notiId)
        .then(array => res.send(array))
        .catch(err => res.status(500).json(err))
})

var sendEmail = (addressTo, mail, emailMarkup, notiId) => {
    return new Promise((resolve, reject) => {

        let mailOptions = {
            from: {
                name: mail.name || 'Lê Khánh Thông',
                address: mail.from || CONFIG.email
            },
            bcc: mail.bcc,
            to: addressTo, // list of receivers
            subject: mail.title, // Subject line
            html: emailMarkup, // html body
        }

        if (mail.attachments) {
            mailOptions.attachments = [{ // filename and content type is derived from path
                path: 'https://jobo.asia/img/proposal_pricing_included.pdf'
            }]
        }

        var mailSplit = mailOptions.from.address.split('@')
        var idEmail = mailSplit[0];

        console.log('idEmail', idEmail)
        // if (mailOptions.from.address == 'hello@jobo.asia') var mailTransport = nodemailer.createTransport(ses({
        //     accessKeyId: 'AKIAJ7UHSMZ6NU6IQHSA',
        //     secretAccessKey: 'AjvtCd9NnCnAuB/RqT4C0acODEcg2qisszw2qboZIz2T',
        //     region: 'us-west-2'
        // }))

        var gmailTransport = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: 'thonglk.mac@gmail.com', // generated ethereal user
                pass: 'usvhsadawnsbbnys'  // generated ethereal password
            }
        });
        var zohoTransport = nodemailer.createTransport({
            host: 'smtp.zoho.com',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: CONFIG.zoho_email[idEmail].email, // generated ethereal user
                pass: CONFIG.zoho_email[idEmail].password  // generated ethereal password
            }
        });
        if (mailOptions.from.address == 'thonglk.mac@gmail.com') var mailTransport = gmailTransport
        else mailTransport = zohoTransport

        // send mail with defined transport object
        mailTransport.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sent email', addressTo)
                reject(error);
            }

            console.log('Email sent:', notiId + ' ' + addressTo)

            notificationCol.updateOne({notiId}, {$set: {letter_sent: Date.now()}})
                .then(() => resolve(notiId))
                .catch(err => reject(err))

        });
    });
}
app.get('/', function (req, res, next) {
    res.send('Jobo' + a + ' ' + b)
})

app.get('/l/:queryString', function (req, res, next) {
    const queryString = req.params.queryString;
    if (!queryString) res.redirect(CONFIG.WEBURL + '/jobseeker/dash');

    var dataStr = queryString.split(":")

    const notiId = dataStr[0];
    const p = dataStr[1];
    const t = dataStr[2];
    const i = dataStr[3];

    var platform = configP[p]
    var type = configT[t]

    console.log(notiId, platform, type);

    findLink(queryString)
        .then(foundLink => {
            console.log(notiId);
            return tracking(notiId, platform, foundLink.url, foundLink.type);
        })
        .then(result => {
            res.set({
                'Surrogate-Control': 'no-store',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            if (t == 'o') {
                res.redirect(result.url);
            } else {
                res.json(result)
            }
        })
        .catch(err => {
            console.log(err);
            res.status(500).json(err);
        });
});

app.get('/searchFacebook', function (req, res) {
    let {type, q} = req.query

    var searchOptions = {q, type};

    graph.search(searchOptions, function (err, result) {
        console.log(result); // {data: [{id: xxx, from: ...}, {id: xxx, from: ...}]}
        res.send(result)
    });
})
app.get('/getallpost', function (req, res) {

    fetchFBPost().then(function (result) {
        res.status(200).json(result);
    }).catch(function (err) {
        res.status(500).json(err);
    })
})

function fetchFBPost() {
    return new Promise((resolve, reject) => {
        FacebookPost.find({id: {$ne: null}})
            .then(posts => {
                return Promise.all(posts.map(post => {
                    return viewFBpost(post._doc);
                }));
            })
            .then(posts => {
                resolve(posts);
            })
            .catch(err => {
                console.log(err);
                reject(err);
            });
    });
}

function viewFBpost(post) {
    return new Promise(function (resolve, reject) {
        graph.get(post.id + "/?fields=comments,reactions", function (err, result) {
            console.log('obj');
            const checkAt = Date.now()

            let reactions = {
                haha: 0,
                like: 0,
                love: 0,
                wow: 0,
                sad: 0,
                angry: 0
            };
            let comments = null
            let check_error = null;
            let still_alive = true


            // post.checks.push(check);
            // console.log(check);

            if (err) {
                still_alive = false
                check_error = err;
                console.log('post.err', check_error)
            } else {
                if (result.reactions) {
                    reactions = {
                        haha: result.reactions.data.filter(haha => haha.type === 'HAHA').length,
                        like: result.reactions.data.filter(like => like.type === 'LIKE').length,
                        love: result.reactions.data.filter(love => love.type === 'LOVE').length,
                        wow: result.reactions.data.filter(wow => wow.type === 'WOW').length,
                        sad: result.reactions.data.filter(sad => sad.type === 'SAD').length,
                        angry: result.reactions.data.filter(angry => angry.type === 'ANGRY').length
                    }
                }
                if (result.comments) {
                    comments = result.comments.data;
                    console.log(post.id)

                }
            }
            var update = {
                checkAt,
                reactions,
                comments,
                check_error,
                still_alive
            }
            console.log(post.id, update)
            FacebookPost.findOneAndUpdate({postId: post.postId}, update)
                .then(() => resolve({update}))
                .catch(err => reject({err: err}))

        })
    })

}

function keygen() {

    const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ' // chars that can be safely used in urls
    const keylen = 6

    let key = ''
    for (let i = 0; i < keylen; i += 1) {
        key += alphabet[_.random(0, alphabet.length - 1)]
    }
    return key
}

function addTrackingEmail(notiId, url = 'https://firebasestorage.googleapis.com/v0/b/jobo-b8204.appspot.com/o/images%2Fjobo.png?alt=media&token=7c84f5ce-606d-4f18-a85b-177839349566', t = 'o', p = 'l', i = '') {
    var trackUrl = ''
    var platform = configP[p]
    var type = configT[t]
    var urlId = ''

    if (i.length > 0) {
        urlId = notiId + ':' + p + ':' + t + ':' + i
    } else {
        urlId = notiId + ':' + p + ':' + t
    }
    joboPxl.database().ref('/links/' + urlId)
        .update({
            url,
            linkId: notiId,
            platform,
            type
        })
    console.log();
    if (t == 'o') {
        trackUrl = CONFIG.AnaURL + '/l/' + urlId
    } else {
        trackUrl = CONFIG.WEBURL + '/l/' + urlId
    }
    console.log('url', trackUrl)
    return trackUrl

}

function findLink(queryString) {
    return new Promise((resolve, reject) => {
        joboPxl.database().ref('/links')
            .child(queryString)
            .once('value')
            .then(link => {
                if (link.val()) {
                    resolve(link.val());
                } else {
                    console.log('link not found');
                    reject({err: 'link not found'});
                }
            })
            .catch(err => {
                console.log(err);
                reject(err);
            });
    });
}

function tracking(notiId, platform, url, type = 'open') {
    return new Promise((resolve, reject) => {
        var data = {}
        data[platform + '_' + type] = Date.now()
        console.log(data)

        notificationCol.updateOne({notiId}, {$set: data})
            .then(() => resolve({notiId, url}))
            .catch(err => {
                reject(err);
            });
    });
}

app.get('/messengerRead', function (req, res) {
    var {senderID} = req.query
    var pipeline = {
        'userData.messengerId': senderID,
        'time': {$lt: Date.now()},
        'messenger_open': null
    }
    notificationCol.find(pipeline).toArray(notis => {
        var map = _.map(notis, noti => {
            notificationCol.findOneAndUpdate({notiId: noti.notiId}, {
                $set: {messenger_open: Date.now()}
            }).then(result => console.log({code: 'success', notiId: noti.notiId}))
            return noti
        })
        res.send(map)
    })

})

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
    return shorturl;
}

String.prototype.getLink = function () {
    var text = this.replace(/"/gi, "'");
    var link = (/(<a\s+(?:[^>]*?\s+)?href=')([^']*)(')|(<a\s+(?:[^>]*?\s+)?href=")([^"]*)(")/ig).exec(text) ? (/(<a\s+(?:[^>]*?\s+)?href=')([^']*)(')|(<a\s+(?:[^>]*?\s+)?href=")([^"]*)(")/ig).exec(text)[2] : null;
    return link;
}

function trackingTemplate(html, postId) {
    if (html.length > 0) {
        const atags = html.match(/(<a\s+(?:[^>]*?\s+)?href=')([^']*)(')|(<a\s+(?:[^>]*?\s+)?href=")([^"]*)(")/ig);
        let i = 0;
        console.log(html);
        if (!atags) return html;

        atags.forEach(atag => {
            const link = atag.getLink();
            console.log(link);
            const tracking = addTrackingEmail(postId, link, 'c', `l`, i++);
            // const tracking = shortenURL(link, `${postId}cl${i++}`);
            html = html.replace(link, tracking);
            // return Promise.resolve(link);
        });
        return html;
    }
}

function replaceN(html) {
    if (html.length > 0) {
        html = html.replace(/\n/g, "<br />");

        return html;
    }
}


function sendEmailTemplate(email, mail, notiId) {
    return new Promise((resolve, reject) => {
        var card = {}

        var header = `<div>`;
        // <img src="${addTrackingEmail(notiId)}"/>
        var footer = '</div>';


        var image = '   <img alt="" title="" height="auto" src="' + mail.image + '" style="border:none;border-radius:0px;display:block;font-size:13px;outline:none;text-decoration:none;width:100%;height:auto;" width="550">';


        var button = '<a href="' + addTrackingEmail(notiId, mail.linktoaction, 'c', 'l') + '" style="color:#1FBDF1" target="_blank"> ' + mail.calltoaction + '</a>'

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


        var htmlMail = '';
        if (mail.description1) {
            htmlMail = htmlMail + header + mail.description1 + '<br>'
        }
        if (mail.image) {
            htmlMail = htmlMail + image + '<br>'
        }

        if (mail.description2) {
            htmlMail = htmlMail + mail.description2 + '<br>'
        }
        if (mail.linktoaction) {
            htmlMail = htmlMail + button + '<br>'

        }
        if (mail.description3) {
            htmlMail = htmlMail + mail.description3 + '<br>'
        }

        if (mail.data) {
            htmlMail = htmlMail + card_header
            for (var i in mail.data) {

                var card = mail.data[i]
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
            htmlMail = htmlMail + mail.description4 + '<br>'
        }

        htmlMail = htmlMail + footer

        var html = replaceN(htmlMail)

        // htmlMail = htmlMail + footer + `<hr><p style="text-align: right;"><span style="color: rgb(204, 204, 204); font-size: 10px;"><a href="${CONFIG.WEBURL}/unsubscribe?id=${notiId}?email=${email}" rel="noopener noreferrer" style="text-decoration:none; color: rgb(204, 204, 204);" target="_blank">Từ chối nhận thư</a></span></p>`;

        sendEmail(email, mail, html, notiId)
            .then(notiId => resolve(notiId))
            .catch(err => reject(err));
    });
}

function startSend(userData, mail, channel, notiId) {
    return new Promise((sResolve, sReject) => {
        console.log('startSend', notiId, mail.title);

        var description = _.template(mail.description1);
        mail.description1 = description({name: userData.name});
        const sendEmailTempPromise = new Promise((resolve, reject) => {
            if (userData.email && !userData.unsubscribe && userData.wrongEmail != true && channel.letter && userData.email.match(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)) {
                sendEmailTemplate(userData.email, mail, notiId)
                    .then(notiId => resolve({
                        notiId,
                        letter: true
                    }))
                    .catch(err => {
                        console.log('err', err);
                        resolve({notiId, letter: false, err})
                    });
            } else resolve({notiId, letter: false});
        });

        const sendNotificationToGivenUserWeb = new Promise((resolve, reject) => {
            if (userData.webToken && channel.web) {
                sendNotificationToGivenUser(userData.webToken, mail, 'web', notiId).then(notiId => resolve({
                    notiId,
                    web: true
                })).catch(err => resolve({notiId, web: false, err}));
            } else resolve({notiId, web: false});

        });

        const sendNotificationToGivenUserApp = new Promise((resolve, reject) => {
            if (userData.mobileToken && channel.mobile) {
                sendNotificationToGivenUser(userData.mobileToken, mail, 'app', notiId).then(notiId => resolve({
                    notiId,
                    mobile: true
                })).catch(err => resolve({notiId, mobile: false, err}));
            } else resolve({notiId, mobile: false});

        });

        const sendMessengerPromise = new Promise((resolve, reject) => {
            if (userData.messengerId && channel.messenger) {
                sendMessenger(userData.messengerId, mail, notiId, userData.pageID)
                    .then(notiId => resolve({
                        notiId,
                        messenger: true
                    }))
                    .catch(err => resolve({notiId, messenger: false, err}));
            } else resolve({notiId, messenger: false});
        });

        Promise.all([
            sendEmailTempPromise,
            sendNotificationToGivenUserWeb,
            sendNotificationToGivenUserApp,
            sendMessengerPromise
        ])
            .then(array => sResolve(array))
            .catch(err => sReject(err));
    });
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

function sendMessenger(messengerId, noti, key, pageID) {
    return new Promise((resolve, reject) => {
        var url = 'https://jobo-chat.herokuapp.com/noti';
        var text = `${(noti.title) ? noti.title : ' '}\n ${noti.body}`
        if (noti.payload) {

            var message = noti.payload

        } else if (noti.linktoaction) {
            message = {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "button",
                        text,
                        buttons: [{
                            type: "web_url",
                            url: noti.linktoaction,
                            title: noti.calltoaction
                        }]
                    }
                }
            }
        } else {
            message = {text}
        }

        var param = {
            message,
            recipientId: messengerId,

        };
        if (pageID) param.pageID = pageID

        axios.post(url, param)
            .then(function () {
                console.log('messenger sent:' + key)
                notificationCol.updateOne({notiId: key}, {$set: {messenger_sent: Date.now()}})
                    .then(() => resolve(key))
                    .catch(function (error) {
                        console.log(error);
                    });
            })
            .then(() => resolve(key))
            .catch(function (error) {

                reject(error);
            });

    });
}

function sendNotificationToGivenUser(registrationToken, noti, type, key) {
    return new Promise((resolve, reject) => {
        var payload = {
            notification: {
                title: noti.title,
                body: noti.body || ''
            },
            data: {
                linktoaction: addTrackingEmail(key, noti.linktoaction, 'c', 'm') || ''
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
                if (response.successCount == 1 && type && key) {
                    var data = {}
                    data[type + '_sent'] = Date.now()
                    return notificationCol.updateOne({notiId: key}, {$set: data})
                }
            })
            .then(function () {
                console.log(type + ' sent', key);
                resolve(key)
            })
            .catch(function (error) {
                console.log("Error sending message:", error);
                reject(error);
            });
    });
}


app.post('/newPost', (req, res, next) => {
    const post = req.body;

    if (!post) res.status(403).json('Facebook post data is required');
    if (!post.postId) post.postId = mongoose.Types.ObjectId();
    const mgPost = new FacebookPost(post)
    mgPost.save()
        .then(post => {
            if (post.time > Date.now() && post.time < Date.now() + 60000) {
                console.log('facebook', b++);
                let promise = Promise.resolve(Object.assign({}, post, {schedule: true}));
                schedule.scheduleJob(post.time, function () {
                    promise = PublishFacebook(post.to, post.content, post.poster, post.postId, post.channel)
                });
                return promise;
            }
        })
        .then(schedulePost => res.status(200).json(schedulePost))
        .catch(err => res.status(500).json(err));
});


function addShortLinkFBPost(postId, text) {
    const link = text.match(/https:\/\/.*\$primary/g)[0].replace(/\$primary/g, '');
    console.log(link);
    if (link) {
        text = text.replace(/https:\/\/.*\$primary/g, addTrackingEmail(postId, link, 'c', 'f'));
    }
    return text;
}

app.get('/PublishWall', function (req, res) {
    let {message, poster} = req.query

    var content = {text: message}
    PublishWall(content, poster).then(result => res.send(result))
        .catch(err => res.status(500).json(err))

})

function PublishWall(content, poster, postId) {
    return new Promise((resolve, reject) => {

        console.log('scheduleJob_PublishFacebook_run', poster, postId)
        var accessToken = facebookAccount[poster].access_token
        if (content && accessToken) {
            var url = "feed?access_token=" + accessToken
            var params = {"message": content.text}

            if (content.type == 'image') {
                url = "photos?access_token=" + accessToken
                params = {
                    "url": content.image,
                    "caption": content.text
                }
            }
            graph.post(url, params,
                function (err, res) {
                    // returns the post id
                    if (err) {

                        console.log(err.message, poster);

                        reject(err)
                    } else {
                        resolve(res)
                    }
                });
        }
    });
}

function PublishFacebook(to, content, poster, postId, channel = {}) {
    return new Promise((resolve, reject) => {
        a++
        console.log('scheduleJob_PublishFacebook_run', to, poster, postId)
        var accessToken = facebookAccount[poster].access_token
        if (to && content && accessToken) {
            var url = to + "/feed?access_token=" + accessToken
            var url2 = "feed?access_token=" + accessToken
            var url_page = "385066561884380/feed?access_token=" + CONFIG.publishPageAT

            var params = {"message": content.text}

            if (content.type == 'image') {
                url = to + "/photos?access_token=" + accessToken
                url2 = "photos?access_token=" + accessToken
                url_page = "385066561884380/photos?access_token=" + CONFIG.publishPageAT

                params = {
                    "url": content.image,
                    "caption": content.text
                }
            }
            graph.post(url, params,
                function (err, res) {
                    // returns the post id
                    if (err) {

                        console.log(err.message, to, poster);

                        FacebookPost.findOneAndUpdate({postId}, {
                            sent_error: err.message
                        }, {new: true})
                            .then(updatedPost => resolve(updatedPost))
                            .catch(err => reject(err));
                    } else {
                        var id = res.id;
                        console.log(id);
                        var still_alive = true

                        FacebookPost.findOneAndUpdate({postId}, {id, still_alive, sent: Date.now()}, {new: true})
                            .then(updatedPost => resolve(updatedPost))
                            .catch(err => reject(err));
                    }
                });
            console.log('channel', channel);

            if (channel.wall) {
                console.log('wallpost');

                graph.post(url2, params,
                    function (err, res) {
                        // returns the post id
                        if (err) {

                            console.log(err.message, to, poster);
                            FacebookPost.findOneAndUpdate({postId}, {
                                wall_error: err.message
                            }, {new: true})
                                .then(updatedPost => resolve(updatedPost))
                                .catch(err => reject(err));
                        } else {
                            var wall_id = res.id;

                            console.log(wall_id);
                            FacebookPost.findOneAndUpdate({postId}, {wall_id}, {new: true})
                                .then(updatedPost => resolve(updatedPost))
                                .catch(err => reject(err));


                        }
                    });
            }
            if (channel.page) {
                console.log('pagePost');

                graph.post(url_page, params,
                    function (err, res) {
                        // returns the post id
                        if (err) {

                            console.log(err.message, to, poster);
                            FacebookPost.findOneAndUpdate({postId}, {
                                page_error: err.message
                            }, {new: true})
                                .then(updatedPost => resolve(updatedPost))
                                .catch(err => reject(err));
                        } else {
                            var page_id = res.id;

                            console.log(page_id);
                            FacebookPost.findOneAndUpdate({postId}, {page_id}, {new: true})
                                .then(updatedPost => resolve(updatedPost))
                                .catch(err => reject(err));


                        }
                    }
                );
            }
        }
    });
}

function PublishPost(userId, text, accessToken) {
    if (userId && text && accessToken) {
        graph.post(userId + "/feed?access_token=" + accessToken, {
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

        graph.post(userId + "/photos?access_token=" + accessToken, {
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
        graph.post(postId + "/comments?access_token=" + accessToken, {
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
    var dLat = deg2rad(Number(lat2) - Number(lat1)); // deg2rad below
    var dLon = deg2rad(Number(lon2) - Number(lon1));
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
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
function getLongLiveToken(shortLiveToken) {
    return new Promise((resolve, reject) => {
        const url = `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=295208480879128&client_secret=4450decf6ea88c391f4100b5740792ae&fb_exchange_token=${shortLiveToken}`;
        axios.get(url)
            .then(res => resolve(res.data))
            .catch(err => {
                reject(err.response);
            });
    });
}

function getCodeRedeem(longLiveToken, debug) {
    return new Promise((resolve, reject) => {
        const url = `https://graph.facebook.com/oauth/client_code?access_token=${longLiveToken}&client_id=295208480879128&client_secret=4450decf6ea88c391f4100b5740792ae&redirect_uri=https%3A%2F%2Fjoboapp.com`;
        axios.get(url)
            .then(res => {
                let result = {};
                if (debug) result = Object.assign({}, debug, {code: res.data.code});
                else result = res.data;
                resolve(result);
            })
            .catch(err => {
                let result = {};
                if (debug) result = Object.assign({}, debug, {err: err.response});
                else result = err.response;
                reject(result);
            });
    });
}

function redeemToken(redeemCode, redeem) {
    return new Promise((resolve, reject) => {
        const url = `https://graph.facebook.com/oauth/access_token?code=${redeemCode}&client_id=295208480879128&redirect_uri=https%3A%2F%2Fjoboapp.com`;
        axios.get(url)
            .then(res => {
                let result = {};
                if (redeem) result = Object.assign({}, redeem, {access_token: res.data.access_token});
                else result = res.data;
                resolve(result);
            })
            .catch(err => {
                let result = {};
                if (redeem) result = Object.assign({}, redeem, {err: err.response});
                else result = err.response;
                reject(result);
            });
    });
}

function debugToken(longLiveToken, key, token) {
    return new Promise((resolve, reject) => {
        const appToken = '295208480879128|pavmPhKnN9VWZXLC6TdxLxoYFiY'
        const url = `https://graph.facebook.com/debug_token?input_token=${longLiveToken}&access_token=${appToken}`;

        axios.get(url)
            .then(res => {
                let result = {};
                if (key) result = Object.assign({}, {data: res.data}, {key, token});
                else result = res.data;
                resolve(result)
            })
            .catch(err => {
                let result = {};
                if (key) result = Object.assign({}, {err: err.response}, {key, token});
                else result = err.response;
                resolve(result);
            });

    });
}

function newToken(shortLiveToken) {
    return new Promise((resolve, reject) => {
        getLongLiveToken(shortLiveToken)
            .then(data => getCodeRedeem(data.access_token))
            .then(data => redeemToken(data.code))
            .then(data => resolve(data))
            .catch(err => reject(err));
    });
}


function checkAndUpdateToken(expiredDate = 5) {
    return new Promise((resolve, reject) => {
        let debugTokens = {};
        configRef.child('facebookAccount').once('value')
            .then(_tokens => {
                const tokens = _tokens.val();
                debugTokens = tokens;
                return Promise.all(Object.keys(tokens).map(key => debugToken(tokens[key].access_token, key, tokens[key].access_token)));
            })
            .then(debugs => {
                return Promise.all(debugs.map(debug => {
                    if (debug.data && debug.data.expires_at && ((parseInt(debug.data.expires_at) - Date.now() / 1000) / 24 / 60 / 60 <= expiredDate)) {
                        return getCodeRedeem(debug.token, debug);
                    } else return Promise.resolve(debug);
                }));
            })
            .then(redeems => {
                return Promise.all(redeems.map(redeem => {
                    if (redeem.code) return redeemToken(redeem.code, redeem);
                    else return Promise.resolve(redeem);
                }));
            })
            .then(newTokens => {
                return Promise.all(newTokens.map(newToken => {
                    if (newToken.access_token) return configRef.child('facebookAccount').child(newToken.key).update({access_token: newToken.access_token});
                    else return Promise.resolve(newToken);
                }));
            })
            .then(data => resolve(data))
            .catch(err => reject(err));
    });
}

app.get('/token', (req, res, next) => {
    const {expiredDate} = req.query;
    checkAndUpdateToken(expiredDate)
        .then(tokens => res.status(200).json(tokens))
        .catch(err => {
            console.log(err);
            res.send(err);
        });
})

app.get('/fbLLiveToken', (req, res, next) => {
    const {accessToken, key, area = 'hcm', userId = 'thonglk'} = req.query;
    getLongLiveToken(accessToken)
        .then(data => {
            configRef.child('facebookAccount').child(key).update({access_token: data.access_token, key, area, userId})
                .then(() => res.json(data))
        })
        .catch(err => res.status(err.status).json(err.data));
});

app.get('/fbRedeemCode', (req, res, next) => {
    const {accessToken} = req.query;
    getCodeRedeem(accessToken)
        .then(data => res.status(200).json(data))
        .catch(err => res.status(err.status).json(err.data));
});

app.get('/fbRedeemToken', (req, res, next) => {
    const {accessToken} = req.query;
    redeemToken(accessToken)
        .then(data => res.status(200).json(data))
        .catch(err => res.status(err.status).json(err.data));
});

app.get('/fbDebugToken', (req, res, next) => {
    const {accessToken} = req.query;
    debugToken(accessToken)
        .then(data => res.status(200).json(data))
        .catch(err => res.status(err.status).json(err.data));
});

app.get('/fbNewToken', (req, res, next) => {
    const {accessToken} = req.query;
    newToken(accessToken)
        .then(data => res.status(200).json(data))
        .catch(err => res.status(err.status).json(err.data));
});

// start the server
http.createServer(app).listen(port);
https.createServer(credentials, app).listen(443);

console.log('Server started!', port);


String.prototype.simplify = function () {
    return this.toLowerCase()
        .replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a")
        .replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e")
        .replace(/ì|í|ị|ỉ|ĩ/g, "i")
        .replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o")
        .replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u")
        .replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y")
        .replace(/đ/g, "d")
        .replace(/^\-+|\-+$/g, "")
        .replace(/\s/g, '-');
};
const vietnameseDecode = (str) => {
    console.log('vietnameseDecode', str)
    if (str) {
        str = str.toLowerCase();
        str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
        str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
        str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
        str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
        str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
        str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
        str = str.replace(/đ/g, "d");
        str = str.replace(/!|@|%|\^|\*|\(|\)|\+|\=|\<|\>|\?|\/|,|\.|\:|\;|\'| |\"|\&|\#|\[|\]|~|$|_/g, "-");
        /* tìm và thay thế các kí tự đặc biệt trong chuỗi sang kí tự - */
        str = str.replace(/-+-/g, "-"); //thay thế 2- thành 1-
        str = str.replace(/^\-+|\-+$/g, "");
        //cắt bỏ ký tự - ở đầu và cuối chuỗi
        return str;
    }

}


let google = require('googleapis');
let authentication = require("./google_auth");
var auth;
var drive;
var sheets;

authentication.authenticate().then(auth => {
    console.log('auth', auth)
    drive = google.drive({
        version: 'v2',
        auth: auth
    });
    sheets = google.sheets({
        version: 'v4',
        auth: auth
    });
});

function getData(auth, spreadsheetId = '1mVEDpJKiDsRfS7bpvimL7OZQyhYtu_v44hzPUcG14Vk', range = 'reataurant', query) {
    return new Promise((resolve, reject) => {
        sheets.spreadsheets.values.get({
            spreadsheetId,
            range, //Change Sheet1 if your worksheet's name is something else
        }, (err, response) => {
            if (err) {
                console.log('The API returned an error: ' + err);
                reject(err);
            }
            var rows = response.values;
            resolve({spreadsheetId, range, query, data: getDataToObj(rows, query)});
        });
    });
}


function getDataToObj(rows, query) {
    var firstRow = rows[0]
    var queryVi = vietnameseDecode(query)
    rows.shift()

    if (query) rows = _.filter(rows, row => {
        if (vietnameseDecode(JSON.stringify(row)).match(queryVi)) return true
        else return false
    })

    var array = rows.map(row => {
        var newRow = {}
        for (var i in firstRow) {
            newRow[firstRow[i]] = row[i]
        }
        return newRow
    })

    return array

}

app.get('/getData', ({query}, res) => getData(auth, query.spreadsheetId, query.range, query.search).then(rows => res.send(rows)).catch(err => res.status(500).json(err)))

function clearData(auth, spreadsheetId, range) {
    return new Promise((resolve, reject) => {
        sheets.spreadsheets.values.clear({
            spreadsheetId,
            range
        }, (err, response) => {
            if (err) {
                console.log('The API returned an error: ' + err);
                reject(err);
            } else {
                console.log("Clear");
                resolve(response);
            }
        });
    });
}

function appendData(auth, spreadsheetId, range, values) {
    return new Promise((resolve, reject) => {
        sheets.spreadsheets.values.append({
            spreadsheetId,
            range, //Change Sheet1 if your worksheet's name is something else
            valueInputOption: "USER_ENTERED",
            resource: {
                values
            }
        }, (err, response) => {
            if (err) {
                console.log('The API returned an error: ' + err);
                resolve(err);
            } else {
                console.log("Appended");
                resolve({response, values});
            }
        });
    });
}

function addSheet(auth, spreadsheetUrl, title, sheets) {
    return new Promise((resolve, reject) => {
        var _sheets = google.sheets('v4');
        _sheets.spreadsheets.create({
            auth: auth,
            resource: {
                sheets,
                properties: {
                    title
                },
            }
        }, (err, response) => {
            if (err) {
                console.log('The API returned an error: ' + err);
                reject(err);
            } else {
                console.log("Added", response);
                resolve(response);
            }
        });
    });
}


app.get('/fbReports', (req, res, next) => {
    FacebookPost.find({id: {$ne: null}})
        .then(posts => {
            return Promise.all(posts.map(post => {
                const url = 'https://www.facebook.com';
                let checksArr = [];

                if (_.isEmpty(post.checks)) checksArr = ["", "", "", "", "", "", "", ""];
                else {
                    const comments = post.checks[0].comments ? post.checks[0].comments : "";
                    const at = post.checks[0].at ? post.checks[0].at : "";
                    const err = post.checks[0].error ? post.checks[0].error.message : null;
                    const reactions = post.checks[0].reactions ? post.checks[0].reactions : {};

                    if (err) checksArr = [err, "", "", "", "", "", "", new Date(at).toLocaleString()];
                    else checksArr = [comments, reactions.angry, reactions.sad, reactions.wow, reactions.love, reactions.like, reactions.haha, new Date(at).toLocaleString()];
                }

                return [post.postId, `${url}/${post.id}`, post.poster, post.storeId, post.jobId, `${url}/groups/${post.to}`, new Date(post.sent).toLocaleString(), post.sent_error, post.content.text, post.content.link, post.content.image, ...checksArr, post._id, post.createdAt, post.updatedAt, new Date(post.time).toLocaleString()];
            }));
        })
        .then(posts => {
            const values = [];
            const head_1 = ["postId", "url", "poster", "storeId", "jobId", "group", "sent at", "sent_error", "content", "", "", "checks", "", "", "", "", "", "", "", "_id", "createdAt", "updatedAt", "time"];
            const head_2 = ["", "", "", "", "", "", "", "", "text", "link", "image", "comments", "reactions", "at", "", "", "", ""];
            const head_3 = ["", "", "", "", "", "", "", "", "", "", "", "", "angry", "sad", "wow", "love", "like", "haha", "", "", "", "", ""];
            values.push(head_1, head_2, head_3);
            values.push(...posts);
            const spreadsheetId = '1UhQOhor7IbcgJO-O-2Qr8pYedif360V6D4od970673E';
            const range = 'facebook_post!A1:B';
            clearData(auth, spreadsheetId, range);
            appendData(auth, spreadsheetId, range, values);
            res.json('done'); //W
        })
        .catch(err => res.send(err));
});


const profileRouter = express.Router({mergeParams: true});

app.route('/profile/export')
    .get((req, res, next) => {

        var query = req.query
        query.all = true
        exportProfile(query)
            .then(data => res.json(data))
            .catch(err => res.send(`Err: ${JSON.stringify(err)}`));
    });
app.route('/profile/import')
    .post((req, res, next) => {
        const {userId, createdAt, name, school, address, avatar, birth, weight, working_type, time, industry, description, expect_distance, expect_salary, experience, figure, height, job, languages, videourl, photo, note, date} = req.body;
        const spreadsheetId = '1mVEDpJKiDsRfS7bpvimL7OZQyhYtu_v44hzPUcG14Vk';
        const range = 'profileCOL!A3:B';
        importProfile({
            userId,
            createdAt,
            name,
            school,
            address,
            avatar,
            birth,
            weight,
            working_type,
            time,
            industry,
            description,
            expect_distance,
            expect_salary,
            experience,
            figure,
            height,
            job,
            languages,
            videourl,
            photo,
            note,
            date
        })
            .then(values => appendData(auth, spreadsheetId, range, values))
            .then(result => res.status(200).json(result))
            .catch(err => res.status(500).send(err));
    });

function exportProfile(query) {
    return new Promise((resolve, reject) => {

        axios.get(CONFIG.APIURL + '/api/users', {params: query})
            .then(result => {
                console.log('result.data', result.data.length)
                return Promise.resolve(result.data)
            })
            .then(profiles => {
                return Promise.resolve(profiles.map(profile => {
                    const userId = `https://jobo.asia/view/profile/${profile.userId}`;
                    let email = profile.email || '';
                    let phone = profile.phone || '';
                    let experience = '';
                    let time = '';
                    let languages = '';
                    let job = '';
                    let industry = '';
                    let photo = '';
                    let note = '';
                    let date = '';

                    if (profile.photo != '' && profile.photo) {
                        profile.photo.forEach(url => photo += `${url}\n`);
                    }
                    if (profile.industry != '' && profile.industry) {
                        Object.keys(profile.industry).forEach(key => industry += `${key}, `);
                    }
                    if (profile.job != '' && profile.job) {
                        Object.keys(profile.job).forEach(key => job += `${key}, `);
                    }
                    if (profile.experience != '' && profile.experience) {
                        _.toArray(profile.experience).forEach(_experience => {
                            experience += `
            Company: ${_experience.company}
            Job: ${_experience.job}
            Start: ${new Date(_experience.start).toLocaleString()}
            End: ${new Date(_experience.end).toLocaleString()}
            `;
                        });
                    }
                    if (profile.time != '' && profile.time) {
                        Object.keys(profile.time).forEach(key => {
                            time += `${key}, `;
                        });
                    }
                    if (profile.languages != '' && profile.languages) {
                        Object.keys(profile.languages).forEach(key => {
                            languages += `${key}, `;
                        });
                    }
                    if (profile.adminNote) {
                        _.toArray(profile.adminNote).forEach(adminNote => {
                            note += `\nAdmin: ${adminNote.adminId}\nProfile: https://jobo.asia/view/profile/${adminNote.adminId}\nNote: ${adminNote.note}\n`;
                            date += `\n\n${new Date(adminNote.date).toLocaleString()}\n\n`;
                        });
                    }
                    return [userId, email, phone, new Date(profile.createdAt).toLocaleString(), profile.name, profile.school, profile.address, profile.avatar, new Date(profile.birth).toLocaleString(), profile.weight, profile.working_type, time, industry, profile.description, profile.expect_distance, profile.expect_salary, experience, profile.figure, profile.height, job, languages, profile.videourl, photo, note, date];
                }));
            })
            .then(values => {
                const spreadsheetId = '1mVEDpJKiDsRfS7bpvimL7OZQyhYtu_v44hzPUcG14Vk';
                const range = 'profileCOL!A3:B';
                clearData(auth, spreadsheetId, range)
                    .then(res => {
                        appendData(auth, spreadsheetId, range, values.filter(value => value.length > 0))
                            .then(response => resolve({response, values}));
                    });
            })
            .catch(err => {
                console.log('Export profile Err:', err);
                reject(err);
            });
    });
}

function importProfile(profile) {
    return new Promise((resolve, reject) => {
        const userId = `https://jobo.asia/view/profile/${profile.userId}`;
        let experience = '';
        let time = '';
        let languages = '';
        let job = '';
        let industry = '';
        let photo = '';
        let note = '';
        let date = '';

        if (profile.photo != '' && profile.photo) {
            profile.photo.forEach(url => photo += `${url}\n`);
        }
        if (profile.industry != '' && profile.industry) {
            Object.keys(profile.industry).forEach(key => industry += `${key}, `);
        }
        if (profile.job != '' && profile.job) {
            Object.keys(profile.job).forEach(key => job += `${key}, `);
        }
        if (profile.experience != '' && profile.experience) {
            _.toArray(profile.experience).forEach(_experience => {
                experience += `
            Company: ${_experience.company}
            Job: ${_experience.job}
            Start: ${new Date(_experience.start).toLocaleString()}
            End: ${new Date(_experience.end).toLocaleString()}
            `;
            });
        }
        if (profile.time != '' && profile.time) {
            Object.keys(profile.time).forEach(key => {
                time += `${key}, `;
            });
        }
        if (profile.languages != '' && profile.languages) {
            Object.keys(profile.languages).forEach(key => {
                languages += `${key}, `;
            });
        }
        if (profile.adminNote) {
            _.toArray(profile.adminNote).forEach(adminNote => {
                note += `\nAdmin: ${adminNote.adminId}\nProfile: https://jobo.asia/view/profile/${adminNote.adminId}\nNote: ${adminNote.note}\n`;
                date += `\n\n${new Date(adminNote.date).toLocaleString()}\n\n`;
            });
        }

        resolve([
            [userId, new Date(profile.createdAt).toLocaleString(), profile.name, profile.school, profile.address, profile.avatar, new Date(profile.birth).toLocaleString(), profile.weight, profile.working_type, time, industry, profile.description, profile.expect_distance, profile.expect_salary, experience, profile.figure, profile.height, job, languages, profile.videourl, photo, note, date]
        ]);
    });
}

profileRouter.route('/collection')
    .get((req, res, next) => {
        const spreadsheetId = '1mVEDpJKiDsRfS7bpvimL7OZQyhYtu_v44hzPUcG14Vk';
        const range = 'New_Profile!A2:E';
        getData(auth, spreadsheetId, range)
            .then(rows => {
                return Promise.all(rows.map(row => {
                    const name = row[0];
                    const description = row[1];
                    const phone = row[2];
                    const figure = row[3];
                    const job = row[4];
                    const note = row[5];
                    const ref = row[6];
                    return importCollectionProfile({name, description, phone, figure, job, note, ref});
                }));
            })
            .then(results => res.status(200).json(results))
            .catch(err => res.status(500).send(err));
    });

function importCollectionProfile({name, description, phone, figure, job, note, ref}) {
    return new Promise((resolve, reject) => {
        const collectionProfileRef = db.ref('collectionProfile');
        const jobField = {};
        job.replace(/\s/g, '').split(',').filter(key => key != '').forEach(key => {
            jobField[key] = true;
        });
        const adminNote = {};
        const notId = `p${Date.now()}${_.random(0, 9)}`;
        adminNote[notId] = {
            adminId: ref || 'hpthao',
            date: Date.now(),
            id: notId,
            note
        };

        const key = collectionProfileRef.push().key;
        collectionProfileRef.child(key).update({
            userId: key,
            createdAt: Date.now(),
            name,
            description,
            phone,
            figure,
            job: jobField,
            adminNote,
            ref
        })
            .then(() => resolve(true))
            .catch(err => resolve({name, err}));
    });
}

app.use('/profile', profileRouter);

const storeRouter = express.Router({mergeParams: true});

storeRouter.route('/export')
    .get((req, res, next) => {
        exportStore()
            .then(resp => res.json(resp))
            .catch(err => res.send(err));
    });
storeRouter.route('/import')
    .post((req, res, next) => {
        const {storeId = '=Row()-3', type, incharge = 'thaohp', storeName = null, address = null, name, phone, email, job, industry, ref, adminNote} = req.body;
        importStore({storeId, type, incharge, storeName, address, name, phone, email, job, industry, ref, adminNote})
            .then(values => res.status(200).json(values))
            .catch(err => res.status(500).send(err));
    });

function exportStore() {
    return new Promise((resolve, reject) => {
        storeRef.orderByChild('createdBy').once('value')
            .then(stores => {
                console.log(stores.val());
                return Promise.all(_.toArray(stores.val()).map(store => {
                    let values = [];
                    return userRef.child(store.createdBy).once('value').then(_user => {
                        const user = _user.val();
                        if (!user) return Promise.resolve([]);
                        const incharge = user.incharge || '';
                        const storeName = store.storeName || '';
                        const address = store.address || '';
                        const name = user.name || '';
                        const phone = user.phone || '';
                        const email = user.email || '';
                        let job = '';
                        if (store.job) Object.keys(store.job).forEach(key => job += `, ${key}`);
                        const industry = store.industry || '';
                        const ref = user.ref || '';
                        const adminNote = store.adminNote || '';
                        return Promise.resolve([`https://www.jobo.asia/view/store/${store.storeId}`, 'app', incharge, storeName, address, name, phone, email, job, industry, ref, adminNote]);
                    })
                        .catch(err => Promise.resolve([`ERR:`, JSON.stringify(err)]));
                }));
            })
            .then(data => {
                return newStore({}, data.filter(d => d.length > 0));
            })
            .then(res => {
                console.log(res);
                resolve(res);
            })
            .catch(err => reject(err));
    });
}

function newStore({storeId = '=Row()-3', type, incharge = 'thaohp', storeName = null, address = null, name, phone, email, job, industry, ref, adminNote}, values) {
    return new Promise((resolve, reject) => {
        const spreadsheetId = '1mVEDpJKiDsRfS7bpvimL7OZQyhYtu_v44hzPUcG14Vk';
        const range = 'StoreCOL!A4:B';
        const hyperLink = (link, caption) => `=HYPERLINK("${link}";"${caption}")`;
        if (!values) values = [
            [storeId, incharge, storeName, address, name, phone, email, job, industry, ref, adminNote]
        ];
        clearData(auth, spreadsheetId, range)
            .then(() => appendData(auth, spreadsheetId, range, values))
            .then(res => resolve(values))
            .catch(err => resolve(err));
    });
}

function importStore({storeId = '=Row()-3', type, incharge = 'thaohp', storeName = null, address = null, name, phone, email, job, industry, ref, adminNote}) {
    return new Promise((resolve, reject) => {
        const spreadsheetId = '1mVEDpJKiDsRfS7bpvimL7OZQyhYtu_v44hzPUcG14Vk';
        const range = 'StoreCOL!A4:B';
        let _job = '';
        if (job) Object.keys(job).forEach(key => _job += `, ${key}`);
        const values = [
            [`https://www.jobo.asia/view/store/${storeId}`, 'app', incharge, storeName, address, name, phone, email, _job, industry, ref, adminNote]
        ];
        appendData(auth, spreadsheetId, range, values)
            .then(res => resolve(values))
            .catch(err => resolve(err));
    });
}

app.use('/store', storeRouter);


function importLead() {
    return new Promise((resolve, reject) => {
        const spreadsheetId = '1mVEDpJKiDsRfS7bpvimL7OZQyhYtu_v44hzPUcG14Vk';
        const range = 'New_LeadCOL!A2:L';

        getData(auth, spreadsheetId, range)
            .then(results => resolve(results))
            .catch(err => reject(err));
    });
}



app.get('/lead/collection', (req, res, next) => {
    importLead()
        .then(leads => {
            return Promise.all(leads.map(lead => {
                var data = {
                    storeId: lead[2].simplify(),
                    userId: lead[1],
                    storeName: lead[2],
                    address: lead[3],
                    name: lead[4],
                    phone: lead[5],
                    email: lead[6],
                    job: lead[7],
                    industry: lead[8],
                    ref: lead[9],
                };
                leadCol.findOne({storeId: data.storeId}, (err, result) => {
                    if (err) return {status: 'err', err};
                    else {
                        if (!result) {
                            leadCol.insertOne(data);
                            return {status: 'new', storeId: data.storeId};
                        } else {
                            leadCol.updateOne({
                                _id: result._id
                            }, data);
                        }
                    }
                })

            }));
        })
        .then(results => res.status(200).json(results))
        .catch(err => {
            console.log(err);
            res.status(500).send(err);
        });
});

app.get('/lead/import', (req, res) => {
    importLead()
        .then(leads => res.status(200).json(leads))
        .catch(err => res.status(500).send(err));
});
app.get('/clearData', (req, res) => {
    const spreadsheetId = '1mVEDpJKiDsRfS7bpvimL7OZQyhYtu_v44hzPUcG14Vk';
    const range = 'LeadCOL!A2:L';

    clearData(auth, spreadsheetId, range)
        .then(values => res.send(values))
        .catch(err => res.send(err));
});


process.on('exit', function (code) {
    //Notification code when application process is killed

    const data = {
        recipientIds: ['1100401513397714', '1460902087301324', '1226124860830528'],
        messages: {
            text: `Ana sập sml rồi: ${code}`
        }
    };
    axios.post('https://jobobot.herokuapp.com/noti', data);
});

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
    //1100401513397714;1460902087301324;1226124860830528
    const data = {
        recipientIds: ['1100401513397714', '1460902087301324', '1226124860830528'],
        messages: {
            text: `Ana sập sml rồi, lỗi uncaughtException: ${err}`
        }
    };
    axios.post('https://jobobot.herokuapp.com/noti', data);
});

app.get('/groupData', (req, res) => {
    res.status(200).json(_.toArray(groupData));
});

app.get('/like/export', (req, res, next) => {
    const spreadsheetId = '1mVEDpJKiDsRfS7bpvimL7OZQyhYtu_v44hzPUcG14Vk';
    const range = 'LikeCOL!A2:J';

    joboTest.database().ref('activity/like').once('value')
        .then(_likes => {
            const likes = _.sortBy(_likes.val(), function (card) {
                return -card.likeAt
            })
            return Promise.all(likes.map(like => {
                return [like.userId, like.storeId, like.employerId, like.userAvatar, like.storeAvatar
                    , like.jobId, like.storeName, like.userName, like.type, new Date(like.likeAt).toLocaleDateString(), like.description, like.interviewTime, like.meet, like.success];
            }));
        })
        .then(values => appendData(auth, spreadsheetId, range, values))
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).send(err));
});


function saveDataToSheet(pageID, spreadsheetId) {
    return new Promise((resolve, reject) => {
        var range = 'users'

        var where = _.where(DATA.account, {pageID})
        var data = _.sortBy(where, function (data) {
            if (data.createdAt) {
                return data.createdAt
            } else return 0
        })
        var firstRow = ['createdAt', 'first_name', 'last_name', 'full_name', 'gender', 'locale', 'mID', 'fbID', 'link', 'lastActive', 'nlp.phone_number', 'nlp.email']

        var map = data.map(per => {
            per = flat(per)
            return [new Date(per.createdAt), per.first_name, per.last_name, per.full_name, per.gender, per.locale, per.id, per.fbId, `https://fb.com${per.link}`, new Date(per.lastActive), per['nlp.phone_number'], per['nlp.email']]
        })
        map.splice(0, 0, firstRow);

        clearData(auth, spreadsheetId, range).then(result => appendData(auth, spreadsheetId, range, map)
            .then(result => resolve(result))
            .catch(err => reject(err)))


    })
}

app.get('/saveDataToSheet', ({query}, res) => saveDataToSheet(query.pageID, query.sheetId).then(result => res.send(result)).catch(err => res.status(500).json(err)))


function listFiles() {
    return new Promise((resolve, reject) => {

        drive.files.list({
            maxResults: 10,
        }, function (err, response) {
            if (err) reject(err);
            resolve(response)
        });
    })
}

app.get('/listFiles', ({query}, res) => listFiles().then(result => res.send(result)).catch(err => res.status(500).json(err)))

function insertPermission(fileId) {
    return new Promise((resolve, reject) => {

        var body = {
            'role': "writer",
            'type': "anyone"
        };
        console.log('insertPermission', fileId)


        drive.permissions.insert({
            'fileId': fileId,
            'resource': body
        }, (err, result) => {
            console.log(err, result)
            if (err) reject(err)
            resolve(result)
        });


    })
}

app.get('/insertPermission', ({query}, res) => insertPermission(query.id).then(result => res.send(result)).catch(err => res.send(err)))

function copyFile(originFileId, copyTitle) {
    return new Promise((resolve, reject) => {

        var body = {'title': copyTitle};
        drive.files.copy({
            'fileId': originFileId,
            'resource': body
        }, (err, result) => {
            if (err) reject(err)
            insertPermission(result.id)
                .then(() => resolve(result))
                .catch(err => reject(err))
        });

    })
}

app.get('/copyFile', ({query}, res) => copyFile(query.id, query.name).then(result => res.send(result)).catch(err => res.status(500).json(err)))
