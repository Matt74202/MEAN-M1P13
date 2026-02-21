const mongoose = require('mongoose');

const favoriSchema = new mongoose.Schema({
  idClient: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  type:     { type: String, enum: ['produit', 'boutique'], required: true },
  idCible:  { type: mongoose.Schema.Types.ObjectId, required: true },
  date:     { type: Date, default: Date.now }
}, { timestamps: true });

favoriSchema.index({ idClient: 1, type: 1, idCible: 1 }, { unique: true });

favoriSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id; delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Favori', favoriSchema);