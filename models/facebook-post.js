'use strict';

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

var _mongooseTimestamp = require('mongoose-timestamp');

var _mongooseTimestamp2 = _interopRequireDefault(_mongooseTimestamp);

function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {default: obj};
}

var postSchema = new _mongoose.Schema({
    id: {
        type: String,
        index: true,
        default: null
    },
    jobId: String,
    postId: {
        type: String,
        index: {unique: true}
    },
    poster: {
        type: String,
        index: true,
        require: true,
        lowercase: true
    },
    content: {
        image: {
            type: String,
            default: null
        },
        link: {
            type: String,
            default: null
        },
        text: {
            type: String,
            default: null
        }
    },
    sent: {
        type: Date,
        default: Date.now()
    },
    sent_error: {
        type: String,
        default: null
    },
    storeId: String,
    time: {
        type: Date,
        default: Date.now()
    },
    checks: [],
    to: String,
    still_alive: Boolean,
    checkAt: {
        type: Date,
        default: null
    },
    comments: {
        type: Array,
        default: null
    },
    reactions: {
        type: Object,
        default: null
    },
    check_error: {
        type: String,
        default: null
    }

}, {collection: 'facebookPost'});

postSchema.set('toJSON', {virtuals: true});
postSchema.set('toObject', {virtuals: true});

postSchema.plugin(_mongooseTimestamp2.default);
module.exports = _mongoose2.default.model('FacebookPost', postSchema);
