let fs = require('fs');
let readline = require('readline');
let googleAuth = require('google-auth-library');

let SCOPES = [];
SCOPES[0] ='https://www.googleapis.com/auth/spreadsheets';
SCOPES[1] ='https://www.googleapis.com/auth/forms';
SCOPES[2] ='https://www.googleapis.com/auth/script.external_request';
SCOPES[3] ='https://www.googleapis.com/auth/drive.scripts';
SCOPES[4] ='https://www.googleapis.com/auth/drive.metadata.readonly';
SCOPES[5] ='https://www.googleapis.com/auth/drive';
SCOPES[6] ='https://www.googleapis.com/auth/drive.appdata';
SCOPES[7] ='https://www.googleapis.com/auth/drive.apps.readonly';
SCOPES[8] ='https://www.googleapis.com/auth/drive.photos.readonly';
SCOPES[8] ='https://www.googleapis.com/auth/drive.file';



const TOKEN_DIR = './'; //the directory where we're going to save the token
const TOKEN_PATH = TOKEN_DIR + 'google_oauth_token.json'; //the file which will contain the token

class Authentication {
    authenticate() {
        return new Promise((resolve, reject) => {
            let credentials = this.getClientSecret();
            let authorizePromise = this.authorize(credentials);
            authorizePromise.then(resolve, reject);
        });
    }

    getClientSecret() {
        return require('./google_sheets_api_client_secret.json');
    }

    authorize(credentials) {
        var clientSecret = credentials.installed.client_secret;
        var clientId = credentials.installed.client_id;
        var redirectUrl = credentials.installed.redirect_uris[0];
        var auth = new googleAuth();
        var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

        return new Promise((resolve, reject) => {
            // Check if we have previously stored a token.
            fs.readFile(TOKEN_PATH, (err, token) => {
                if (err) {
                    this.getNewToken(oauth2Client).then((oauth2ClientNew) => {
                        resolve(oauth2ClientNew);
                    }, (err) => {
                        reject(err);
                    });
                } else {
                    oauth2Client.credentials = JSON.parse(token);
                    resolve(oauth2Client);

                }
            });
        });
    }

    getNewToken(oauth2Client, callback) {
        return new Promise((resolve, reject) => {
            var authUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: SCOPES
            });
            console.log('Authorize this app by visiting this url: \n ', authUrl);
            var rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            rl.question('\n\nEnter the code from that page here: ', (code) => {
                rl.close();
                oauth2Client.getToken(code, (err, token) => {
                    if (err) {
                        console.log('Error while trying to retrieve access token', err);
                        reject();
                    }
                    oauth2Client.credentials = token;
                    this.storeToken(token);
                    resolve(oauth2Client);
                });
            });
        });
    }

    storeToken(token) {
        try {
            fs.mkdirSync(TOKEN_DIR);
        } catch (err) {
            if (err.code != 'EEXIST') {
                throw err;
            }
        }
        fs.writeFile(TOKEN_PATH, JSON.stringify(token));
        console.log('Token stored to ' + TOKEN_PATH);
    }
}

module.exports = new Authentication();