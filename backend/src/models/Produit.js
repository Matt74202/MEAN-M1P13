const mongoose = require('mongoose');

const produitSchema = new mongoose.Schema({
  idBoutique: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true
  },
  details: {
    nom: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    categorie: { type: String, required: true, trim: true, lowercase: true },
    prix: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now }
  },
  imageUrl: { type: String },
  stock: { type: Number, default: 0, min: 0 },
  enPromotion: { type: Boolean, default: false }
}, { timestamps: true });

produitSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Produit', produitSchema);