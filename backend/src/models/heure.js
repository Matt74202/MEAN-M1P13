const mongoose = require('mongoose');

const heureSchema = new mongoose.Schema({
  jour: [{
    jour: {
      id: Number,
      nom: String
    },
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

module.exports = mongoose.model('Heure', heureSchema);