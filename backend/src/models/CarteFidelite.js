const mongoose = require('mongoose');

const carteFideliteSchema = new mongoose.Schema({
  idBoutique: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true, unique: true },
  design: {
    couleur1:    { type: String, default: '#7d936c' },
    couleur2:    { type: String, default: '#3a4a2f' },
    slogan:      { type: String, default: 'Votre fidélité, nos récompenses' },
    nombreCases: { type: Number, default: 10, min: 4, max: 20 }
  },
  paliers: [{
    achatNumero: { type: Number, required: true },
    type:        { type: String, enum: ['pourcentage', 'montant', 'gratuit'], required: true },
    valeur:      { type: Number, default: 0 },
    description: { type: String, default: '' }
  }],
  actif: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('CarteFidelite', carteFideliteSchema);