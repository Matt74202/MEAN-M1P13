const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  mail: { type: String, required: true, unique: true },
  mdp: { type: String, required: true },
  adresse: { type: String },
  role: { type: String },
  description: { type: String },
  TypeCommerce: { type: String },
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);