const mongoose = require('mongoose');

const boutiqueSchema = new mongoose.Schema({
  mail: {
    type: String,
    required: true,
  },
  mdp: {
    type: String,
    required: true,
  },
  nom: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  typeCommerce: {
    type: String,
    required: true,
  },
  contact: {
    numero: String,
    email: String,
    reseau: String,
  },
  logo: {
    type: String,
  },
}, {
  timestamps: true,
});

boutiqueSchema.index({ typeCommerce: 1 });
boutiqueSchema.index({ nom: 1 });

module.exports = mongoose.model('Boutique', boutiqueSchema);