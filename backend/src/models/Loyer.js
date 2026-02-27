const mongoose = require('mongoose');
const loyerSchema = new mongoose.Schema({
  boutiqueId: { type: String, required: true },
  contratId: { type: String, required: true },
  mois: { type: String, required: true }, // Format: "YYYY-MM"
  montant: { type: Number, required: true },
  dateEcheance: { type: Date, required: true },
  statut: { type: String, enum: ['impaye', 'paye'], default: 'impaye' },
  datePaiement: { type: Date },
}, { timestamps: true });

// Index unique pour éviter les doublons de paiement
loyerSchema.index({ contratId: 1, mois: 1 }, { unique: true });

module.exports = mongoose.models.Loyer || mongoose.model('Loyer', loyerSchema);