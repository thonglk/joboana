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
    console.log(err);

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


var mailTransport = nodemailer.createTransport(ses({
    accessKeyId: 'AKIAJHPP64MDOXMXAZRQ',
    secretAccessKey: 'xNzQL2bFyfCg6ZP2XsG8W6em3xiweNQArWUnnADW',
    region: 'us-east-1'
}));

app.use(express.static(__dirname + '/static'));
app.use(cors());
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({extended: true})); // support encoded bodies
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
var joboPxl = firebase.initializeApp({
    credential: firebase.credential.cert('jobo-pxl.json'),
    databaseURL: "https://jobo-pxl.firebaseio.com"
}, 'jobo-pxl');

var joboTest = firebase.initializeApp({
    credential: firebase.credential.cert('jobotest.json'),
    databaseURL: "https://jobotest-15784.firebaseio.com"
}, 'joboTest');


var publishChannel = {
    Jobo: {
        pageId: '385066561884380',
        token: 'EAAEMfZASjMhgBAOWKcfIFZBPvH1OSdZAg2VFH103o0cNimDFg0wxtcSn5E3eaY4C8sDGQYBiaSZAxY8WRpaIj51hB2UfYZAqk3Wd1UiUoc393wgRZBpkiFR1iEGjfb1oE272ZCxkxECLiT1x6UcqYRZCemdpVmt1TnPupJgL8jlcdgZDZD'
    },
};


var db = joboTest.database();
var db2 = joboPxl.database();


var configRef = db.ref('config');
var notificationRef = db2.ref('notihihi')

var dataUser, dataProfile, dataStore, dataJob, dataStatic, likeActivity, dataLog, dataNoti, dataLead, dataEmail, Lang
var groupRef = db.ref('groupData')

var groupData, facebookAccount;
var a = 0,
    b = 0;

var configP = {
    l: 'letter',
    M: 'messenger',
    w: 'web',
    m: 'mobile'
}
var configT = {
    o: 'open',
    c: 'click'
}

function init() {

    groupRef.on('value', function (snap) {
        groupData = snap.val()
    })
    configRef.on('value', function (snap) {
        CONFIG = snap.val()
        facebookAccount = CONFIG.facebookAccount
        var defaut = facebookAccount.thong.access_token
        graph.setAccessToken(defaut);

    })


    var startTime = Date.now();
    var endTime = startTime + 86400 * 1000;
    var a = 0, b = 0;

    notificationRef.on('child_added', function (snap) {
        var noti = snap.val()
        if (noti && noti.time > startTime && noti.time < endTime) {
            console.log('noti', a++);
            schedule.scheduleJob(noti.time, function () {
                console.log('start', noti.time);

                startSend(noti.userData, noti.mail, noti.channel, noti.notiId).then(function (array) {
                    console.log('array', array)
                })
            })
        }
    });

    notificationCol.find({'time': {$gt: startTime, $lt: endTime}}, function (err, notis) {
        notis.forEach(function (noti) {
            console.log('noti', a++);
            schedule.scheduleJob(noti.time, function () {
                console.log('start', noti.time);
                startSend(noti.userData, noti.mail, noti.channel, noti.notiId)
            })
        })
    })


    FacebookPost.find({'time': {$gt: startTime, $lt: endTime}})
        .then(posts => {
            posts.forEach(function (post) {
                console.log('facebook', b++);
                let promise = Promise.resolve(Object.assign({}, post, {schedule: true}));
                schedule.scheduleJob(post.time, function () {
                    promise = PublishFacebook(post.to, post.content, post.poster, post.postId)
                });
                return promise;
            })

        })
}

