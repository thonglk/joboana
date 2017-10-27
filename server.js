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

//
// var mailTransport = nodemailer.createTransport(ses({
//     accessKeyId: 'AKIAJHPP64MDOXMXAZRQ',
//     secretAccessKey: 'xNzQL2bFyfCg6ZP2XsG8W6em3xiweNQArWUnnADW',
//     region: 'us-east-1'
// }));
var mandrill = require('mandrill-api/mandrill');
var mandrill_client = new mandrill.Mandrill('o0QnNTrMVDz68x3S55Hb6Q');

let mailTransport = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: 'contact@joboapp.com', // generated ethereal user
        pass: 'Ya11VV2MQtsE'  // generated ethereal password
    }
});

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


var db = joboTest.database();
var db2 = joboPxl.database();


db2.ref('tempNoti').on('child_added', function (snap) {
    var noti = snap.val()
    if (!noti) return
    if (!noti.notiId) noti.notiId = keygen()
    notificationCol.insert(noti, function (err, data) {
        if (err) {
            console.log(err)
        } else {
            db2.ref('tempNoti').child(snap.key).remove()
            if (noti.time > Date.now() && noti.time < Date.now() + 86400 * 1000) {
                console.log('noti', a++);
                schedule.scheduleJob(noti.time, function () {
                    startSend(noti.userData, noti.mail, noti.channel, noti.notiId).then(function (array) {
                        console.log('array', array)
                    })
                })
                console.log('scheduled notification', noti.notiId)
            } else {
                console.log('save notification', noti.notiId)
            }
        }
    })

})


var configRef = db.ref('config');
var notificationRef = db2.ref('notihihi');

var dataUser, dataProfile, dataStore, dataJob, dataStatic, likeActivity, dataLog, dataNoti, dataLead, dataEmail, Lang
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
    })
    configRef.on('value', function (snap) {
        CONFIG = snap.val()
        facebookAccount = CONFIG.facebookAccount
        var defaut = facebookAccount.mailinh.access_token
        graph.setAccessToken(defaut);

    })


    var startTime = Date.now();
    var endTime = startTime + 86400 * 1000;
    var a = 0,
        b = 0;


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

app.get('/sendEmailManrill', (req, res) => {
    var {email} = req.query
    var message = {
        "html": "<p>This is a email</p>",
        "text": "This is a email",
        "subject": "New email test |" + new Date(),
        "from_email": "hello@jobo.asia",
        "from_name": "Jobo",
        "to": [{
            "email": email,
            "name": "Thông",
            "type": "to"
        }],
        "headers": {
            "Reply-To": "contact@joboapp.com"
        },
        "important": false,
        "track_opens": true,
        "track_clicks": true,
        "auto_text": null,
        "auto_html": null,
        "inline_css": null,
        "url_strip_qs": null,
        "preserve_recipients": null,
        "view_content_link": null,
        "bcc_address": "message.bcc_address@example.com",
        "tracking_domain": null,
        "signing_domain": null,
        "return_path_domain": null,
        "merge": true
    };
    var async = false;
    var ip_pool = "Main Pool";
    var send_at = new Date();

    mandrill_client.messages.send({"message": message}, function (result) {
        console.log(result);
        res.send(result)
        /*
        [{
                "email": "recipient.email@example.com",
                "status": "sent",
                "reject_reason": "hard-bounce",
                "_id": "abc123abc123abc123abc123abc123"
            }]
        */
    }, function (e) {
        // Mandrill returns the error as an object with name and message keys
        console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
        res.send(e)

        // A mandrill error occurred: Unknown_Subaccount - No subaccount exists with the id 'customer-123'
    });

})
app.get('/sendEmail', (req, res) => {
    var addressTo = req.param('email')
    var from = req.param('from')
    var emailMarkup = `<div style="cursor:auto;color:#000;font-family:${font};font-size:13px;line-height:22px;text-align:left;"><img src="${addTrackingEmail(keygen(), '/jobo.png')}"/>Check it now</div>`

    let mailOptions = {
        from: {
            name: 'Jobo',
            address: from || 'contact@joboapp.com'
        },
        to: addressTo, // list of receivers
        subject: 'Test Email |' + Date.now(), // Subject line
        // text: 'Hello world?', // plain text body
        html: `${emailMarkup}`, // html body
    }


    // send mail with defined transport object
    mailTransport.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error sent email', addressTo)
        }

        console.log('Email sent:', addressTo)


    });

})

