// src/controllers/loyerController.js
const Contrat = require('../models/Contrat');
const Loyer = require('../models/Loyer'); // ← AJOUT : importer le modèle
const mongoose = require('mongoose');

// ────────────────────────────────────────────────
// Helper : génère les loyers virtuels pour un contrat
// ────────────────────────────────────────────────
function genererLoyersDuContrat(contrat) {
  const start = new Date(contrat.dateDebut);
  const end   = new Date(contrat.dateFin);
  const loyers = [];

  let current = new Date(start.getFullYear(), start.getMonth(), 1);

  while (current <= end) {
    const moisAnnee = current.toISOString().slice(0, 7); // "2026-02"

    let echeance = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    echeance.setHours(23, 59, 59, 999);

    if (echeance > end) {
      echeance = end;
    }

    loyers.push({
      _id: new mongoose.Types.ObjectId().toString(),
      mois: moisAnnee,
      dateEcheance: echeance.toISOString(),
      montant: contrat.loyerMensuel,
      boutiqueId: contrat.userId ? contrat.userId.toString() : contrat.idBoutique?.toString(),
      boxId: contrat.boxId ? contrat.boxId.toString() : contrat.idBox?.toString(),
      statut: 'impaye',
      contratId: contrat._id.toString()
    });

    current.setMonth(current.getMonth() + 1);
  }

  return loyers;
}

// ────────────────────────────────────────────────
// 1. ADMIN : Tous les loyers (actif + en_attente)
// ────────────────────────────────────────────────
exports.getAllLoyersAdmin = async (req, res) => {
  try {
    const { boutiqueId, statut, dateDebut, dateFin } = req.query;

    // IMPORTANT : filtre sur les statuts que tu veux vraiment afficher
    const contrats = await Contrat.find({
      statut: { $in: ['actif', 'en_attente'] }  // ← CORRECTION ICI
    }).lean();

    console.log(`[ADMIN LOYERS] ${contrats.length} contrats trouvés (actif + en_attente)`);
    contrats.forEach(c => {
      console.log(`  - Contrat ${c._id}: statut=${c.statut}, debut=${c.dateDebut}, fin=${c.dateFin}`);
    });

    let tousLesLoyers = [];

    for (const contrat of contrats) {
      const loyersDuContrat = genererLoyersDuContrat(contrat);
      tousLesLoyers = tousLesLoyers.concat(loyersDuContrat);
    }

    // ← AJOUT : Fetch tous les loyers payés en DB et merge avec virtuels
    const allPaid = await Loyer.find({ statut: 'paye' }).lean();
    for (const paid of allPaid) {
      const index = tousLesLoyers.findIndex(l => l.contratId === paid.contratId && l.mois === paid.mois);
      if (index !== -1) {
        tousLesLoyers[index].statut = paid.statut;
        tousLesLoyers[index].datePaiement = paid.datePaiement;
        // Optionnel : tousLesLoyers[index]._id = paid._id;
      }
    }

    let filtered = tousLesLoyers;

    if (boutiqueId) {
      filtered = filtered.filter(l => l.boutiqueId === boutiqueId);
    }

    if (statut) {
      filtered = filtered.filter(l => l.statut === statut);
    }

    if (dateDebut) {
      const debut = new Date(dateDebut);
      filtered = filtered.filter(l => new Date(l.dateEcheance) >= debut);
    }

    if (dateFin) {
      const fin = new Date(dateFin);
      filtered = filtered.filter(l => new Date(l.dateEcheance) <= fin);
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.dateEcheance);
      const dateB = new Date(b.dateEcheance);
      if (dateA < dateB) return -1;
      if (dateA > dateB) return 1;
      return a.boutiqueId.localeCompare(b.boutiqueId);
    });

    res.json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (err) {
    console.error('[getAllLoyersAdmin] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ────────────────────────────────────────────────
// 2. BOUTIQUE : Ses propres loyers
// ────────────────────────────────────────────────
exports.getLoyersBoutique = async (req, res) => {
  try {
    const boutiqueId = req.user.id;

    const contrats = await Contrat.find({
      $or: [
        { userId: boutiqueId },
        { idBoutique: boutiqueId }  // ← support des deux noms de champ
      ],
      statut: { $in: ['actif', 'en_attente'] }
    }).lean();

    console.log(`[BOUTIQUE ${boutiqueId}] ${contrats.length} contrats trouvés`);

    let loyers = [];

    for (const contrat of contrats) {
      loyers = loyers.concat(genererLoyersDuContrat(contrat));
    }

    // ← AJOUT : Fetch loyers payés en DB pour cette boutique et merge
    const paidLoyers = await Loyer.find({ boutiqueId }).lean();
    for (const paid of paidLoyers) {
      const index = loyers.findIndex(l => l.contratId === paid.contratId && l.mois === paid.mois);
      if (index !== -1) {
        loyers[index].statut = paid.statut;
        loyers[index].datePaiement = paid.datePaiement;
        // Optionnel : loyers[index]._id = paid._id;
      }
    }

    const { impayesOnly, dateDebut, dateFin } = req.query;

    if (impayesOnly === 'true') {
      loyers = loyers.filter(l => l.statut === 'impaye');
    }

    if (dateDebut) {
      const debut = new Date(dateDebut);
      loyers = loyers.filter(l => new Date(l.dateEcheance) >= debut);
    }

    if (dateFin) {
      const fin = new Date(dateFin);
      loyers = loyers.filter(l => new Date(l.dateEcheance) <= fin);
    }

    loyers.sort((a, b) => new Date(a.dateEcheance) - new Date(b.dateEcheance));

    res.json({
      success: true,
      count: loyers.length,
      data: loyers
    });
  } catch (err) {
    console.error('[getLoyersBoutique] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ────────────────────────────────────────────────
// 3. Liste boutiques (dropdown admin)
// ────────────────────────────────────────────────
exports.getBoutiques = async (req, res) => {
  try {
    const boutiqueIds = await Contrat.distinct('userId');
    const boutiqueIdsOld = await Contrat.distinct('idBoutique');
    const allIds = [...new Set([...boutiqueIds, ...boutiqueIdsOld])];

    const boutiques = allIds.map(id => ({
      _id: id.toString(),
      nom: `Boutique ${id.toString().slice(-6)}`
    }));

    res.json({ success: true, data: boutiques });
  } catch (err) {
    console.error('[getBoutiques] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ────────────────────────────────────────────────
// 4. Payer (avec persistance en DB)
// ────────────────────────────────────────────────
exports.payerLoyer = async (req, res) => {
  try {
    const { mois, contratId, dateEcheance, montant, boutiqueId } = req.body;

    // Validation des données requises
    if (!mois || !contratId || !dateEcheance || !montant || !boutiqueId) {
      return res.status(400).json({ success: false, message: 'Données incomplètes pour le paiement' });
    }

    // Sécurité : la boutique ne peut payer que ses propres loyers
    if (boutiqueId !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    // Vérifier si déjà payé
    const existing = await Loyer.findOne({ contratId, mois });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Ce loyer est déjà payé' });
    }

    // Créer le loyer payé en DB
    const newLoyer = new Loyer({
      boutiqueId,
      contratId,
      mois,
      montant,
      dateEcheance: new Date(dateEcheance),
      statut: 'paye',
      datePaiement: new Date()
    });

    await newLoyer.save();

    res.json({ success: true, message: 'Paiement enregistré avec succès' });
  } catch (err) {
    console.error('[payerLoyer] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};