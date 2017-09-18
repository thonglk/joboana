import mongoose, { Schema } from 'mongoose';
import timestamps from 'mongoose-timestamp';

const postSchema = new Schema({
    id: {
        type: String,
        index: true,
        default: null
    },
    jobId: String,
    postId: {
        type: String,
        index: {unique: true},
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
    to: String
}, { collection: 'facebookPost' });

postSchema.set('toJSON', { virtuals: true });
postSchema.set('toObject', { virtuals: true });

postSchema.plugin(timestamps);
module.exports = mongoose.model('FacebookPost', postSchema);