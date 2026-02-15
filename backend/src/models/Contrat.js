const mongoose = require('mongoose');

const contratSchema = new mongoose.Schema({
  idBoutique: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true,
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

// Validation: dateFin doit être après dateDebut
contratSchema.pre('save', function(next) {
  if (this.dateFin <= this.dateDebut) {
    next(new Error('La date de fin doit être postérieure à la date de début'));
  }
  next();
});

// Indexes utiles
contratSchema.index({ idBoutique: 1 });
contratSchema.index({ idBox: 1 });
contratSchema.index({ statut: 1 });
contratSchema.index({ dateDebut: 1, dateFin: 1 });

module.exports = mongoose.model('Contrat', contratSchema);