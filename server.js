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
var unflatten = require('flat').unflatten
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


// TODO(DEVELOPER): Configure your email transport.

app.use(cors());
app.use(express.static(__dirname + '/static'));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

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

initData('facebookPage')


var secondary = firebase.initializeApp({
    credential: firebase.credential.cert('adminsdk-jobo.json'),
    databaseURL: "https://jobo-b8204.firebaseio.com"
}, "secondary");
var joboPxl = firebase.initializeApp({
    credential: firebase.credential.cert({
        "type": "service_account",
        "project_id": "jobo-pxl",
        "private_key_id": "0966e80d48e1011f14af3b024bb63a1b1deb3a0e",
        "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCWhUanh3b8jGvu\nH3M5kgqni7bva+0r2avz1ZE9LnkraV6GQ7NwHGcCAtEPqVeDaGvWVp+HaDfmg+T8\nh5TYl1A1KqmoHHsOagNOorRdUEHEh5kLjJbAIjjkideX4fLZ/cPfFfzM0+bbrQH+\nJlVSaqSeCY4dHaaIx/4XaimNoqbicjplzLMoCR1qBks/CkudO0haibSOFCtBoGLL\nAKfC2C5Ixh9KrnG9b9hqPGPXPDpnhe0IeGQEIefPBVHWfSClu5I0Ku2dooOgL2q6\nlKbj2xfRFrXpMBW7l/1TrIiDbLQ6T86kbm3C78Bidgpliq6pkyhUnKwZ4DOU3Yvo\nFvLgiqbjAgMBAAECggEAQ2ndgxrAx8t8a2HakWY/L1r7y69iwcjzonl8WxJ9YlwG\n4ctgik2uNNBeIc2OTGRwJ8cUG+kpYCyiWhe/KmJaofVBlvFqi8IfSRDGByTyz7qL\naQjGW7b4FCNIU9X2lnt5RmjqmDIvqyOJSPKSNB9fKwjMhW3KMGih/Iqnoa+/Xptq\nNytqrjXkawOW5wH1Ro9SWcOnhFZ+qi2Cip6TVP5Aleu6jSznZC/ZylScnNG0X/xZ\nv3lkucTNZT50jBSHKkdiohMV0owlt7RrQaz4M2a4OhxGgE30uont1UPh/LZzvpTI\nuVFdFJNG/2LFstP+US3NK1S22K3suBlr/XkRSeBxgQKBgQDQTKdDZUXSMer7h43B\nNy2b2aN2AEEaIbM+v51zLJ9JHeAryTLs7kD+zbLCnBi8NqTrhLbSWTtgjjtSsNlO\nh/NsD3kPDIpslRaN0z+BwCHku+ALVjfdRIecgpChDI+4LI8JPEddvHXj1N2gPt+I\nBuPNcpxmeXKkwr8/O0YKcAeimQKBgQC4/WWcwC0eIyyrGQXRbICVVEL2aHFtXBrN\nLMymxn3sLabNQwoqlRFsU6NQ1tGRbwqBlgJsCCy6YSFoWAHY9u4z4ERBdPVFRQ98\nxaFAfNV+/U/Hj19NZJXsBcXzCqPn2F8YCRo8+kMyj5p2qVcQQ0SvcFK5wMLp9mq8\nZHx+FB2+2wKBgQCLlJIQ63AaJjEcU/19mAgMA48xp4H4jNScG7LaVvB2AnsRXEWv\n1wfetuAu4IMCvGtPFyObWQgc77J4+uDjat6HbubkWrb3hAAVEZXg0Grl569+aUwO\nDboB+swH327/L3y555a7DWrCPQY2N2t6r4M/TKnZUVCtb4LQUFvi6qdzIQKBgBn6\n3G5rPurgncFZvktvJY/TSaQ5ftSQ/uKZzBQQBFdLAgYJyD+6t7uy81jDEqOOKLeS\nTbzGWSHDymFRGtFRvJpkgLGAr4GO9WHcj4zy+zjecnngVM4Vtkhzdx1u/R3ucUx6\n2sh9jTpomJTZq3SJPfg1miikPbuF8++JXUKHqLXJAoGBAMIa6gp32xvnETwi+f7H\neo2YRaDWx2cOlkcDO7itJlvYOEBGatqI4b4sVdiyBVrEcSwsj/mzIcDKP6cfEQnl\nYkzTKbRYR3SBRy3lr+Dv9zsvDPOe72TfaXQEmO277GgYNoj27FCkg27Ws3Lcr3K7\nYgm3Vo7dpvZJ8bsOTXI2QkWd\n-----END PRIVATE KEY-----\n",
        "client_email": "firebase-adminsdk-5btfq@jobo-pxl.iam.gserviceaccount.com",
        "client_id": "117805772525673114490",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://accounts.google.com/o/oauth2/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-5btfq%40jobo-pxl.iam.gserviceaccount.com"
    }),
    databaseURL: "https://jobo-pxl.firebaseio.com"
}, 'jobo-pxl');


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


    configRef.on('value', function (snap) {
        CONFIG = snap.val()
        facebookAccount = CONFIG.facebookAccount;
        graph.setAccessToken(CONFIG.default_accessToken);
    })
    //test


}


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

