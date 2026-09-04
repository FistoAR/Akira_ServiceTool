const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
    },
    dob: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
    },
    role: {
      type: String,
      required: true,
    },
    department: {
      type: String,
    },
    designation: {
      type: String,
    },
    ctc: {
      type: Number,
    },
    dateOfJoining: {
      type: Date,
    },
    workingStatus: {
      type: String,
      required: true,
      default: 'Active',
    },
    profilePicture: {
      type: String,
    },
    permissions: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    notificationSettings: {
      onlyUnread: { type: Boolean, default: false },
      sortOrder: { type: String, default: 'Desc' }
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

userSchema.index({ role: 1 });
userSchema.index({ workingStatus: 1 });
userSchema.index({ userId: 1 });
module.exports = User;
