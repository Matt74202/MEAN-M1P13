// src/controllers/contratBoutiqueController.js
const Contrat = require('../models/Contrat');
const Box = require('../models/box'); // ou le chemin correct vers ton modèle Box
const mongoose = require('mongoose');

// ────────────────────────────────────────────────
// 1. Récupérer les contrats de la boutique connectée
//    (avec infos calculées : jours restants + renouvelable)
// ────────────────────────────────────────────────
exports.getMesContrats = async (req, res) => {
  try {
    const boutiqueId = req.user.id;

    if (!boutiqueId) {
      return res.status(401).json({ success: false, message: 'Utilisateur non authentifié' });
    }

    const contrats = await Contrat.find({
      userId: boutiqueId,
      statut: { $in: ['signe', 'en_attente'] }
    })
      .populate('boxId', 'numero etage superficie loyer nom description')
      .lean();

    const today = new Date();

    const contratsAvecInfos = contrats.map(c => {
      const fin = new Date(c.dateFin);
      const joursRestants = Math.ceil((fin - today) / (1000 * 60 * 60 * 24));

      return {
        ...c,
        joursRestants,
        renouvelable: c.statut === 'signe' && joursRestants <= 60 && joursRestants > 0
      };
    });

    res.json({
      success: true,
      count: contratsAvecInfos.length,
      data: contratsAvecInfos
    });
  } catch (err) {
    console.error('[getMesContrats] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ────────────────────────────────────────────────
// 2. Demande de renouvellement (crée un nouveau contrat)
// ────────────────────────────────────────────────
exports.demanderRenouvellement = async (req, res) => {
  try {
    const { contratId, dureeMois } = req.body;
    const boutiqueId = req.user.id;

    // Validations de base
    if (!contratId || !mongoose.Types.ObjectId.isValid(contratId)) {
      return res.status(400).json({ success: false, message: 'ID de contrat invalide' });
    }

    if (!dureeMois || dureeMois < 6 || dureeMois > 36) {
      return res.status(400).json({
        success: false,
        message: 'La durée doit être comprise entre 6 et 36 mois'
      });
    }

    // Récupérer le contrat existant
    const ancienContrat = await Contrat.findById(contratId);
    if (!ancienContrat) {
      return res.status(404).json({ success: false, message: 'Contrat non trouvé' });
    }

    if (ancienContrat.userId.toString() !== boutiqueId) {
      return res.status(403).json({ success: false, message: 'Ce contrat ne vous appartient pas' });
    }

    if (ancienContrat.statut !== 'signe') {
      return res.status(400).json({ success: false, message: 'Seuls les contrats signés peuvent être renouvelés' });
    }

    // Vérifier que le contrat n'est pas déjà expiré
    const now = new Date();
    if (new Date(ancienContrat.dateFin) < now) {
      return res.status(400).json({ success: false, message: 'Le contrat est déjà expiré' });
    }

    // Récupérer les infos du box
    const box = await Box.findById(ancienContrat.boxId);
    if (!box) {
      return res.status(404).json({ success: false, message: 'Box associé introuvable' });
    }

    // Calculer les nouvelles dates
    const nouvelleDateDebut = new Date(ancienContrat.dateFin);
    nouvelleDateDebut.setDate(nouvelleDateDebut.getDate() + 1); // lendemain

    const nouvelleDateFin = new Date(nouvelleDateDebut);
    nouvelleDateFin.setMonth(nouvelleDateFin.getMonth() + dureeMois);

    // Créer le nouveau contrat (en attente de signature/validation)
    const nouveauContrat = new Contrat({
      userId: boutiqueId,
      boxId: ancienContrat.boxId,
      dateDebut: nouvelleDateDebut,
      dateFin: nouvelleDateFin,
      dureeMois,
      loyerMensuel: ancienContrat.loyerMensuel,
      caution: ancienContrat.caution,
      clauses: ancienContrat.clauses || [],
      statut: 'en_attente',
      signatureClient: null, // à signer à nouveau
      // Optionnel : tu peux copier d'autres champs si besoin (documents, etc.)
    });

    await nouveauContrat.save();

    res.json({
      success: true,
      message: 'Demande de renouvellement créée avec succès',
      nouveauContrat: {
        _id: nouveauContrat._id,
        dateDebut: nouvelleDateDebut,
        dateFin: nouvelleDateFin,
        dureeMois,
        statut: nouveauContrat.statut
      }
    });
  } catch (err) {
    console.error('[demanderRenouvellement] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ────────────────────────────────────────────────
// 3. Résiliation par la boutique
// ────────────────────────────────────────────────
exports.resilierContrat = async (req, res) => {
  try {
    const { contratId } = req.body;
    const boutiqueId = req.user.id;

    if (!contratId || !mongoose.Types.ObjectId.isValid(contratId)) {
      return res.status(400).json({ success: false, message: 'ID de contrat invalide' });
    }

    const contrat = await Contrat.findById(contratId);
    if (!contrat) {
      return res.status(404).json({ success: false, message: 'Contrat non trouvé' });
    }

    if (contrat.userId.toString() !== boutiqueId) {
      return res.status(403).json({ success: false, message: 'Ce contrat ne vous appartient pas' });
    }

    if (contrat.statut === 'resilie') {
      return res.status(400).json({ success: false, message: 'Ce contrat est déjà résilié' });
    }

    if (contrat.statut === 'annule') {
      return res.status(400).json({ success: false, message: 'Ce contrat a déjà été annulé' });
    }

    // ✅ Calcul des jours restants (informatif uniquement, ne bloque pas)
    const today = new Date();
    const dateFin = new Date(contrat.dateFin);
    const joursRestants = Math.ceil((dateFin - today) / (1000 * 60 * 60 * 24));

    // ✅ Résiliation immédiate peu importe le nombre de jours restants
    contrat.statut = 'resilie';
    await contrat.save();

    // ✅ Libération du box automatiquement
    await Box.findByIdAndUpdate(
      contrat.boxId,
      { statut: 'libre', locataire: null },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Contrat résilié avec succès',
      contratId: contrat._id,
      joursRestants: joursRestants > 0 ? joursRestants : 0  // ✅ retourné pour info frontend
    });
  } catch (err) {
    console.error('[resilierContrat] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};