const mongoose = require('mongoose');

const boxSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true,
  },
  typeNom: {
    type: String,
    enum: ['Petit', 'Moyen', 'Grand'],
    required: true,
  },
  statut: {
    type: String,
    enum: ['LIBRE', 'OCCUPE', 'NON_FONCTIONNEL'],
    default: 'LIBRE',
    required: true,
  },
  loyer: {
    type: Number,
    min: 0,
    required: false,
  },
  x: {
    type: Number,
    required: true,
  },
  y: {
    type: Number,
    required: true,
  },
  etage: {
    type: String,
    enum: ['RC', 'FC'],
    required: true,
  },
  width: {
    type: Number,
    default: 60,
    min: 0,
  },
  height: {
    type: Number,
    default: 40,
    min: 0,
  },
  rotation: {
    type: Number,
    default: 0,
    min: -360,
    max: 360,
  },
}, {
  timestamps: true,
});

// Indexes utiles
boxSchema.index({ etage: 1, statut: 1 });
boxSchema.index({ x: 1, y: 1 });

module.exports = mongoose.model('Box', boxSchema);