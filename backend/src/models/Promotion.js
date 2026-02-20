const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  idBoutique: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },
  details: {
    idProduit:   { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
    description: { type: String, default: '' },
    pourcentage: { type: Number, required: true, min: 1, max: 100 },
    dateDebut:   { type: Date, required: true },
    dateFin:     { type: Date, required: true },
  }
}, { timestamps: true });

// Index pour retrouver les promos actives d'une boutique rapidement
promotionSchema.index({ idBoutique: 1, 'details.dateFin': 1 });

module.exports = mongoose.model('Promotion', promotionSchema);