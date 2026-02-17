const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  idProduit: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
  nom:       { type: String, required: true },
  prix:      { type: Number, required: true },
  image:     { type: String },
  quantite:  { type: Number, required: true, min: 1 },
  sousTotal: { type: Number, required: true }
}, { _id: false });

const panierSchema = new mongoose.Schema({
  idClient: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  articles:  { type: [articleSchema], default: [] },
  total:     { type: Number, default: 0 },
  statut:    { type: String, enum: ['EN_COURS', 'COMMANDE'], default: 'EN_COURS' }
}, { timestamps: true });

panierSchema.index({ idClient: 1, statut: 1 });

module.exports = mongoose.model('Panier', panierSchema);