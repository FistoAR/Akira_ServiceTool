const User = require('../models/user.model');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const registerUser = async (userData) => {
  const { name, email, password } = userData;

  const userExists = await User.findOne({ $or: [{ email: userData.email }, { userId: userData.userId }] });

  if (userExists) {
    throw new Error('User already exists');
  }

  const user = await User.create(userData);

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
  const user = await User.findOne({ 
    $or: [
      { email: emailOrUserId }, 
      { userId: emailOrUserId }
    ] 
  });

  if (user && (await user.matchPassword(password))) {
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

const getUsers = async () => {
  return await User.find({}).select('-password');
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
    user.profilePicture = userData.profilePicture || user.profilePicture;
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
  updateUser,
};
