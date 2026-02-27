const mongoose = require('mongoose');

const contratSchema = new mongoose.Schema({
  idBoutique: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: false,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  idBox: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Box',
    required: true,
  },
  duree: {
    type: Number,
    required: true,
    min: 1,
  },
  dateDebut: {
    type: Date,
    required: true,
  },
  dateFin: {
    type: Date,
    required: true,
  },
  statut: {
    type: String,
    enum: ['ACTIF', 'TERMINE', 'RESILIE', 'EN_ATTENTE'],
    default: 'EN_ATTENTE',
    required: true,
  },
}, {
  timestamps: true,
});

contratSchema.pre('save', async function() {
  if (!this.idBoutique && !this.userId) {
    throw new Error('Un contrat doit avoir soit idBoutique soit userId');
  }
  if (this.dateFin <= this.dateDebut) {
    throw new Error('La date de fin doit être postérieure à la date de début');
  }
});

contratSchema.index({ idBoutique: 1 });
contratSchema.index({ idBox: 1 });
contratSchema.index({ statut: 1 });
contratSchema.index({ dateDebut: 1, dateFin: 1 });


module.exports = mongoose.models.Contrat || mongoose.model('Contrat', contratSchema);