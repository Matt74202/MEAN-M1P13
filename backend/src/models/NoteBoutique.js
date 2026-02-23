const mongoose = require('mongoose');

const noteBoutiqueSchema = new mongoose.Schema({
  idClient:    { type: mongoose.Schema.Types.ObjectId, ref: 'Client',   required: true },
  idBoutique:  { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },
  note:        { type: Number, required: true, min: 1, max: 5 },
  commentaire: { type: String, trim: true, default: '' },
  date:        { type: Date, default: Date.now }
}, { timestamps: true });

noteBoutiqueSchema.index({ idClient: 1, idBoutique: 1 }, { unique: true });
module.exports = mongoose.model('NoteBoutique', noteBoutiqueSchema);