const mongoose = require('mongoose');

const trancheSchema = new mongoose.Schema({
  distanceMin: { type: Number, required: true },
  distanceMax: { type: Number, required: true }, // Utiliser Infinity pour "+8km"
  prix:        { type: Number, required: true },
  date:        { type: Date, default: Date.now }
}, { _id: false });

const fraisLivraisonSchema = new mongoose.Schema({
  frais: { type: [trancheSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('FraisLivraison', fraisLivraisonSchema);