var sendEmail = (addressTo, mail, emailMarkup, notiId) => {
    return new Promise((resolve, reject) => {
        // setup email data with unicode symbols

        var message = {
            "html": emailMarkup,
            "subject": mail.title,
            "from_email": mail.from || CONFIG.email,
            "from_name": mail.name || 'Jobo | Tìm việc nhanh',
            "to": [{
                "email": addressTo,
                "type": "to"
            }],
            "headers": {
                "Reply-To": mail.from
            },
            "important": false,
            "track_opens": true,
            "track_clicks": true,
            "auto_text": null,
            "auto_html": null,
            "inline_css": null,
            "url_strip_qs": null,
            "preserve_recipients": null,
            "view_content_link": null,
            "tracking_domain": null,
            "signing_domain": null,
            "return_path_domain": null,
            "merge": true
        };

        mandrill_client.messages.send({"message": message}, function (result) {
            console.log('Email:',result.status, notiId + ' ' + addressTo)

            notificationCol.updateOne({notiId}, {$set: {letter_sent: Date.now()}})
                .then(() => resolve(notiId))
                .catch(err => reject(err))
        }, function (e) {
            // Mandrill returns the error as an object with name and message keys
            console.log('Error sent email', e)
            reject(error);

            // A mandrill error occurred: Unknown_Subaccount - No subaccount exists with the id 'customer-123'
        });

        // let mailOptions = {
        //     from: {
        //         name: mail.name || 'Jobo | Tìm việc nhanh',
        //         address: mail.from || CONFIG.email
        //     },
        //     bcc: mail.bcc,
        //     to: addressTo, // list of receivers
        //     subject: mail.title, // Subject line
        //     html: emailMarkup, // html body
        // }
        // if (mail.attachments) {
        //     mailOptions.attachments = [{ // filename and content type is derived from path
        //         path: 'https://jobo.asia/img/proposal_pricing_included.pdf'
        //     }]
        // }
        //
        //
        // // send mail with defined transport object
        // mailTransport.sendMail(mailOptions, (error, info) => {
        //     if (error) {
        //         console.log('Error sent email', addressTo)
        //         reject(error);
        //     }
        //
        //     console.log('Email sent:', notiId + ' ' + addressTo)
        //
        //     notificationCol.updateOne({notiId}, {$set: {letter_sent: Date.now()}})
        //         .then(() => resolve(notiId))
        //         .catch(err => reject(err))
        //
        //
        // });
    });
}
app.get('/', function (req, res, next) {
    res.send('Jobo' + a + ' ' + b)
})

