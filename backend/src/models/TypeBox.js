const mongoose = require('mongoose');

const typeBoxSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    enum: ['Petit', 'Moyen', 'Grand'],
    trim: true,
  },
  longueur: {
    type: Number,
    required: true,
    min: 0,
  },
  largeur: {
    type: Number,
    required: true,
    min: 0,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('TypeBox', typeBoxSchema);