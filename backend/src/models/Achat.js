const mongoose = require('mongoose');

const detailSchema = new mongoose.Schema({
  idProduit:     { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
  nom:           { type: String, required: true }, // snapshot
  quantite:      { type: Number, required: true },
  prixUnitaire:  { type: Number, required: true }
}, { _id: false });

const achatSchema = new mongoose.Schema({
  idClient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  details:      { type: [detailSchema], required: true },
  dateAchat:    { type: Date, default: Date.now },
  modePaiement: { type: String, enum: ['Espèces', 'Orange Money', 'Airtel Money', 'MVola', 'Carte'], required: true },
  
  typeLivraison: { type: String, enum: ['livraison', 'recuperation'], required: true },
  telephone:     { type: String, required: true }, 
  
  // Si livraison
  livraison: {
    adresse:      { type: String },
    latitude:     { type: Number },
    longitude:    { type: Number },
    distance:     { type: Number }, // en km
    frais:        { type: Number }
  },
  
  total:  { type: Number, required: true },
  statut: { type: String, enum: ['EN_ATTENTE', 'CONFIRMEE', 'ANNULEE'], default: 'EN_ATTENTE' }
}, { timestamps: true });

module.exports = mongoose.model('Achat', achatSchema);