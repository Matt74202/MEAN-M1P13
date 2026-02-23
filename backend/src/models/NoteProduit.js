const mongoose = require('mongoose');

const noteProduitSchema = new mongoose.Schema({
  idClient:    { type: mongoose.Schema.Types.ObjectId, ref: 'Client',   required: true },
  idProduit:   { type: mongoose.Schema.Types.ObjectId, ref: 'Produit',  required: true },
  idBoutique:  { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },
  note:        { type: Number, required: true, min: 1, max: 5 },
  commentaire: { type: String, trim: true, default: '' },
  date:        { type: Date, default: Date.now }
}, { timestamps: true });

noteProduitSchema.index({ idClient: 1, idProduit: 1 }, { unique: true });
module.exports = mongoose.model('NoteProduit', noteProduitSchema);