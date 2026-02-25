const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true,
    minlength: [2, 'Le nom doit contenir au moins 2 caractères']
  },
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
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
    select: false
  },
  adresse: {
    type: String,
    trim: true
  },
  role: {  // Nouveau champ pour les rôles
    type: String,
    required: [true, 'Le rôle est requis'],
    enum: ['supermarche', 'boutique', 'client'],  // Vos rôles définis
    default: 'client'  // Par défaut client, pour sécurité
  },
  // Champs supplémentaires pour boutique (optionnels, seulement si role='boutique')
  description: {
    type: String,
    required: function() { return this.role === 'boutique'; }
  },
  typeCommerce: {
    type: String,
    required: function() { return this.role === 'boutique'; }
  },
  contact: {
    numero: String,
    email: String,
    reseau: String
  },
  logo: String,
  // Champs supplémentaires pour client (optionnels)
  prenom: {
    type: String,
    required: function() { return this.role === 'client'; }
  },
  // createdAt reste inchangé
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware pour hashage du mot de passe (inchangé)
userSchema.pre('save', async function() {
  if (!this.isModified('mdp')) return;
  const salt = await bcrypt.genSalt(10);
  this.mdp = await bcrypt.hash(this.mdp, salt);
});

// Méthode comparePassword (inchangée)
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.mdp);
};

module.exports = mongoose.model('User', userSchema);