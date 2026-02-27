const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const boutiqueSchema = new mongoose.Schema({
  mail: {
    type: String,
    required: [true, 'L\'email est requis'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Format d\'email invalide']
  },
  mdp: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    select: false  // jamais retourné par défaut
  },
  nom: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  typeCommerce: {
    type: String,
    required: [true, 'Le type de commerce est requis']
  },
  contact: {
    numero: String,
    email: String,
    reseau: String
  },
  logo: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

boutiqueSchema.index({ typeCommerce: 1 });
boutiqueSchema.index({ nom: 1 });

boutiqueSchema.pre('save', async function() {
  if (!this.isModified('mdp')) return;
  const salt = await bcrypt.genSalt(10);
  this.mdp = await bcrypt.hash(this.mdp, salt);
});

boutiqueSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.mdp);
};

module.exports = mongoose.model('Boutique', boutiqueSchema);