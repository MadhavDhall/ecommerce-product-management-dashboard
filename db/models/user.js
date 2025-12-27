const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcrypt');

const userSchema = new Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'viewer' },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (this.isModified('passwordHash')) {
        // hash the password with bcrypt 
        this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
    }
    next();
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;