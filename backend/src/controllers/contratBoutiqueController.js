// src/controllers/contratBoutiqueController.js
const Contrat  = require('../models/Contrat');
const Box      = require('../models/Box');
const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────
// Helper : résout l'id boutique depuis req.user
// Le token JWT contient :
//   id        → userId (User connecté)
//   profileId → idBoutique (Boutique liée au compte)
// ─────────────────────────────────────────────────────────────
function getBoutiqueId(req) {
  // profileId est l'idBoutique stocké dans le token au moment du login
  return req.user?.profileId || req.user?.id || req.user?._id?.toString() || null;
}

// ─────────────────────────────────────────────────────────────
// 1. Récupérer les contrats de la boutique connectée
// ─────────────────────────────────────────────────────────────
exports.getMesContrats = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId) {
      return res.status(401).json({ success: false, message: 'Utilisateur non authentifié' });
    }

    // Le schéma utilise idBoutique OU userId — on cherche sur les deux
    const contrats = await Contrat.find({
      $or: [
        { idBoutique: boutiqueId },
        { userId:     boutiqueId }
      ],
      statut: { $in: ['ACTIF', 'EN_ATTENTE'] }
    })
      .populate('idBox', 'numero etage superficie loyer nom description')
      .lean();

    const today = new Date();

    const contratsAvecInfos = contrats.map(c => {
      const fin          = new Date(c.dateFin);
      const joursRestants = Math.ceil((fin - today) / (1000 * 60 * 60 * 24));

      return {
        ...c,
        // Alias boxId → idBox pour la compatibilité template
        boxId: c.idBox,
        // Loyer vient de idBox.loyer (le schéma Contrat n'a pas loyerMensuel)
        loyerMensuel: c.idBox?.loyer || 0,
        joursRestants,
        renouvelable: c.statut === 'ACTIF' && joursRestants <= 60 && joursRestants > 0
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

// ─────────────────────────────────────────────────────────────
// 2. Demande de renouvellement
// ─────────────────────────────────────────────────────────────
exports.demanderRenouvellement = async (req, res) => {
  try {
    const { contratId, dureeMois } = req.body;
    const boutiqueId = getBoutiqueId(req);

    if (!contratId || !mongoose.Types.ObjectId.isValid(contratId)) {
      return res.status(400).json({ success: false, message: 'ID de contrat invalide' });
    }
    if (!dureeMois || dureeMois < 6 || dureeMois > 36) {
      return res.status(400).json({ success: false, message: 'La durée doit être comprise entre 6 et 36 mois' });
    }

    const ancienContrat = await Contrat.findById(contratId).populate('idBox', 'loyer').lean();
    if (!ancienContrat) {
      return res.status(404).json({ success: false, message: 'Contrat non trouvé' });
    }

    // Vérification d'appartenance (idBoutique ou userId)
    const proprietaire =
      ancienContrat.idBoutique?.toString() === boutiqueId ||
      ancienContrat.userId?.toString()     === boutiqueId;
    if (!proprietaire) {
      return res.status(403).json({ success: false, message: 'Ce contrat ne vous appartient pas' });
    }

    if (ancienContrat.statut !== 'ACTIF') {
      return res.status(400).json({ success: false, message: 'Seuls les contrats actifs peuvent être renouvelés' });
    }

    const now = new Date();
    if (new Date(ancienContrat.dateFin) < now) {
      return res.status(400).json({ success: false, message: 'Le contrat est déjà expiré' });
    }

    const box = await Box.findById(ancienContrat.idBox);
    if (!box) {
      return res.status(404).json({ success: false, message: 'Box associé introuvable' });
    }

    // Nouvelles dates
    const nouvelleDateDebut = new Date(ancienContrat.dateFin);
    nouvelleDateDebut.setDate(nouvelleDateDebut.getDate() + 1);

    const nouvelleDateFin = new Date(nouvelleDateDebut);
    nouvelleDateFin.setMonth(nouvelleDateFin.getMonth() + dureeMois);

    // Création du nouveau contrat avec le bon schéma
    const nouveauContrat = new Contrat({
      idBoutique: ancienContrat.idBoutique || undefined,
      userId:     ancienContrat.userId     || undefined,
      idBox:      ancienContrat.idBox._id || ancienContrat.idBox,
      duree:      dureeMois,
      dateDebut:  nouvelleDateDebut,
      dateFin:    nouvelleDateFin,
      statut:     'EN_ATTENTE',
    });

    await nouveauContrat.save();

    res.json({
      success: true,
      message: 'Demande de renouvellement créée avec succès',
      nouveauContrat: {
        _id:       nouveauContrat._id,
        dateDebut: nouvelleDateDebut,
        dateFin:   nouvelleDateFin,
        dureeMois,
        statut:    nouveauContrat.statut
      }
    });
  } catch (err) {
    console.error('[demanderRenouvellement] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// 3. Résiliation par la boutique
// ─────────────────────────────────────────────────────────────
exports.resilierContrat = async (req, res) => {
  try {
    const { contratId } = req.body;
    const boutiqueId    = getBoutiqueId(req);

    if (!contratId || !mongoose.Types.ObjectId.isValid(contratId)) {
      return res.status(400).json({ success: false, message: 'ID de contrat invalide' });
    }

    const contrat = await Contrat.findById(contratId);
    if (!contrat) {
      return res.status(404).json({ success: false, message: 'Contrat non trouvé' });
    }

    // Vérification d'appartenance
    const proprietaire =
      contrat.idBoutique?.toString() === boutiqueId ||
      contrat.userId?.toString()     === boutiqueId;
    if (!proprietaire) {
      return res.status(403).json({ success: false, message: 'Ce contrat ne vous appartient pas' });
    }

    if (contrat.statut === 'RESILIE') {
      return res.status(400).json({ success: false, message: 'Ce contrat est déjà résilié' });
    }
    if (contrat.statut === 'TERMINE') {
      return res.status(400).json({ success: false, message: 'Ce contrat est déjà terminé' });
    }

    const today         = new Date();
    const dateFin       = new Date(contrat.dateFin);
    const joursRestants = Math.ceil((dateFin - today) / (1000 * 60 * 60 * 24));

    contrat.statut = 'RESILIE';
    await contrat.save();

    // Libération du box
    await Box.findByIdAndUpdate(
      contrat.idBox,
      { statut: 'libre', locataire: null },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Contrat résilié avec succès',
      contratId:      contrat._id,
      joursRestants:  joursRestants > 0 ? joursRestants : 0
    });
  } catch (err) {
    console.error('[resilierContrat] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
