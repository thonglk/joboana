// grab the packages we need
var firebase = require("firebase-admin");
var express = require('express');

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
import mongoose from 'mongoose';
import FacebookPost from './models/facebook-post';

var uri = 'mongodb://joboapp:joboApp.1234@ec2-54-157-20-214.compute-1.amazonaws.com:27017/joboapp';

mongoose.connect(uri);
console.log('Connected to MongoDB at ', uri);

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
    viecLamNhaHang: {
        pageId: '282860701742519',
        token: 'EAAEMfZASjMhgBAIeW7dEVfhrQjZCtKszDRfuzsn1nDhOTaZBsejy1Xf71XxbvZBlSSHaFBg5L9eSwmNTDURRxdAetC9V1cArFnV1dM7sISSZB7weBIycRagE2RZCGZCaiQbDpFuy2cXiVyynKWpDbz9SM29yU273UkynZCBgmxU74gZDZD'
    }
};


var db = joboTest.database();
var db2 = joboPxl.database();

var firsttime;


var configRef = db.ref('config');
var notificationRef = db2.ref('notihihi')
var facebookPostRef = db2.ref('facebookPost');

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
        facebookAccount = CONFIG.facebookToken
    })


    notificationRef.once('value', function (snap) {
        dataNoti = snap.val()
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

    FacebookPost.find()
        .then(posts => {
            posts.forEach(function (post) {
                if (post.time > startTime && post.time < endTime) {
                    console.log('facebook', b++);
                    let promise = Promise.resolve({...post, schedule: true});
                    schedule.scheduleJob(post.time, function () {
                        promise = PublishFacebook(post.to, post.content, post.poster, post.postId)
                    });
                    return promise;
                }
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
        console.log('sendEmail',addressTo)

        // send mail with defined transport object
        mailTransport.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sent email', addressTo)

                reject(error);
            }

            console.log('Email sent:', notiId + addressTo)

            // console.log('Message sent: %s', info.messageId);
            if (notiId) {
                notificationRef.child(notiId).update({mail_sent: Date.now()})
            }
            resolve(notiId);


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

    var platform = configP[p]
    var type = configT[t]
    joboPxl.database().ref('/links/' + notiId + p + t)
        .update({
            url, linkId: notiId, platform, type
        })
    if (t == 'o') {
        return CONFIG.AnaURL + '/l/' + notiId + p + t
    }
    return CONFIG.WEBURL + '/l/' + notiId + p + t


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
        notificationRef.child(notiId)
            .update(data)
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
                text: noti.body,
                calltoaction: noti.calltoaction,
                linktoaction: noti.linktoaction,
                image: noti.image
            },
            recipientIds: messengerId
        }
        axios.post(url, param)
            .then(function (response) {
                console.log('messenger sent:' + key)
                notificationRef.child(key).update({messenger_sent: Date.now()});
                resolve(key);
            })
            // .then(() => resolve(key))
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
                    console.log(type + ' sent', key);
                    return notificationRef.child(key).update(data);
                }
            })
            .then(() => resolve(key))
            .catch(function (error) {
                console.log("Error sending message:", error);
                reject(error);
            });
    });
}

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

app.get('/firebase', (req, res) => {
    facebookPostRef.once('value')
        .then(_posts => {
            const posts = _posts.val();
            console.log(Object.keys(posts).length);
            return Promise.all(Object.keys(posts).map(key => {

                if (!posts[key]) res.status(403).json('Facebook post data is required');
                if (!posts[key].postId) posts[key].postId = mongoose.Types.ObjectId();
                const mgPost = new FacebookPost(posts[key]);
                return mgPost.save();
            }));
        })
        .then(posts => res.status(200).json(posts))
        .catch(err => res.status(500).json(err));
})
app.post('/newPost', (req, res, next) => {
    const post = req.body;

    if (!post) res.status(403).json('Facebook post data is required');
    if (!post.postId) post.postId = mongoose.Types.ObjectId();
    const mgPost = new FacebookPost(post)
    mgPost.save()
        .then(post => {
            if (post.time > Date.now() && post.time < Date.now() + 86400 * 1000) {
                console.log('facebook', b++);
                let promise = Promise.resolve({...post, schedule: true});
                schedule.scheduleJob(post.time, function () {
                    promise = PublishFacebook(post.to, post.content, post.poster, post.postId)
                });
                return promise;
            }
        })
        .then(schedulePost => res.status(200).json(schedulePost))
        .catch(err => res.status(500).json(err));
});


function PublishFacebook(to, content, poster, postId) {
    return new Promise((resolve, reject) => {
        a++
        console.log('scheduleJob_PublishFacebook_run', to, poster, postId)
        var accessToken = facebookAccount[poster]
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


// start the server
http.createServer(app).listen(port);
console.log('Server started!', port);
init();