const mongoose = require('mongoose');

const carteClientSchema = new mongoose.Schema({
  idClient:      { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  idBoutique:    { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },
  idCarte:       { type: mongoose.Schema.Types.ObjectId, ref: 'CarteFidelite', required: true },
  nombreAchat:   { type: Number, default: 0 },
  dateDebut:     { type: Date, default: Date.now },
  dateDernierAchat: { type: Date },
}, { timestamps: true });

// Un client a une seule carte par boutique
carteClientSchema.index({ idClient: 1, idBoutique: 1 }, { unique: true });

module.exports = mongoose.model('CarteClient', carteClientSchema);