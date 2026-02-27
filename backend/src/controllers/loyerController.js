// src/controllers/loyerController.js
const Contrat = require('../models/Contrat');
const Loyer = require('../models/Loyer');
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
    const moisAnnee = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;

    // ✅ Échéance = 5 du mois courant
    let echeance = new Date(current.getFullYear(), current.getMonth(), 5);
    echeance.setHours(23, 59, 59, 999);
    if (echeance > end) echeance = end;

    loyers.push({
      _id: new mongoose.Types.ObjectId().toString(),
      mois: moisAnnee,
      dateEcheance: echeance.toISOString(),
      montant: contrat.idBox?.loyer || 0,
      boutiqueId: contrat.userId?._id?.toString() || contrat.userId?.toString() || contrat.idBoutique?.toString(),
      boxId: contrat.idBox?._id?.toString(),
      statut: 'impaye',
      contratId: contrat._id.toString()
    });

    current.setMonth(current.getMonth() + 1);
  }

  return loyers;
}// 1. ADMIN : Tous les loyers
// ────────────────────────────────────────────────
exports.getAllLoyersAdmin = async (req, res) => {
  try {
    const { boutiqueId, statut, dateDebut, dateFin } = req.query;  // ← doit être EN PREMIER

    console.log('[ADMIN LOYERS] Query reçue :', req.query);
    console.log('[ADMIN LOYERS] boutiqueId filtre :', boutiqueId);

    const contrats = await Contrat.find({ statut: { $in: ['ACTIF', 'EN_ATTENTE'] } })
    .populate('idBox', 'numero nom etage superficie loyer')
    .populate('userId', 'nom mail')
    .populate('idBoutique', 'nom mail')   // ← ajouter
    .lean();

    console.log('[ADMIN] Exemple contrat userId:', contrats[0]?.userId);
    console.log('[ADMIN] Exemple contrat idBoutique:', contrats[0]?.idBoutique);

    console.log(`[ADMIN LOYERS] ${contrats.length} contrats trouvés`);

    let tousLesLoyers = [];

    for (const contrat of contrats) {
      const loyersDuContrat = genererLoyersDuContrat(contrat);
      loyersDuContrat.forEach(l => {
        l.boxInfo      = contrat.idBox || null;
        l.boutiqueNom  = contrat.userId?.nom  || contrat.idBoutique?.nom  || 'Boutique inconnue';
        l.boutiqueMail = contrat.userId?.mail || contrat.idBoutique?.mail || '';
      });
      tousLesLoyers = tousLesLoyers.concat(loyersDuContrat);
    }

    console.log('[ADMIN LOYERS] Total loyers générés :', tousLesLoyers.length);
    console.log('[ADMIN LOYERS] Exemple boutiqueId dans loyers :', tousLesLoyers[0]?.boutiqueId);

    // Merge avec loyers payés en DB
    const allPaid = await Loyer.find({ statut: 'paye' }).lean();
    for (const paid of allPaid) {
      const index = tousLesLoyers.findIndex(l => l.contratId === paid.contratId && l.mois === paid.mois);
      if (index !== -1) {
        tousLesLoyers[index].statut       = paid.statut;
        tousLesLoyers[index].datePaiement = paid.datePaiement;
      }
    }

    let filtered = tousLesLoyers;

    if (boutiqueId) {
      console.log('[FILTRE] Application filtre boutiqueId :', boutiqueId);
      console.log('[FILTRE] Exemple boutiqueId loyer :', tousLesLoyers[0]?.boutiqueId, '| type :', typeof tousLesLoyers[0]?.boutiqueId);
      console.log('[FILTRE] boutiqueId query type :', typeof boutiqueId);
      filtered = filtered.filter(l => l.boutiqueId === boutiqueId);
      console.log('[FILTRE] Loyers après filtre :', filtered.length);
    }

    if (statut)    filtered = filtered.filter(l => l.statut === statut);
    if (dateDebut) filtered = filtered.filter(l => new Date(l.dateEcheance) >= new Date(dateDebut));
    if (dateFin)   filtered = filtered.filter(l => new Date(l.dateEcheance) <= new Date(dateFin));

    // Tri par box puis par date
    filtered.sort((a, b) => {
      const boxA = a.boxInfo?.numero || '';
      const boxB = b.boxInfo?.numero || '';
      if (boxA !== boxB) return boxA.localeCompare(boxB);
      return new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime();
    });

    res.json({ success: true, count: filtered.length, data: filtered });
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
    const profileId  = req.user.profileId; // ← l'ID du profil boutique

    console.log('[BOUTIQUE] boutiqueId :', boutiqueId, '| profileId :', profileId);

    const contrats = await Contrat.find({
      $or: [
        { userId:     new mongoose.Types.ObjectId(boutiqueId) },
        { userId:     new mongoose.Types.ObjectId(profileId)  }, // ← ajouter
        { idBoutique: boutiqueId },
        { idBoutique: profileId  }                              // ← ajouter
      ],
      statut: { $in: ['ACTIF', 'EN_ATTENTE'] }
    })
    .populate('idBox', 'numero nom etage superficie loyer')
    .lean();

    console.log(`[BOUTIQUE] ${contrats.length} contrats trouvés`);

    let loyers = [];
    for (const contrat of contrats) {
      const loyersDuContrat = genererLoyersDuContrat(contrat);
      loyersDuContrat.forEach(l => { l.boxInfo = contrat.idBox || null; });
      loyers = loyers.concat(loyersDuContrat);
    }

    // Merge avec loyers payés en DB — chercher avec les deux IDs
    const paidLoyers = await Loyer.find({
      boutiqueId: { $in: [boutiqueId, profileId] }
    }).lean();

    for (const paid of paidLoyers) {
      const index = loyers.findIndex(l => l.contratId === paid.contratId && l.mois === paid.mois);
      if (index !== -1) {
        loyers[index].statut       = paid.statut;
        loyers[index].datePaiement = paid.datePaiement;
      }
    }

    const { impayesOnly, dateDebut, dateFin } = req.query;
    if (impayesOnly === 'true') loyers = loyers.filter(l => l.statut === 'impaye');
    if (dateDebut) loyers = loyers.filter(l => new Date(l.dateEcheance) >= new Date(dateDebut));
    if (dateFin)   loyers = loyers.filter(l => new Date(l.dateEcheance) <= new Date(dateFin));

    loyers.sort((a, b) => {
      const boxA = a.boxInfo?.numero || '';
      const boxB = b.boxInfo?.numero || '';
      if (boxA !== boxB) return boxA.localeCompare(boxB);
      return new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime();
    });

    res.json({ success: true, count: loyers.length, data: loyers });

  } catch (err) {
    console.error('[getLoyersBoutique] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ────────────────────────────────────────────────
// 3. Liste boutiques (dropdown admin) — ✅ vrais noms
// ────────────────────────────────────────────────
exports.getBoutiques = async (req, res) => {
  try {
    const contrats = await Contrat.find({ statut: { $in: ['signe', 'en_attente'] } })
      .populate('userId', 'nom mail')
      .lean();

    const map = new Map();
    for (const c of contrats) {
      if (c.userId && !map.has(c.userId._id.toString())) {
        map.set(c.userId._id.toString(), {
          _id: c.userId._id.toString(),
          nom: c.userId.nom || c.userId.mail || 'Boutique inconnue'
        });
      }
    }

    res.json({ success: true, data: Array.from(map.values()) });
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

    console.log('[PAYER] body reçu :', req.body);
    console.log('[PAYER] req.user.id :', req.user.id, '| req.user.profileId :', req.user.profileId);

    if (!mois || !contratId || !dateEcheance || !montant || !boutiqueId) {
      console.log('[PAYER] Champs manquants :', { mois, contratId, dateEcheance, montant, boutiqueId });
      return res.status(400).json({ success: false, message: 'Données incomplètes pour le paiement' });
    }

    // ← Accepter l'un ou l'autre des deux IDs
    const allowedIds = [req.user.id.toString(), req.user.profileId?.toString()];
    if (!allowedIds.includes(boutiqueId.toString())) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    const existing = await Loyer.findOne({ contratId, mois });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Ce loyer est déjà payé' });
    }

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