app.get('/l/:queryString', function (req, res, next) {
    const queryString = req.params.queryString;
    if (!queryString) res.redirect(CONFIG.WEBURL + '/jobseeker/dash');

    var dataStr = queryString.split(":")

    const notiId = dataStr[0]
    const p = dataStr[1]
    const t = dataStr[2]
    const i = dataStr[3]

    var platform = configP[p]
    var type = configT[t]

    console.log(notiId, platform, type)

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
app.get('/viewFBpost', function (req, res) {
    const {access_token} = req.query;
    if (access_token) graph.setAccessToken(access_token);
    fetchFBPost().then(function (result) {
        res.status(200).json(result);
    }).catch(function (err) {
        res.status(500).json(err);
    })
})

function fetchFBPost() {
    return new Promise((resolve, reject) => {
        FacebookPost.find({still_alive: true})
            .then(posts => {
                return Promise.all(posts.map(post => {
                    return viewFBpost(post._doc);
                }));
            })
            .then(posts => {
                console.log('obj');
                var still_alive = true
                return Promise.all(posts.map(post => {
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

                    if (post.err) {
                        still_alive = false
                        check_error = post.err;
                        console.log('post.err', check_error)

                    } else if (post.result) {
                        if (post.result.reactions) {
                            reactions = {
                                haha: post.result.reactions.data.filter(haha => haha.type === 'HAHA').length,
                                like: post.result.reactions.data.filter(like => like.type === 'LIKE').length,
                                love: post.result.reactions.data.filter(love => love.type === 'LOVE').length,
                                wow: post.result.reactions.data.filter(wow => wow.type === 'WOW').length,
                                sad: post.result.reactions.data.filter(sad => sad.type === 'SAD').length,
                                angry: post.result.reactions.data.filter(angry => angry.type === 'ANGRY').length
                            }
                        }
                        if (post.result.comments) {
                            comments = post.result.comments.data;
                            console.log(post.id)

                        }

                    }


                    // post.checks.push(check);
                    // console.log(check);
                    return FacebookPost.findByIdAndUpdate(post._id, {
                        checkAt,
                        reactions,
                        comments,
                        check_error,
                        still_alive
                    }, {new: true});
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

function addTrackingEmail(notiId, url, t = 'o', p = 'l', i = '') {
    if (url) {
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

// function sendEmailTemplate(email, mail, notiId) {
//     return new Promise((resolve, reject) => {
//         var card = {}
//
//         var header = '<!doctype html>\n' +
//             '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">\n' +
//             '\n' +
//             '<head>\n' +
//             '    <title></title>\n' +
//             '    <!--[if !mso]><!-- -->\n' +
//             '    <meta http-equiv="X-UA-Compatible" content="IE=edge">\n' +
//             '    <!--<![endif]-->\n' +
//             '    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">\n' +
//             '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
//             '    <style type="text/css">\n' +
//             '        #outlook a {\n' +
//             '            padding: 0;\n' +
//             '        }\n' +
//             '\n' +
//             '        .ReadMsgBody {\n' +
//             '            width: 100%;\n' +
//             '        }\n' +
//             '\n' +
//             '        .ExternalClass {\n' +
//             '            width: 100%;\n' +
//             '        }\n' +
//             '\n' +
//             '        .ExternalClass * {\n' +
//             '            line-height: 100%;\n' +
//             '        }\n' +
//             '\n' +
//             '        body {\n' +
//             '            margin: 0;\n' +
//             '            padding: 0;\n' +
//             '            -webkit-text-size-adjust: 100%;\n' +
//             '            -ms-text-size-adjust: 100%;\n' +
//             '        }\n' +
//             '\n' +
//             '        table,\n' +
//             '        td {\n' +
//             '            border-collapse: collapse;\n' +
//             '            mso-table-lspace: 0pt;\n' +
//             '            mso-table-rspace: 0pt;\n' +
//             '        }\n' +
//             '\n' +
//             '        img {\n' +
//             '            border: 0;\n' +
//             '            height: auto;\n' +
//             '            line-height: 100%;\n' +
//             '            outline: none;\n' +
//             '            text-decoration: none;\n' +
//             '            -ms-interpolation-mode: bicubic;\n' +
//             '        }\n' +
//             '\n' +
//             '        p {\n' +
//             '            display: block;\n' +
//             '            margin: 13px 0;\n' +
//             '        }\n' +
//             '    </style>\n' +
//             '    <!--[if !mso]><!-->\n' +
//             '    <style type="text/css">\n' +
//             '        @media only screen and (max-width:480px) {\n' +
//             '            @-ms-viewport {\n' +
//             '                width: 320px;\n' +
//             '            }\n' +
//             '            @viewport {\n' +
//             '                width: 320px;\n' +
//             '            }\n' +
//             '        }\n' +
//             '    </style>\n' +
//             '    <!--<![endif]-->\n' +
//             '    <!--[if mso]>\n' +
//             '    <xml>\n' +
//             '        <o:OfficeDocumentSettings>\n' +
//             '            <o:AllowPNG/>\n' +
//             '            <o:PixelsPerInch>96</o:PixelsPerInch>\n' +
//             '        </o:OfficeDocumentSettings>\n' +
//             '    </xml>\n' +
//             '    <![endif]-->\n' +
//             '    <!--[if lte mso 11]>\n' +
//             '    <style type="text/css">\n' +
//             '        .outlook-group-fix {\n' +
//             '            width:100% !important;\n' +
//             '        }\n' +
//             '    </style>\n' +
//             '    <![endif]-->\n' +
//             '\n' +
//             '    <!--[if !mso]><!-->\n' +
//             '    <link href="https://fonts.googleapis.com/css?family=Ubuntu:300,400,500,700" rel="stylesheet" type="text/css">\n' +
//             '    <style type="text/css">\n' +
//             '        @import url(https://fonts.googleapis.com/css?family=Ubuntu:300,400,500,700);\n' +
//             '    </style>\n' +
//             '    <!--<![endif]-->\n' +
//             '    <style type="text/css">\n' +
//             '        @media only screen and (min-width:480px) {\n' +
//             '            .mj-column-per-50 {\n' +
//             '                width: 50%!important;\n' +
//             '            }\n' +
//             '        }\n' +
//             '    </style>\n' +
//             '</head>\n' +
//             '\n' +
//             '<body>\n' +
//             `<img src="${addTrackingEmail(notiId, '/jobo.png', 'o', 'l')}"/>` +
//             '\n' +
//             '<div class="mj-container">';
//
//
//         var footer = '</div>\n' +
//             '</body>\n' +
//             '\n' +
//             '</html>';
//
//         var image = ' <!--[if mso | IE]>\n' +
//             '    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;">\n' +
//             '        <tr>\n' +
//             '            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">\n' +
//             '    <![endif]-->\n' +
//             '    <div style="margin:0px auto;max-width:600px;">\n' +
//             '        <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0">\n' +
//             '            <tbody>\n' +
//             '            <tr>\n' +
//             '                <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;">\n' +
//             '                    <!--[if mso | IE]>\n' +
//             '                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">\n' +
//             '                        <tr>\n' +
//             '                            <td style="vertical-align:undefined;width:600px;">\n' +
//             '                    <![endif]-->\n' +
//             '                    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0px;" align="center" border="0">\n' +
//             '                        <tbody>\n' +
//             '                        <tr>\n' +
//             '                            <td style="width:550px;"><img alt="" title="" height="auto" src="' + mail.image + '" style="border:none;border-radius:0px;display:block;font-size:13px;outline:none;text-decoration:none;width:100%;height:auto;" width="550"></td>\n' +
//             '                        </tr>\n' +
//             '                        </tbody>\n' +
//             '                    </table>\n' +
//             '                    <!--[if mso | IE]>\n' +
//             '                    </td></tr></table>\n' +
//             '                    <![endif]-->\n' +
//             '                </td>\n' +
//             '            </tr>\n' +
//             '            </tbody>\n' +
//             '        </table>\n' +
//             '    </div>\n' +
//             '    <!--[if mso | IE]>\n' +
//             '    </td></tr></table>\n' +
//             '    <![endif]-->';
//
//         var text = '\n' +
//             '    <!--[if mso | IE]>\n' +
//             '    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;">\n' +
//             '        <tr>\n' +
//             '            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">\n' +
//             '    <![endif]-->\n' +
//             '    <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;">' + mail.description + '</div>\n' +
//             '    <!--[if mso | IE]>\n' +
//             '    </td></tr></table>\n' +
//             '    <![endif]-->';
//
//         var button = '  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;">\n' +
//             '        <tr>\n' +
//             '            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">\n' +
//             '    <![endif]-->\n' +
//             '    <div style="margin:0px auto;max-width:600px;">\n' +
//             '        <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0">\n' +
//             '            <tbody>\n' +
//             '            <tr>\n' +
//             '                <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;">\n' +
//             '                    <!--[if mso | IE]>\n' +
//             '                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">\n' +
//             '                        <tr>\n' +
//             '                            <td style="vertical-align:undefined;width:600px;">\n' +
//             '                    <![endif]-->\n' +
//             '                    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;" align="justify" border="0">\n' +
//             '                        <tbody>\n' +
//             '                        <tr style="border-collapse:collapse"> <td class="m_-5282972956275044657w580" style="font-family:' + font + ';font-weight:300;border-collapse:collapse" width="580"> <div style="text-align:center"><a href="' + addTrackingEmail(notiId, mail.linktoaction, 'c', 'l') + '" style="background: #1FBDF1;background: -webkit-linear-gradient(to left, #1FBDF1, #39DFA5); background: linear-gradient(to left, #1FBDF1, #39DFA5);color:#ffffff;display:inline-block;font-family:sans-serif;font-size:16px;font-weight:bold;line-height:60px;text-align:center;text-decoration:none;width:300px" target="_blank"> ' + mail.calltoaction + '</a></div> </td> </tr>\n' +
//             '                        </tbody>\n' +
//             '                    </table>\n' +
//             '                    <!--[if mso | IE]>\n' +
//             '                    </td></tr></table>\n' +
//             '                    <![endif]-->\n' +
//             '                </td>\n' +
//             '            </tr>\n' +
//             '            </tbody>\n' +
//             '        </table>\n' +
//             '    </div>\n' +
//             '    <!--[if mso | IE]>\n' +
//             '    </td></tr></table>\n' +
//             '    <![endif]-->';
//
//         var card_header = '  <!--[if mso | IE]>\n' +
//             '    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;">\n' +
//             '        <tr>\n' +
//             '            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">\n' +
//             '    <![endif]-->\n' +
//             '    <div style="margin:0px auto;max-width:600px;">\n' +
//             '        <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0">\n' +
//             '            <tbody>\n' +
//             '            <tr>\n' +
//             '                <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;">\n' +
//             '                    <!--[if mso | IE]>\n' +
//             '                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">\n' +
//             '                        <tr>';
//
//         var card_footer = '  </tr>\n' +
//             '\n' +
//             '                    </table>\n' +
//             '                    <![endif]-->\n' +
//             '                </td>\n' +
//             '            </tr>\n' +
//             '            </tbody>\n' +
//             '        </table>\n' +
//             '    </div>\n' +
//             '    <!--[if mso | IE]>\n' +
//             '    </td></tr></table>\n' +
//             '    <![endif]-->'
//
//         var card_body = '<td style="vertical-align:top;width:300px;">\n' +
//             '                    <![endif]-->\n' +
//             '                    <div class="mj-column-per-50 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;">\n' +
//             '                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">\n' +
//             '                            <tbody>\n' +
//             '                            <tr>\n' +
//             '                                <td style="word-wrap:break-word;font-size:0px;padding:10px 25px;" align="center">\n' +
//             '                                    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0px;" align="center" border="0">\n' +
//             '                                        <tbody>\n' +
//             '                                        <tr>\n' +
//             '                                            <td style="width:165px;"><img alt="" title="" height="auto" src="' + card.image + '" style="border:none;border-radius:0px;display:block;font-size:13px;outline:none;text-decoration:none;width:100%;height:auto;" width="165"></td>\n' +
//             '                                        </tr>\n' +
//             '                                        </tbody>\n' +
//             '                                    </table>\n' +
//             '                                </td>\n' +
//             '                            </tr>\n' +
//             '                            <tr>\n' +
//             '                                <td style="word-wrap:break-word;font-size:0px;padding:10px 25px;" align="center">\n' +
//             '                                    <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:16px;font-weight:bold;line-height:22px;text-align:center;">' + card.title + '</div>\n' +
//             '                                </td>\n' +
//             '                            </tr>\n' +
//             '                            <tr>\n' +
//             '                                <td style="word-wrap:break-word;font-size:0px;padding:10px 25px;" align="center">\n' +
//             '                                    <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:center;">' + card.body + '</div>\n' +
//             '                                </td>\n' +
//             '                            </tr>\n' +
//             '                            <tr>\n' +
//             '                                <td style="word-wrap:break-word;font-size:0px;padding:10px 25px;" align="center">\n' +
//             '                                    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;" align="center" border="0">\n' +
//             '                                        <tbody>\n' +
//             '                                        <tr>\n' +
//             '                                            <td style="border:none;border-radius:40px;color:#ffffff;cursor:auto;padding:10px 25px;" align="center" valign="middle" bgcolor="#1FBDF1">\n' +
//             '<a href="' + card.linktoaction + '"><p style="text-decoration:none;background:#1FBDF1;color:#ffffff;font-family:' + font + ';font-size:12px;font-weight:normal;line-height:120%;text-transform:none;margin:0px;">' + card.calltoaction + '</p> </a>\n' +
//             '                                            </td>\n' +
//             '                                        </tr>\n' +
//             '                                        </tbody>\n' +
//             '                                    </table>\n' +
//             '                                </td>\n' +
//             '                            </tr>\n' +
//             '                            </tbody>\n' +
//             '                        </table>\n' +
//             '                    </div>\n' +
//             '                    <!--[if mso | IE]>\n' +
//             '                    </td>';
//         var outtro = '<!--[if mso | IE]>\n' +
//             '    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;">\n' +
//             '        <tr>\n' +
//             '            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">\n' +
//             '    <![endif]-->\n' +
//             '    <div style="margin:0px auto;max-width:600px;">\n' +
//             '        <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:0px;width:100%;" align="center" border="0">\n' +
//             '            <tbody>\n' +
//             '            <tr>\n' +
//             '                <td style="text-align:center;vertical-align:top;direction:ltr;font-size:0px;padding:20px 0px;">\n' +
//             '                    <!--[if mso | IE]>\n' +
//             '                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">\n' +
//             '                        <tr>\n' +
//             '                            <td style="vertical-align:undefined;width:600px;">\n' +
//             '                    <![endif]-->\n' +
//             '                    <p style="font-size:1px;margin:0px auto;border-top:1px solid #d4d4d4;width:100%;"></p>\n' +
//             '                    <!--[if mso | IE]><table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" style="font-size:1px;margin:0px auto;border-top:1px solid #d4d4d4;width:100%;" width="600"><tr><td style="height:0;line-height:0;"> </td></tr></table><![endif]-->\n' +
//             '                    <!--[if mso | IE]>\n' +
//             '                    </td><td style="vertical-align:undefined;width:50px;">\n' +
//             '                    <![endif]-->\n' +
//             '                    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0px;" align="left" border="0">\n' +
//             '                        <tbody>\n' +
//             '                        <tr>\n' +
//             '                            <td style="width:50px;"><img alt="" title="" height="auto" src="https://jobo.asia/img/logo.png" style="border:none;border-radius:0px;display:block;font-size:13px;outline:none;text-decoration:none;width:100%;height:auto;" width="50"></td>\n' +
//             '                        </tr>\n' +
//             '                        </tbody>\n' +
//             '                    </table>\n' +
//             '                    <!--[if mso | IE]>\n' +
//             '                    </td><td style="vertical-align:undefined;width:200px;">\n' +
//             '                    <![endif]-->\n' +
//             '                    <div style="cursor:auto;color:#000000;font-family:Ubuntu, Helvetica, Arial, sans-serif;font-size:11px;line-height:22px;text-align:right;"><a href="https://goo.gl/awK5qg" style="color: #000000; text-decoration: none;">We are hiring</a></div>\n' +
//             '                    <!--[if mso | IE]>\n' +
//             '                    </td></tr></table>\n' +
//             '                    <![endif]-->\n' +
//             '                </td>\n' +
//             '            </tr>\n' +
//             '            </tbody>\n' +
//             '        </table>\n' +
//             '    </div>\n' +
//             '    <!--[if mso | IE]>\n' +
//             '    </td></tr></table>\n' +
//             '    <![endif]-->'
//
//
//         var htmlMail = '';
//         if (mail.description1) {
//             mail.description = trackingTemplate(mail.description1, notiId)
//             htmlMail = htmlMail + header + '\n' +
//                 '    <!--[if mso | IE]>\n' +
//                 '    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;">\n' +
//                 '        <tr>\n' +
//                 '            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">\n' +
//                 '    <![endif]-->\n' +
//                 '    <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;">' + mail.description + '</div>\n' +
//                 '    <!--[if mso | IE]>\n' +
//                 '    </td></tr></table>\n' +
//                 '    <![endif]-->';
//         }
//         if (mail.image) {
//             htmlMail = htmlMail + image
//         }
//
//         if (mail.description2) {
//             mail.description = trackingTemplate(mail.description2, notiId)
//             htmlMail = htmlMail + '\n' +
//                 '    <!--[if mso | IE]>\n' +
//                 '    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;">\n' +
//                 '        <tr>\n' +
//                 '            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">\n' +
//                 '    <![endif]-->\n' +
//                 '    <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;">' + mail.description + '</div>\n' +
//                 '    <!--[if mso | IE]>\n' +
//                 '    </td></tr></table>\n' +
//                 '    <![endif]-->';
//         }
//         if (mail.linktoaction) {
//             htmlMail = htmlMail + button
//
//         }
//         if (mail.description3) {
//             mail.description = trackingTemplate(mail.description3, notiId)
//             htmlMail = htmlMail + '\n' +
//                 '    <!--[if mso | IE]>\n' +
//                 '    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;">\n' +
//                 '        <tr>\n' +
//                 '            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">\n' +
//                 '    <![endif]-->\n' +
//                 '    <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;">' + mail.description + '</div>\n' +
//                 '    <!--[if mso | IE]>\n' +
//                 '    </td></tr></table>\n' +
//                 '    <![endif]-->';
//         }
//
//         if (mail.data) {
//             htmlMail = htmlMail + card_header
//             for (var i in mail.data) {
//
//                 var card = mail.data[i]
//                 htmlMail = htmlMail + '<td style="vertical-align:top;width:300px;">\n' +
//                     '                    <![endif]-->\n' +
//                     '                    <div class="mj-column-per-50 outlook-group-fix" style="vertical-align:top;display:inline-block;direction:ltr;font-size:13px;text-align:left;width:100%;">\n' +
//                     '                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">\n' +
//                     '                            <tbody>\n' +
//                     '                            <tr>\n' +
//                     '                                <td style="word-wrap:break-word;font-size:0px;padding:10px 25px;" align="center">\n' +
//                     '                                    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-spacing:0px;" align="center" border="0">\n' +
//                     '                                        <tbody>\n' +
//                     '                                        <tr>\n' +
//                     '                                            <td style="width:165px;"><img alt="" title="" height="auto" src="' + card.image + '" style="border:none;border-radius:0px;display:block;font-size:13px;outline:none;text-decoration:none;width:100%;height:auto;" width="165"></td>\n' +
//                     '                                        </tr>\n' +
//                     '                                        </tbody>\n' +
//                     '                                    </table>\n' +
//                     '                                </td>\n' +
//                     '                            </tr>\n' +
//                     '                            <tr>\n' +
//                     '                                <td style="word-wrap:break-word;font-size:0px;padding:10px 25px;" align="center">\n' +
//                     '                                    <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:16px;font-weight:bold;line-height:22px;text-align:center;">' + card.title + '</div>\n' +
//                     '                                </td>\n' +
//                     '                            </tr>\n' +
//                     '                            <tr>\n' +
//                     '                                <td style="word-wrap:break-word;font-size:0px;padding:10px 25px;" align="center">\n' +
//                     '                                    <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:center;">' + card.body + '</div>\n' +
//                     '                                </td>\n' +
//                     '                            </tr>\n' +
//                     '                            <tr>\n' +
//                     '                                <td style="word-wrap:break-word;font-size:0px;padding:10px 25px;" align="center">\n' +
//                     '                                    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;" align="center" border="0">\n' +
//                     '                                        <tbody>\n' +
//                     '                                        <tr>\n' +
//                     '                                            <td style="border:none;border-radius:40px;color:#ffffff;cursor:auto;padding:10px 25px;" align="center" valign="middle" bgcolor="#1FBDF1">\n' +
//                     '<a href="' + card.linktoaction + '"><p style="text-decoration:none;background:#1FBDF1;color:#ffffff;font-family:' + font + ';font-size:12px;font-weight:normal;line-height:120%;text-transform:none;margin:0px;">' + card.calltoaction + '</p> </a>\n' +
//                     '                                            </td>\n' +
//                     '                                        </tr>\n' +
//                     '                                        </tbody>\n' +
//                     '                                    </table>\n' +
//                     '                                </td>\n' +
//                     '                            </tr>\n' +
//                     '                            </tbody>\n' +
//                     '                        </table>\n' +
//                     '                    </div>\n' +
//                     '                    <!--[if mso | IE]>\n' +
//                     '                    </td>';
//             }
//             htmlMail = htmlMail + card_footer
//         }
//         if (mail.description4) {
//             mail.description = trackingTemplate(mail.description4, notiId)
//             htmlMail = htmlMail + '\n' +
//                 '    <!--[if mso | IE]>\n' +
//                 '    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;">\n' +
//                 '        <tr>\n' +
//                 '            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">\n' +
//                 '    <![endif]-->\n' +
//                 '    <div style="cursor:auto;color:#000;font-family:' + font + ';font-size:13px;line-height:22px;text-align:left;">' + mail.description + '</div>\n' +
//                 '    <!--[if mso | IE]>\n' +
//                 '    </td></tr></table>\n' +
//                 '    <![endif]-->';
//         }
//         if (mail.outtro) {
//             htmlMail = htmlMail + outtro
//         }
//
//         htmlMail = htmlMail + footer + `<hr>
// <p style="text-align: right;"><span style="color: rgb(204, 204, 204); font-size: 10px;"><a href="${CONFIG.WEBURL}/unsubscribe?id=${notiId}?email=${email}" rel="noopener noreferrer" style="text-decoration:none; color: rgb(204, 204, 204);" target="_blank">Từ chối nhận thư</a></span></p>
// `;
//         sendEmail(email, mail, htmlMail, notiId)
//             .then(notiId => resolve(notiId))
//             .catch(err => reject(err));
//     });
// }
function sendEmailTemplate(email, mail, notiId) {
    return new Promise((resolve, reject) => {
        var card = {}

        var header = `<div><img src="${addTrackingEmail(notiId, '/jobo.png', 'o', 'l')}"/>`;

        var footer = '</div>';


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
            mail.description = trackingTemplate(mail.description1, notiId)
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
            mail.description = trackingTemplate(mail.description2, notiId)
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
            mail.description = trackingTemplate(mail.description3, notiId)
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
            mail.description = trackingTemplate(mail.description4, notiId)
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

        htmlMail = htmlMail + footer + `<hr><p style="text-align: right;"><span style="color: rgb(204, 204, 204); font-size: 10px;"><a href="${CONFIG.WEBURL}/unsubscribe?id=${notiId}?email=${email}" rel="noopener noreferrer" style="text-decoration:none; color: rgb(204, 204, 204);" target="_blank">Từ chối nhận thư</a></span></p>`;


        sendEmail(email, mail, htmlMail, notiId)
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
                        console.log('err', err)
                        resolve({notiId, letter: false})
                    });
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
        var url = 'https://jobo-chat.herokuapp.com/noti';

        var param = {
            messages: {
                text: noti.body || '',
                calltoaction: noti.calltoaction || '',
                linktoaction: addTrackingEmail(key, noti.linktoaction, 'c', 'M') || '',
                image: noti.image || ''
            },
            recipientIds: messengerId
        };

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

app.get('/getallPost', (req, res) => {
    fetchFBPost().then(function (result) {
        return FacebookPost.find();
    })
        .then(posts => {
            res.status(200).json(posts);
        })
        .catch(function (err) {
            res.status(500).send(err);
        });
});

app.get('/getfbPost', function (req, res) {
    let {p: page, poster, to, jobId, id, still_alive, schedule} = req.query
    var query = {}
    if (poster) {
        query.poster = poster
    }
    if (to) {
        query.to = to
    }
    if (jobId) {
        query.jobId = jobId
    }
    if (id) {
        query.id = {$ne: null}
    }
    if (schedule) {
        query.time = {$gt: Date.now()}
    }
    if (still_alive) {
        query.id = {$ne: null};
        query.still_alive = true

    }

    FacebookPost.find(query)
        .then(posts => {

            var sorted = _.sortBy(posts, function (card) {
                return -card.time
            });
            res.status(200).json(getPaginatedItems(sorted, page))
        })
        .catch(err => res.status(500).json(err));
});

app.delete('/removePost', (req, res, next) => {
    let {p: page, poster, to, jobId, id, still_alive, schedule} = req.query
    var query = {}
    if (poster) {
        query.poster = poster
    }
    if (to) {
        query.to = to
    }
    if (jobId) {
        query.jobId = jobId
    }
    if (id) {
        query.id = {$ne: null}
    }
    if (schedule) {
        query.time = {$gt: Date.now()}
    }
    if (still_alive) {
        query.id = {$ne: null}
        query.still_alive = true

    }
    FacebookPost.remove(query)
        .then(result => res.status(200).json(result))
        .catch(err => res.status(500).send(err));

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


function addShortLinkFBPost(postId, text) {
    const link = text.match(/https:\/\/.*\$primary/g)[0].replace(/\$primary/g, '');
    console.log(link);
    if (link) {
        text = text.replace(/https:\/\/.*\$primary/g, addTrackingEmail(postId, link, 'c', 'f'));
    }
    return text;
}

function PublishFacebook(to, content, poster, postId, type) {
    return new Promise((resolve, reject) => {
        a++
        console.log('scheduleJob_PublishFacebook_run', to, poster, postId)
        var accessToken = facebookAccount[poster].access_token
        if (to && content && accessToken) {
            var url = to + "/feed?access_token=" + accessToken
            var params = {"message": content.text}

            if (content.type == 'image') {
                url = to + "/photos?access_token=" + accessToken
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
                        // facebookPostRef.child(postId).update({ id, sent: Date.now() })
                        FacebookPost.findOneAndUpdate({postId}, {id, still_alive, sent: Date.now()}, {new: true})
                            .then(updatedPost => resolve(updatedPost))
                            .catch(err => reject(err));
                    }
                });
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
    let {myId} = req.query

    for (var i in dumpling_user) {
        var user = dumpling_user[i]
        if (dumpling_friend[myId + ':' + user.userId]) {
            dumpling_user[i].mystatus = 'Đã thêm'
        } else if (dumpling_friend[user.userId + ':' + myId]) {
            dumpling_user[i].mystatus = 'Được thêm'
        }
    }
    res.send(dumpling_user)
});

app.get('/dumpling/profile', function (req, res) {
    let {userId, myId} = req.query
    console.log(req.query)
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
                    status: 'Đã thêm'

                }
                if (myId && dumpling_friend[myId + ':' + data.userId]) {
                    data.mystatus = 'Đã thêm'
                } else if (myId && dumpling_friend[data.userId + ':' + myId]) {
                    data.mystatus = 'Được thêm'
                }
                friendList.push(data)

            } else if (connectFriend.friend2 == userId) {
                var friendOfYou = dumpling_user[connectFriend.friend1]
                data = {
                    userId: friendOfYou.userId,
                    name: friendOfYou.name,
                    status: 'Được thêm'
                }
                if (myId && dumpling_friend[myId + ':' + data.userId]) {
                    data.mystatus = 'Đã thêm'
                } else if (myId && dumpling_friend[data.userId + ':' + myId]) {
                    data.mystatus = 'Được thêm'
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

let google = require('googleapis');
let authentication = require("./google_auth");
var auth
authentication.authenticate().then((auths) => {
    auth = auths;
});
var sheets = google.sheets('v4');

function getData(auth, spreadsheetId, range) {
    return new Promise((resolve, reject) => {
        var sheets = google.sheets('v4');
        sheets.spreadsheets.values.get({
            auth: auth,
            spreadsheetId,
            range, //Change Sheet1 if your worksheet's name is something else
        }, (err, response) => {
            if (err) {
                console.log('The API returned an error: ' + err);
                reject(err);
            }
            var rows = response.values;
            resolve(rows);
        });
    });
}

function clearData(auth, spreadsheetId, range) {
    return new Promise((resolve, reject) => {
        sheets.spreadsheets.values.clear({
            auth: auth,
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

profileRouter.route('/export')
    .get((req, res, next) => {
        exportProfile()
            .then(data => res.json(data))
            .catch(err => res.send(`Err: ${JSON.stringify(err)}`));
    });
profileRouter.route('/import')
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

function exportProfile() {
    return new Promise((resolve, reject) => {
        profileRef.orderByChild('createdAt').once('value')
            .then(_profiles => {
                return Promise.resolve(_.toArray(_profiles.val()));
            })
            .then(profiles => {
                return Promise.resolve(profiles.map(profile => {
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
                    return [userId, new Date(profile.createdAt).toLocaleString(), profile.name, profile.school, profile.address, profile.avatar, new Date(profile.birth).toLocaleString(), profile.weight, profile.working_type, time, industry, profile.description, profile.expect_distance, profile.expect_salary, experience, profile.figure, profile.height, job, languages, profile.videourl, photo, note, date];
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


app.get('/lead/export', (req, res, next) => {
    exportLead()
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).send(err));
});

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


function getLead() {
    return new Promise((resolve, reject) => {
        leadCol.find({}).toArray((err, data) => {
            if (err) {
                reject(err);
            } else {
                console.log('data', data.length)
                resolve(data);
            }
        });
    });
}

function exportLead() {
    return new Promise((resolve, reject) => {
        getLead()
            .then(leads => {
                return Promise.resolve(leads.map(lead => {
                    let adminNote = '';
                    if (lead.adminNote && lead.adminNote != '') {
                        adminNote = JSON.stringify(lead.adminNote)
                    }
                    return [lead.storeId, lead.userId, lead.storeName, lead.address, lead.name, lead.phone, lead.email, lead.job, lead.industry, lead.ref, adminNote];
                }));
            })
            .then(values => {
                console.log('getLead', values.length)
                return newLead(values);
            })
            .then(values => resolve(values))
            .catch(err => {
                console.log(err);
                reject(err);
            });
    });
}

function newLead(values) {
    return new Promise((resolve, reject) => {
        const spreadsheetId = '1mVEDpJKiDsRfS7bpvimL7OZQyhYtu_v44hzPUcG14Vk';
        const range = 'LeadCOL!A2:L';

        clearData(auth, spreadsheetId, range)
            .then(() => appendData(auth, spreadsheetId, range, values))
            .then(values => resolve(values))
            .catch(err => reject(err));
    });
}

///\.|-|\(|\)|\s/g


app.get('/removeAdminNote/:type', (req, res, next) => {
    const noteId = req.query.noteId;
    const leadId = req.query.leadId;
    const type = req.params.type;
    // "storeId": leadId
    if (type == 'lead') {
        leadCol.updateOne({"storeId": leadId}, {
            $pull: {
                "adminNote": {
                    "id": Number(noteId)
                }
            }
        }, {multi: true}).then(function (data) {
            res.send({code: 'success', data})
        }).catch(function (err) {
            res.send({code: 'error', err})
        });
    }
});

app.get('/removeLead/:leadId', (req, res) => {
    const leadId = req.params.leadId;
    leadCol.remove({storeId: leadId})
        .then(function (data) {
            res.send({code: 'success', data})
        }).catch(function (err) {
        res.send({code: 'error', err})
    });
});

app.get('/fbgroup/:groupId/members', (req, res, next) => {
    const groupId = req.params.groupId;
    const limit = req.query.limit || 5000;
    const after = req.query.after;
    const before = req.query.before;
    let query = `?limit=${limit}`;
    if (after && before) return res.status(463).json({
        error_subcode: 463,
        message: 'Before and after can\'t be use together'
    });

    if (after) query += `&after=${after}`;
    if (before) query += `&before=${before}`;

    graph.get(groupId + "/members" + query, function (err, result) {
        if (err) {
            res.status(500).json(err);
        } else {
            const paging = {};
            if (result.paging && result.paging.cursors) paging.cursors = result.paging.cursors;
            if (result.paging && result.paging.next) paging.next = result.paging.next.replace('https://graph.facebook.com/v2.8/', 'https://joboana.herokuapp.com/fbgroup/');
            if (result.paging && result.paging.previous) paging.previous = result.paging.previous.replace('https://graph.facebook.com/v2.8/', 'https://joboana.herokuapp.com/fbgroup/');

            res.status(200).json(Object.assign({}, result, {paging}));
        }
    })
});

app.get('/deadline/job', (req, res, next) => {
    const {after = 0, before = 24} = req.query;
    const now = Date.now();
    db.ref('job').orderByChild('deadline').once('value')
        .then(_jobs_ => {
            const jobs = _.filter(_jobs_.val(), job => {
                const time = (job.deadline - now) / 1000 / 60 / 60;
                if (time <= before && time >= after) return true;
                else return false;
            });

            if (jobs.length === 0) return res.status(200).send('OK');

            //1100401513397714;1460902087301324;1226124860830528
            let text = '';


            text = `Có ${jobs.length} công việc đã/sẽ hết hạn trước ${new Date(Date.now() + (1000 * 60 * 60 * before)).toLocaleString()}`;

            const recipientIds = req.query.recipientIds ? JSON.parse(req.query.recipientIds) : ["1226124860830528", "1100401513397714"];
            let data = {
                recipientIds,
                messages: {
                    text
                }
            };

            axios.post('https://jobobot.herokuapp.com/noti', data)
                .then(re => {
                    return Promise.all([
                        ...jobs.map(job => {
                            text = '\n♥';
                            text += ` ${job.jobName} ➡ https://www.jobo.asia/view/store/${job.storeId}?jobId=${job.jobId}`;
                            data = {
                                recipientIds,
                                messages: {
                                    text
                                }
                            };
                            return axios.post('https://jobobot.herokuapp.com/noti', data);
                        })
                    ]);
                })
                .then(response => res.status(200).send(response.data))
                .catch(err => console.log(err));
        })
        .catch(err => res.status(500).send(err));
});


app.get('/wrongEmail', (req, res, next) => {
    userRef.once('value')
        .then(_users => {
            const users = _.toArray(_users.val());
            return Promise.all(users.map(user => {
                if (!user || _.isEmpty(user) || !user.userId) return Promise.resolve({user: null});
                else if (!user.email) return userRef.child(user.userId).update({
                    wrongEmail: true
                });
                else {
                    return verifier.verify(user.email, function (err, info) {
                        if (err) return userRef.child(user.userId).update({
                            wrongEmail: true
                        });
                        else {
                            if (info.success) return Promise.resolve({user, status: true});
                            else return userRef.child(user.userId).update({wrongEmail: true});
                        }
                    });
                }
            }));
        })
        .then(users => res.json(users))
        .catch(err => console.log(err));
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

app.get('/job/export', (req, res, next) => {
    const spreadsheetId = '1mVEDpJKiDsRfS7bpvimL7OZQyhYtu_v44hzPUcG14Vk';
    const range = 'JobCOL!A2:J';

    joboTest.database().ref('job').once('value')
        .then(_jobs => {
            const jobs = _.sortBy(_jobs.val(), function (card) {
                return -card.createdAt
            })
            return Promise.all(jobs.map(job => {
                return [job];
            }));
        })
        .then(values => appendData(auth, spreadsheetId, range, values))
        .then(data => res.status(200).json(data))
        .catch(err => res.status(500).send(err));
});