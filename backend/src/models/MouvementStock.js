const mongoose = require('mongoose');

const mouvementStockSchema = new mongoose.Schema({
  idBoutique: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true
  },
  idProduit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Produit',
    required: true
  },
  type: {
    type: String,
    enum: ['entree', 'sortie'],
    required: true
  },
  nombre: {
    type: Number,
    required: true,
    min: 1
  },
  raison: {
    type: String,
    enum: [
      // Entrées
      'approvisionnement', 'retour_client', 'correction',
      // Sorties
      'achat_physique', 'achat_client', 'produit_defectueux', 'perte', 'don'
    ],
    required: true
  },
  idReference: {
    // ex: _id de l'achat si raison = achat_client
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  note: {
    type: String,
    trim: true,
    default: ''
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

mouvementStockSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('MouvementStock', mouvementStockSchema);