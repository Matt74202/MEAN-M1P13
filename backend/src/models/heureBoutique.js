const mongoose = require('mongoose');

const heureBoutiqueSchema = new mongoose.Schema({
  idBoutique: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true,
    unique: true
  },
  heures: [{
    jour: String,       // "Lundi", "Mardi", etc.
    ouverture: String,
    fermeture: String
  }],
  exceptions: [{
    date: Date,
    ouverture: String,
    fermeture: String,
    motif: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('HeureBoutique', heureBoutiqueSchema);