app.get('/l/:queryString', (req, res) => {
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


function keygen() {

    const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ' // chars that can be safely used in urls
    const keylen = 6

    let key = ''
    for (let i = 0; i < keylen; i += 1) {
        key += alphabet[_.random(0, alphabet.length - 1)]
    }
    return key
}

function addTrackingEmail(notiId, url = 'https://botform.me/data/jobo.png', t = 'o', p = 'l', i = '') {
    var trackUrl = '';
    var platform = configP[p];
    var type = configT[t];
    var urlId = '';

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

        joboPxl.database().ref('notification').child(notiId).update(data)
            .then(() => resolve({notiId, url}))
            .catch(err => {
                reject(err);
            });
    });
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
            html = html.replace(link, tracking);

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
        const url = `https://graph.facebook.com/debug_token?input_token=${longLiveToken}&access_token=295208480879128|pavmPhKnN9VWZXLC6TdxLxoYFiY`;

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

function getData(auth, spreadsheetId = '1mVEDpJKiDsRfS7bpvimL7OZQyhYtu_v44hzPUcG14Vk', range, query) {
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
    if (!rows) return []

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
            if (err) reject(err);

            console.log('clear Data')
            resolve(response);


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


function updateData(auth, spreadsheetId, range, values) {
    return new Promise((resolve, reject) => {
        sheets.spreadsheets.values.update({
            spreadsheetId,
            range, //Change Sheet1 if your worksheet's name is something else
            valueInputOption: "USER_ENTERED",
            resource: {
                values
            }
        }, (err, response) => {
            if (err) {
                console.log('The API returned an error: ' + err);
                reject(err);
            } else {
                console.log("Updated");
                resolve({response});
            }
        });
    });
}

function addSheet(auth, spreadsheetUrl, title, sheets) {
    return new Promise((resolve, reject) => {

        sheets.spreadsheets.create({
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


app.get('/clearData', ({query}, res) => {
    const spreadsheetId = query.sheetId || '1mVEDpJKiDsRfS7bpvimL7OZQyhYtu_v44hzPUcG14Vk';
    const range = query.range || 'LeadCOL!A2:L';

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


function saveDataToSheet(pageID, spreadsheetId, range = 'users') {
    return new Promise((resolve, reject) => {

        axios.get(`http://botform-webserver.herokuapp.com/viewResponse?page=${pageID}`).then(result => {


            var where = result.data.data

            var data = _.sortBy(where, function (data) {
                if (data.createdAt) {
                    return data.createdAt
                } else return 0
            })


            var pretty = data.map(per => {

                delete per.lastReceive
                delete per.lastSent
                return per

            })

            var firstRow = ['id']

            var map = pretty.map(per => {
                per = flat(per)
                for (var i in per) {
                    if (JSON.stringify(firstRow).match(i)) {
                    }
                    else firstRow.push(i)
                }
            })

            console.log('firstRow', firstRow)

            var map = pretty.map(per => {
                per = flat(per)
                var valueArray = []
                for (var i in per) {
                    var index = _.indexOf(firstRow, i)
                    valueArray[index] = per[i]
                }
                return valueArray
            })


            map.splice(0, 0, firstRow);

            updateData(auth, spreadsheetId, range, map)
                .then(result => resolve(result))
                .catch(err => reject(err))
        })
    })
}

function getDataFromRef(ref) {
    return new Promise((resolve, reject) => {
        db.ref(ref).once('value', function (snap) {
            var data = _.toArray(snap.val())
            resolve(data)
        })

    })
}

function saveDataSheet(ref, spreadsheetId, range = 'users') {
    return new Promise((resolve, reject) => {
        getDataFromRef(ref).then(data => {

            var firstRow = ['id']

            var map = data.map(per => {
                per = flat(per)
                for (var i in per) {
                    if (JSON.stringify(firstRow).match(i)) {
                    }
                    else firstRow.push(i)
                }
            })

            console.log('firstRow', firstRow)

            var map = data.map(per => {
                per = flat(per)
                var valueArray = []
                for (var i in per) {
                    var index = _.indexOf(firstRow, i)
                    valueArray[index] = per[i]
                }
                return valueArray
            })


            map.splice(0, 0, firstRow);

            updateData(auth, spreadsheetId, ref, map)
                .then(result => resolve(result))
                .catch(err => reject(err))

        })


    })
}

app.get('/saveData', ({query}, res) => saveDataSheet(query.ref, query.sheetId).then(result => res.send(result)).catch(err => res.status(500).json(err)))

app.post('/saveData', ({query, body}, res) => saveData(query, body).then(result => res.send(result)).catch(err => res.status(500).json(err)))

function saveData(query, body) {
    return new Promise((resolve, reject) => {
        var data = body
        var sheetId = query.sheet
        var range = query.range

        var firstRow = []

        var map = data.map(per => {
            per = flat(per)
            for (var i in per) {
                if (JSON.stringify(firstRow).match(i)) {
                }
                else firstRow.push(i)
            }
        })

        console.log('firstRow', firstRow)

        var map = data.map(per => {
            per = flat(per)
            var valueArray = []
            for (var i in per) {
                var index = _.indexOf(firstRow, i)
                valueArray[index] = per[i]
            }
            return valueArray
        })


        map.splice(0, 0, firstRow);

        updateData(auth, sheetId, range, map)
            .then(result => resolve(result))
            .catch(err => reject(err))
    })

}

app.post('/pushData', ({query, body}, res) => {

    getData(auth, query.sheet, query.range, query.search)
        .then(rows => {
            var old_data = rows.data
            old_data = old_data.concat(body)
            saveData(query, old_data).then(result => res.send(result))
                .catch(err => res.status(500).json(err))
        })


})


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
//
// function funnel(userData = {
//     email: "thonglk.mac@gmail.com",
//     name: "Thông Lê",
//     id: "123",
//     send_now: "TRUE",
//     "Download free ebook": "TRUE",
//     "View course": "TRUE",
//     vua_xem_wordcup__vua_hoc_thiet_ke_online_voi_3_khoa_combo_: "sent 11:35 27/6 GMT+0 sent 12:33 27/6 GMT+0 open 12:33 27/6 GMT+0",
//     combo_3_khoa_hoc_thiet_ke_tu_moi_bat_dau_thanh_pro_designer_: "sent 11:49 28/6 GMT+0 open 11:50 28/6 GMT+0 "
// }, funnelData = [
//     {
//         funnel: "Download free ebook",
//         content_1: "Ebook Giveaway: Học PHOTOSHOP TỪ A-Z"
//     },
//     {
//         funnel: "View course",
//         content_1: "Combo 3 khóa học thiết kế từ MỚI BẮT ĐẦU thành PRO Designer",
//         content_2: "Vừa xem Wordcup, vừa học thiết kế online với 3 khóa Combo"
//     },
//     {
//         funnel: "Register"
//     },
//     {
//         funnel: "Payment"
//     },
//     {
//         funnel: "Learn"
//     },
//     {
//         funnel: "Register another course"
//     }
// ]) {
//
//     if (!userData.next_step) return {message: "No next_step"}
//     var currentFunnel = _.findWhere(funnelData, {funnel: userData.next_step})
//     if (!currentFunnel) return {message: "No match funnel"}
//
//     if (!userData[currentFunnel.content_1]) {
//         if (currentFunnel.content_1) return {content: currentFunnel.content_1}
//         else return {message: "No content", content: "content_1", funnel: currentFunnel.funnel}
//
//     } else if (!userData[currentFunnel.content_2]) {
//         if (currentFunnel.content_2) return {content: currentFunnel.content_2}
//         else return {message: "No content", content: "content_2", funnel: currentFunnel.funnel}
//
//     } else if (!userData[currentFunnel.content_3]) {
//         if (currentFunnel.content_3) return {content: currentFunnel.content_3}
//         else return {message: "No content", content: "content_3", funnel: currentFunnel.funnel}
//
//     } else return {message: "Out of content", funnel: currentFunnel.funnel}
//
//
// }
//
// console.log(funnel())
//