var sendEmail = (addressTo, mail, emailMarkup, notiId) => {
    return new Promise((resolve, reject) => {
        // setup email data with unicode symbols


        let mailOptions = {
            from: {
                name: mail.name || 'Jobo | Tìm việc nhanh',
                address: mail.address || 'contact@jobo.asia'
            },
            bcc: mail.bcc,
            to: addressTo, // list of receivers
            subject: mail.title, // Subject line
            // text: 'Hello world?', // plain text body
            html: `${emailMarkup}`, // html body
        }
        if (mail.attachments) {
            mailOptions.attachments = [
                {   // filename and content type is derived from path
                    path: 'https://jobo.asia/img/proposal_pricing_included.pdf'
                }
            ]
        }


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
    if (!queryString) res.send('Jobo')
    const notiId = queryString.substr(0, 6)
    const p = queryString[6]
    const t = queryString[7]


    var platform = configP[p]
    var type = configT[t]
    console.log(notiId, platform, type)

    findLink(queryString)
        .then(foundLink => {
            console.log(notiId);
            // return Promise.resolve(foundLink);
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
app.get('/viewFBpost', function (req, res) {
    const {access_token} = req.query;
    if (access_token) graph.setAccessToken(access_token);
    fetchFBPost().then(function (result) {
        res.status(200).json(result);
    }).catch(function (err) {
        res.status(500).send(err);
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
                console.log('obj');
                return Promise.all(posts.map(post => {
                    const check = {
                        at: Date.now()
                    }

                    let reactions = {
                        haha: 0,
                        like: 0,
                        love: 0,
                        wow: 0,
                        sad: 0,
                        angry: 0
                    };

                    let error = null;
                    let comments = 0;

                    if (post.err) {
                        error = post.err;
                    } else if (post.result && post.result.reactions) reactions = {
                        haha: post.result.reactions.data.filter(haha => haha.type === 'HAHA').length,
                        like: post.result.reactions.data.filter(like => like.type === 'LIKE').length,
                        love: post.result.reactions.data.filter(love => love.type === 'LOVE').length,
                        wow: post.result.reactions.data.filter(wow => wow.type === 'WOW').length,
                        sad: post.result.reactions.data.filter(sad => sad.type === 'SAD').length,
                        angry: post.result.reactions.data.filter(angry => angry.type === 'ANGRY').length
                    }
                    else if (post.result && post.result.comments) {
                        comments = post.result.comments.data.length;
                    }

                    if (error) check.error = error;
                    else {
                        check.reactions = reactions;
                        check.comments = comments;
                    }
                    // post.checks.push(check);
                    // console.log(check);
                    return FacebookPost.findByIdAndUpdate(post._id, {$push: {checks: check}}, {new: true});
                    // return post;
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
            if (err) {
                resolve(Object.assign({}, post, {err}));
            } else {
                resolve(Object.assign({}, post, {result}));
            }
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

function addTrackingEmail(notiId, url, t = 'o', p = 'l') {
    if (url) {
        var trackUrl = ''
        var platform = configP[p]
        var type = configT[t]
        joboPxl.database().ref('/links/' + notiId + p + t)
            .update({
                url, linkId: notiId, platform, type
            })
        console.log()
        if (t == 'o') {
            trackUrl = CONFIG.AnaURL + '/l/' + notiId + p + t
        } else {
            trackUrl = CONFIG.WEBURL + '/l/' + notiId + p + t
        }
        console.log('url', trackUrl)
        return trackUrl
    }


}

function findLink(queryString) {
    return new Promise((resolve, reject) => {
        joboPxl.database().ref('/links')
            .child(queryString)
            .once('value')
            .then(link => {
                resolve(link.val());
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

function sendEmailTemplate(email, mail, notiId) {
    return new Promise((resolve, reject) => {
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
            `<img src="${addTrackingEmail(notiId, '/jobo.png', 'o', 'l')}"/>` +
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
            '                        <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w580" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="580"> <div style="text-align:center"><a href="' + addTrackingEmail(notiId, mail.linktoaction, 'c', 'l') + '" style="background: #1FBDF1;background: -webkit-linear-gradient(to left, #1FBDF1, #39DFA5); background: linear-gradient(to left, #1FBDF1, #39DFA5);color:#ffffff;display:inline-block;font-family:sans-serif;font-size:16px;font-weight:bold;line-height:60px;text-align:center;text-decoration:none;width:300px" target="_blank"> ' + mail.calltoaction + '</a></div> </td> </tr>\n' +
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
            '                    <!--[if mso | IE]><table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" style="font-size:1px;margin:0px auto;border-top:1px solid #d4d4d4;width:100%;" width="600"><tr><td style="height:0;line-height:0;"> </td></tr></table><![endif]-->\n' +
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


        var htmlMail = '';
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
        sendEmail(email, mail, htmlMail, notiId)
            .then(notiId => resolve(notiId))
            .catch(err => reject(err));
    });
}

function startSend(userData, mail, channel, notiId) {
    return new Promise((sResolve, sReject) => {
        console.log('startSend', notiId, mail.title);

        const sendEmailTempPromise = new Promise((resolve, reject) => {
            if (userData.email && userData.wrongEmail != true && channel.letter && userData.email.match(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)) {
                sendEmailTemplate(userData.email, mail, notiId)
                    .then(notiId => resolve({
                        notiId,
                        letter: true
                    }))
                    .catch(err => resolve({notiId, letter: false}));
            } else resolve({notiId, letter: false});
        });

        const sendNotificationToGivenUserWeb = new Promise((resolve, reject) => {
            if (userData.webToken && channel.web) {
                sendNotificationToGivenUser(userData.webToken, mail, 'web', notiId).then(notiId => resolve({
                    notiId,
                    web: true
                })).catch(err => resolve({notiId, web: false}));
            } else resolve({notiId, web: false});

        });

        const sendNotificationToGivenUserApp = new Promise((resolve, reject) => {
            if (userData.mobileToken && channel.mobile) {
                sendNotificationToGivenUser(userData.mobileToken, mail, 'app', notiId).then(notiId => resolve({
                    notiId,
                    mobile: true
                })).catch(err => resolve({notiId, mobile: false}));
            } else resolve({notiId, mobile: false});

        });

        const sendMessengerPromise = new Promise((resolve, reject) => {
            if (userData.messengerId && channel.messenger) {
                sendMessenger(userData.messengerId, mail, notiId).then(notiId => resolve({
                    notiId,
                    messenger: true
                })).catch(err => reject(err));
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

function sendMessenger(messengerId, noti, key) {
    return new Promise((resolve, reject) => {
        var url = 'https://jobobot.herokuapp.com/noti';

        var param = {
            messages: {
                text: noti.body || '',
                calltoaction: noti.calltoaction || '',
                linktoaction: noti.linktoaction || '',
                image: noti.image || ''
            },
            recipientIds: messengerId
        }
        axios.post(url, param)
            .then(function (response) {
                console.log('messenger sent:' + key)
                notificationCol.updateOne({notiId: key}, {$set: {messenger_sent: Date.now()}})
                    .then(() => resolve(key))
                    .catch(function (error) {
                        console.log(error);
                    });
            })
            .then(() => resolve(key))
            .catch(function (error) {
                console.log(error);
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
                linktoaction: noti.linktoaction || ''
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

app.get('/getallPost', (req, res) => {
    FacebookPost.find()
        .then(posts => {
            res.json(posts);
        })
        .catch(err => res.send(err))
});

app.get('/getfbPost', function (req, res) {
    let {p: page, q: query} = req.query
    FacebookPost.find()
        .then(posts => {
            var sorted = _.sortBy(posts, function (card) {
                return -card.time
            });
            res.status(200).json(getPaginatedItems(sorted, page))
        })
        .catch(err => res.status(500).json(err));
});

app.post('/newPost', (req, res, next) => {
    const post = req.body;

    if (!post) res.status(403).json('Facebook post data is required');
    if (!post.postId) post.postId = mongoose.Types.ObjectId();
    const mgPost = new FacebookPost(post)
    mgPost.save()
        .then(post => {
            if (post.time > Date.now() && post.time < Date.now() + 86400 * 1000) {
                console.log('facebook', b++);
                let promise = Promise.resolve(Object.assign({}, post, {schedule: true}));
                schedule.scheduleJob(post.time, function () {
                    promise = PublishFacebook(post.to, post.content, post.poster, post.postId)
                });
                return promise;
            }
        })
        .then(schedulePost => res.status(200).json(schedulePost))
        .catch(err => res.status(500).json(err));
});

app.post('/newNoti', (req, res, next) => {
    const noti = req.body;

    if (!noti) res.status(403).json('Noti post data is required');
    if (!noti.notiId) noti.notiId = keygen()
    notificationCol.insert(noti, function (err, data) {
        if (err) {
            res.send({code: 'error', err})
        } else {

            if (noti.time > Date.now() && noti.time < Date.now() + 86400 * 1000) {
                console.log('noti', a++);
                schedule.scheduleJob(noti.time, function () {
                    startSend(noti.userData, noti.mail, noti.channel, noti.notiId).then(function (array) {
                        console.log('array', array)
                    })
                })
                res.send({code: 'success', msg: 'scheduled', id: noti.notiId})
            } else {
                res.send({code: 'success', msg: 'saved', id: noti.notiId})

            }

        }
    })


});

function PublishFacebook(to, content, poster, postId) {
    return new Promise((resolve, reject) => {
        a++
        console.log('scheduleJob_PublishFacebook_run', to, poster, postId)
        var accessToken = facebookAccount[poster].access_token
        if (to && content && accessToken) {
            if (content.image) {
                graph.post(to + "/photos?access_token=" + accessToken, {
                        "url": content.image,
                        "caption": content.text
                    },
                    function (err, res) {
                        // returns the post id
                        if (err) {
                            console.log(err.message, to, poster);
                            // facebookPostRef.child(postId).update({ sent_error: err.message })
                            FacebookPost.findOneAndUpdate({postId}, {
                                sent_error: err.message
                            }, {new: true})
                                .then(updatedPost => resolve(updatedPost))
                                .catch(err => reject(err));
                        } else {
                            var id = res.id;
                            console.log(id);
                            // facebookPostRef.child(postId).update({ id, sent: Date.now() })
                            FacebookPost.findOneAndUpdate({postId}, {
                                id,
                                sent: Date.now()
                            }, {new: true})
                                .then(updatedPost => resolve(updatedPost))
                                .catch(err => reject(err));
                        }
                    });
            } else {
                graph.post(to + "/feed?access_token=" + accessToken, {"message": content.text},
                    function (err, res) {
                        // returns the post id
                        if (err) {
                            console.log(err.message, to, poster);
                            // facebookPostRef.child(postId).update({ sent_error: err.message })
                            FacebookPost.findOneAndUpdate({postId}, {
                                sent_error: err.message
                            }, {new: true})
                                .then(updatedPost => resolve(updatedPost))
                                .catch(err => reject(err));
                        } else {
                            var id = res.id;
                            console.log(id);
                            // facebookPostRef.child(postId).update({ id, sent: Date.now() })
                            FacebookPost.findOneAndUpdate({postId}, {id, sent: Date.now()}, {new: true})
                                .then(updatedPost => resolve(updatedPost))
                                .catch(err => reject(err));
                        }
                    });
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
    const {accessToken, key, area = 'hcm ', userId = 'thonglk'} = req.query;
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
console.log('Server started!', port);

var dumping = firebase.initializeApp({
    credential: firebase.credential.cert({
        "type": "service_account",
        "project_id": "dumpling-app",
        "private_key_id": "e7dcb3d212a7a3c9b9746dea33ea4c7434e48965",
        "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC4EFQFrsMuhDOd\n5q3kwi+fXez5KNRzsHRwwNr7R7ESNezqwGukHdC7cAOsSVMUfObZPLXQQYluk3Z3\nMunqx+3ZK2nWZaeZQ7KSZPaHstSNudwoV2iVAYDXBLGBrg2XMNvHRKGpu5xRI0sN\n5YZ3p40DUN4v8eR4Axi6stFjjXaw6qe22qYTAjQQoaV7bcGp+iVL7fz/VGqo7qji\nImobwnmeMtbDVCVH4kRIsuKFYY7pDM367xwYivSO80PrNPHEKPWzMW2CCdLioiJh\nbVjF4daIFQEUqShGtR2oi3pqAlUTipwomKF/2u28JM9PavVj4OnVQ9qlDboq8Pcu\n9jrLATxdAgMBAAECggEAEDLxrhlaGKUuZMJpQfV8Gva5dRksj2zzZnv2mcBOu2dP\nDT73ijdMiD58uEQwwWAXsf03lBc8eOSV+7oZn53OVztMon+KT0EHvX4Qu1MYBUwa\n7dr5e4mpFONXGu5eSFTWttQZtTYrdPGZ+KRfX/b5QFY047vSa2R8X+v+ZRhNXpb1\nwicZHbMxHi5uSHCslSDyAR+pzFHv6Mmz3hWpW5Im1szTomeKh68w7OXYt8wp69Y+\nfi4if5wNibo3RU3iRV8aqICBf2F8SAxI6p1CxkAJM2VX5mz3NTf1N31S2v0YGnNN\nqpbCowBnURtdTC9h9Lh3qXjDdG3jkznZcdzKTGZboQKBgQD1ZNfnEkmZse02+Ijv\nvGLyIfPgh0OLyskvNEBRZ5RS17f2sK8R2Vvk16bvRJ99796cDUXjCjZOwGz/PYB7\nEutEH1UTea77x2gZA111vKXwzY94IPbyqefCtk1tlG4NnB9KIKeH2w+9CUpAbJKS\nQnsV/oNHEaq3mnEmvmhix54pPQKBgQDABOYM8LTtWlHVJUb50QcfAp9b6Bf2QnZF\nU2dUtnc2dNOxKLUUWpNC/4VK++wwVMWnhJjCYfAndANET7xQ/5XoMDLbh7TbO47b\nfTwFdLhSL4o82n3XMrFwrMdLaftWH2AKocKkPAhqedsPzKJA+MoFJytp7Fc27u5e\ndh0qgUFRoQKBgQDweFfSimsxf9hzi+208CkOGhOArUyVyqyH424714LUA6y0w8Nr\nfFK+2E0wH1Ej+lFtHtyjdjhtx8eH/97NvGZsJUAbi5zcAjaSfGeznqAGb4nuMG+O\nsMz6U+dgQJnwIFPRMlq5mQO9PUNUCpE/XoJ7tSM0G63tqhzD2Mc2NWNaCQKBgA88\nVESSlMiAch3HZ2pK+5WqT5qrP7t6aof1pi1CjRL1Ehbsc/G5fhXC0ICynHr5PvWb\nv8MsojF/MwMokHiczvgtWtuwWNlMUHl55llIeZeLzhwl+fYpP4sBKo8BSb/7nVM6\noocFfGV2ZbtLMVSWaPEfuoIdDo59RsyX8ph8yQIBAoGBAIvH9RVe4d2SSC2z24VN\n+mEPBj1l+mtoStBMXTTnP4nT+Utx4QW3rMQg9ZmtxFcwojbJ5xP4QmrWqsQyvCPi\nEM9E8FbSto3AfW7vazqVIdkPuyeB1YwVeM11zAxi13R5ihG35jhIZb0yjHupADpj\nnuz0+gi+tn/4BQL69XWgMTKm\n-----END PRIVATE KEY-----\n",
        "client_email": "firebase-adminsdk-tprf6@dumpling-app.iam.gserviceaccount.com",
        "client_id": "105497327849129862101",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://accounts.google.com/o/oauth2/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-tprf6%40dumpling-app.iam.gserviceaccount.com"
    }),
    databaseURL: "https://dumpling-app.firebaseio.com"
}, 'dumpling');
var dumpling_question, dumpling_user, dumpling_questionArray, dumpling_friend, dumpling_answer

dumping.database().ref('question').on('value', function (snap) {
    dumpling_question = snap.val()
    dumpling_questionArray = _.toArray(dumpling_question)
})
dumping.database().ref('answer').on('value', function (snap) {
    dumpling_answer = snap.val()
    if (!dumpling_answer) {
        dumpling_answer = {}
    }
})


dumping.database().ref('user').on('value', function (snap) {
    dumpling_user = snap.val()
    if (!dumpling_user) {
        dumpling_user = {}
    }
})
dumping.database().ref('friend').on('value', function (snap) {
    dumpling_friend = snap.val()
    if (!dumpling_friend) {
        dumpling_friend = {}
    }
})

app.get('/dumpling/getQuestion', function (req, res) {
    let {userId} = req.query
    var question = _.sample(dumpling_questionArray)
    var friendList = []
    for (var i in dumpling_friend) {
        var connectFriend = dumpling_friend[i]
        if (connectFriend.friend1 == userId) {
            var friendOfYou = dumpling_user[connectFriend.friend2]
            friendList.push({
                userId: friendOfYou.userId,
                name: friendOfYou.name,
            })
        } else if (connectFriend.friend2 == userId) {
            var friendOfYou = dumpling_user[connectFriend.friend1]
            friendList.push({
                userId: friendOfYou.userId,
                name: friendOfYou.name,
            })
        }
    }

    if (friendList.length > 3) {
        var options = _.sample(friendList, 4)
        res.send({question, options})
    } else {
        res.send({err: 'You need to have more than 4 friends'})
    }

});

app.get('/dumpling/getAllUser', function (req, res) {
    res.send(dumpling_user)
});


app.get('/dumpling/profile', function (req, res) {
    let {userId, myId} = req.query
    var profileData = dumpling_user[userId]
    if (profileData) {
        profileData.sent = _.where(dumpling_answer, {answerBy: userId})
        profileData.receive = _.where(dumpling_answer, {answer: userId})
        var friendList = []

        for (var i in dumpling_friend) {
            var data = {}
            var connectFriend = dumpling_friend[i]
            if (connectFriend.friend1 == userId) {
                var friendOfYou = dumpling_user[connectFriend.friend2]
                data = {
                    userId: friendOfYou.userId,
                    name: friendOfYou.name,
                }
                if (myId && connectFriend.friend1 == myId) {
                    data.mystatus = 'Đã thêm'
                } else {
                    data.status = 'Đã thêm'
                }

                friendList.push(data)

            } else if (connectFriend.friend2 == userId) {
                var friendOfYou = dumpling_user[connectFriend.friend1]
                data = {
                    userId: friendOfYou.userId,
                    name: friendOfYou.name,
                }
                if (myId && connectFriend.friend2 == myId) {
                    data.mystatus = 'Được thêm'
                } else {
                    data.status = 'Được thêm'
                }
                friendList.push(data)

            }

        }
        profileData.friends = friendList
        res.send(profileData)
    } else {
        res.send({err: 'No profile'})
    }

});


var verifier = require('email-verify');
app.get('/emailVerifier', (req, res) => {
    const {email, test} = req.query;
    verifier.verify(email, function (err, info) {
        if (err) res.send(err);
        else {
            res.json(info);
        }
    });
});

let google = require('googleapis');
let authentication = require("./google_auth");

function getData(auth, spreadsheetId, range) {
    var sheets = google.sheets('v4');
    sheets.spreadsheets.values.get({
        auth: auth,
        spreadsheetId,
        range, //Change Sheet1 if your worksheet's name is something else
    }, (err, response) => {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var rows = response.values;
        if (rows.length === 0) {
            console.log('No data found.');
        } else {
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                console.log(row.join(", "));
            }
        }
    });
}

function clearData(auth, spreadsheetId, range) {
    var sheets = google.sheets('v4');
    sheets.spreadsheets.values.clear({
        auth: auth,
        spreadsheetId,
        range
    }, (err, response) => {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        } else {
            console.log("Clear");
            return response;
        }
    });
}

function appendData(auth, spreadsheetId, range, values) {
    var sheets = google.sheets('v4');
    sheets.spreadsheets.values.append({
        auth: auth,
        spreadsheetId,
        range, //Change Sheet1 if your worksheet's name is something else
        valueInputOption: "USER_ENTERED",
        resource: {
            values
        }
    }, (err, response) => {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        } else {
            console.log("Appended");
            return response;
        }
    });
}

function addSheet(auth, spreadsheetUrl, title, sheets) {
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
            return;
        } else {
            console.log("Added", response);
        }
    });
}

app.get('/fbReports', (req, res, next) => {
    authentication.authenticate().then((auth) => {
        // getData(auth, '1lxmls_-E5X71hyjLyJYnyT4_3wZ_dl6sxW5lXB-Vzg0', 'facebook_post!A1:O');
        // appendData(auth, '1lxmls_-E5X71hyjLyJYnyT4_3wZ_dl6sxW5lXB-Vzg0', 'facebook_post!A1:B');
        // addSheet(auth, 'https://drive.google.com/drive/u/0/folders/0B-VC0Ytsd6ddbkw0aDY5UFd0b3c', 'Data Reports', [{ properties: { title: 'facebook_post' } }, { properties: { title: 'notification' } }]);
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
});