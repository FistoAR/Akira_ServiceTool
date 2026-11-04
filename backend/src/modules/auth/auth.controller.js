const authService = require('./auth.service');

const register = async (req, res) => {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json({ user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { emailOrUserId, password } = req.body;
    const user = await authService.loginUser(emailOrUserId, password);
    res.json({ user });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

const getEmployees = async (req, res) => {
  try {
    const includePic = req.query.includePic === 'true';
    const users = await authService.getUsers(includePic);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEmployeePictures = async (req, res) => {
  try {
    const pictures = await authService.getEmployeePictures();
    res.json(pictures);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEmployeePictureById = async (req, res) => {
  try {
    const picture = await authService.getEmployeePictureById(req.params.id);
    if (!picture) return res.status(404).json({ message: 'Not found' });
    res.json(picture);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const user = await authService.updateUser(req.params.id, req.body);
    res.json({ user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  getEmployees,
  getEmployeePictures,
  getEmployeePictureById,
  updateEmployee,
};
