// controllers/userController.js
const User = require('../models/User');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-mdp'); // ne pas renvoyer le mot de passe
    res.json(users);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-mdp');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User non trouvé' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    const { mdp, ...userWithoutPassword } = user.toObject();
    res.status(201).json(userWithoutPassword);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).select('-mdp');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User non trouvé' });
    }
    res.json(user);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User non trouvé' });
    }
    res.json({ success: true, message: 'User supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};