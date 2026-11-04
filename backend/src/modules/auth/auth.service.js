const User = require('./user.model');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const mongoose = require('mongoose');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Auto-compress profile picture to lightweight avatar (max 180x180 WebP, ~2-5KB)
const compressProfilePicture = async (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return dataUrl;
  try {
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return dataUrl;
    const buffer = Buffer.from(matches[2], 'base64');
    const compressedBuffer = await sharp(buffer)
      .resize(180, 180, { fit: 'cover', position: 'center' })
      .webp({ quality: 80 })
      .toBuffer();
    return `data:image/webp;base64,${compressedBuffer.toString('base64')}`;
  } catch (err) {
    console.warn('Image compression fallback:', err.message);
    return dataUrl;
  }
};

const registerUser = async (userData) => {
  const userExists = await User.findOne({ $or: [{ email: userData.email }, { userId: userData.userId }] });

  if (userExists) {
    throw new Error('User already exists');
  }

  const payload = { ...userData };
  if (payload.profilePicture) {
    payload.profilePicture = await compressProfilePicture(payload.profilePicture);
  }

  const user = await User.create(payload);

  if (user) {
    return {
      _id: user._id,
      name: user.name,
      userId: user.userId,
      email: user.email,
      phoneNumber: user.phoneNumber,
      dob: user.dob,
      gender: user.gender,
      role: user.role,
      department: user.department,
      designation: user.designation,
      ctc: user.ctc,
      dateOfJoining: user.dateOfJoining,
      workingStatus: user.workingStatus,
      profilePicture: user.profilePicture,
      permissions: user.permissions,
      token: generateToken(user._id),
    };
  } else {
    throw new Error('Invalid user data');
  }
};

const loginUser = async (emailOrUserId, password) => {
  const trimmedInput = (emailOrUserId || '').trim();
  const trimmedPassword = (password || '').trim();

  const escapedInput = trimmedInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const user = await User.findOne({ 
    $or: [
      { email: { $regex: new RegExp(`^${escapedInput}$`, 'i') } }, 
      { userId: { $regex: new RegExp(`^${escapedInput}$`, 'i') } }
    ] 
  });

  if (user && ((await user.matchPassword(password)) || (await user.matchPassword(trimmedPassword)))) {
    return {
      _id: user._id,
      name: user.name,
      userId: user.userId,
      email: user.email,
      phoneNumber: user.phoneNumber,
      dob: user.dob,
      gender: user.gender,
      role: user.role,
      department: user.department,
      designation: user.designation,
      ctc: user.ctc,
      dateOfJoining: user.dateOfJoining,
      workingStatus: user.workingStatus,
      profilePicture: user.profilePicture,
      permissions: user.permissions,
      token: generateToken(user._id),
    };
  } else {
    throw new Error('Invalid credentials');
  }
};

// Returns employees fast without heavy base64 profilePicture
const getUsers = async (includePic = false) => {
  const query = User.find({}).select('-password');
  if (!includePic) {
    query.select('-profilePicture');
  }
  return await query.lean();
};

// Returns profile pictures only for progressive loading
const getEmployeePictures = async () => {
  return await User.find({ profilePicture: { $exists: true, $ne: null } })
    .select('_id userId profilePicture')
    .lean();
};

const getEmployeePictureById = async (id) => {
  const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { userId: id };
  return await User.findOne(query).select('_id userId profilePicture').lean();
};

const updateUser = async (id, userData) => {
  const user = await User.findById(id);

  if (user) {
    user.name = userData.name || user.name;
    user.email = userData.email || user.email;
    user.phoneNumber = userData.phoneNumber || user.phoneNumber;
    user.dob = userData.dob || user.dob;
    user.gender = userData.gender || user.gender;
    user.role = userData.role || user.role;
    user.department = userData.department || user.department;
    user.designation = userData.designation || user.designation;
    user.ctc = userData.ctc || user.ctc;
    user.dateOfJoining = userData.dateOfJoining || user.dateOfJoining;
    user.workingStatus = userData.workingStatus || user.workingStatus;
    if (userData.profilePicture !== undefined) {
      user.profilePicture = await compressProfilePicture(userData.profilePicture);
    }
    if (userData.permissions) {
      user.permissions = userData.permissions;
      user.markModified('permissions');
    }

    if (userData.password) {
      user.password = userData.password;
    }

    const updatedUser = await user.save();

    return {
      _id: updatedUser._id,
      name: updatedUser.name,
      userId: updatedUser.userId,
      email: updatedUser.email,
      phoneNumber: updatedUser.phoneNumber,
      dob: updatedUser.dob,
      gender: updatedUser.gender,
      role: updatedUser.role,
      department: updatedUser.department,
      designation: updatedUser.designation,
      ctc: updatedUser.ctc,
      dateOfJoining: updatedUser.dateOfJoining,
      workingStatus: updatedUser.workingStatus,
      profilePicture: updatedUser.profilePicture,
      permissions: updatedUser.permissions,
      token: generateToken(updatedUser._id),
    };
  } else {
    throw new Error('User not found');
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUsers,
  getEmployeePictures,
  getEmployeePictureById,
  updateUser,
  compressProfilePicture,
};
