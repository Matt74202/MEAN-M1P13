const mongoose = require('mongoose');

const detailSchema = new mongoose.Schema({
  idProduit:     { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
  nom:           { type: String, required: true },
  quantite:      { type: Number, required: true },
  prixUnitaire:  { type: Number, required: true }
}, { _id: false });

const achatSchema = new mongoose.Schema({
  idClient:  { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  idBoutique: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },

  details:   { type: [detailSchema], required: true },
  dateAchat: { type: Date, default: Date.now },

  modePaiement: {
    type: String,
    enum: ['cash', 'mvola', 'orange_money'],
    required: true
  },

  typeLivraison: { type: String, enum: ['livraison', 'recuperation'], required: true },
  telephone:     { type: String, required: true },

  livraison: {
    adresse:   { type: String },
    latitude:  { type: Number },
    longitude: { type: Number },
    distance:  { type: Number },
    frais:     { type: Number }
  },

  reduction: { type: Number, default: 0 }, // stocke la réduction fidélité

  total:  { type: Number, required: true },
  statut: { type: String, enum: ['EN_ATTENTE', 'CONFIRMEE', 'ANNULEE'], default: 'EN_ATTENTE' }
}, { timestamps: true });

module.exports = mongoose.model('Achat', achatSchema);