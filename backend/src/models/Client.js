const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const clientSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true
  },
  prenom: {
    type: String,
    required: [true, 'Le prénom est requis'],
    trim: true
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
    select: false
  },
  contact: {
    type: String,
    default: ''
  },
  adresse: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

clientSchema.index({ mail: 1 });

clientSchema.pre('save', async function() {
  if (!this.isModified('mdp')) return;
  const salt = await bcrypt.genSalt(10);
  this.mdp = await bcrypt.hash(this.mdp, salt);
});

clientSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.mdp);
};

module.exports = mongoose.model('Client', clientSchema);