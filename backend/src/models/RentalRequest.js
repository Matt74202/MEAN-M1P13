const mongoose = require('mongoose');

const rentalRequestSchema = new mongoose.Schema({
  // L'utilisateur (boutique) qui fait la demande
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // La box demandée
  boxId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Box',
    required: true,
  },

  // Durée souhaitée en mois (envoyée depuis le frontend)
  dureeMois: {
    type: Number,
    min: 1,
    default: 12,
  },

  // Message optionnel de la boutique
  messageBoutique: {
    type: String,
    default: '',
    trim: true,
  },

  // Statut de la demande
  statut: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },

  // Notes de l'admin lors de la validation/rejet
  notesAdmin: {
    type: String,
    default: '',
  },

  // Référence au contrat créé après validation
  contratId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contrat',
    default: null,
  },
}, {
  timestamps: true,
});

rentalRequestSchema.index({ statut: 1 });
rentalRequestSchema.index({ userId: 1 });
rentalRequestSchema.index({ boxId: 1 });

module.exports = mongoose.model('RentalRequest', rentalRequestSchema);