// src/controllers/financesController.js
const Contrat = require('../models/contrat');
const Loyer = require('../models/loyer');
const Box = require('../models/box');
const User = require('../models/user');
const mongoose = require('mongoose');

exports.getDashboard = async (req, res) => {
  try {
    const today = new Date();

    // ── 1. Revenus réels : loyers payés ──────────────────────────
    const loyersPayes = await Loyer.find({ statut: 'paye' });
    const revenuReel = loyersPayes.reduce((sum, l) => sum + (l.montant || 0), 0);

    const moisCourant = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const revenuReelMoisCourant = loyersPayes
      .filter(l => l.mois === moisCourant)
      .reduce((sum, l) => sum + (l.montant || 0), 0);

    console.log('[DEBUG] Nb loyers payés :', loyersPayes.length);
    console.log('[DEBUG] Exemple loyer.contratId :', loyersPayes[0]?.contratId, '| type :', typeof loyersPayes[0]?.contratId);

    // ── 2. Contrats actifs pour estimés ──────────────────────────
    const contratsActifs = await Contrat.find({ statut: 'signe' })
      .populate('boxId', 'numero nom loyer')
      .populate('userId', 'nom mail');

    const revenuEstimeMensuel = contratsActifs.reduce((sum, c) => sum + (c.loyerMensuel || 0), 0);
    const revenuEstimeTotalRestant = contratsActifs.reduce((sum, c) => {
      const fin = new Date(c.dateFin);
      const moisRestants = Math.max(0, Math.ceil((fin - today) / (1000 * 60 * 60 * 24 * 30)));
      return sum + (c.loyerMensuel || 0) * moisRestants;
    }, 0);

    // ── Tous les contrats pour matcher les loyers payés ──────────
    const tousLesContrats = await Contrat.find({})
      .populate('boxId', 'numero nom loyer')
      .populate('userId', 'nom mail')
      .lean();

    console.log('[DEBUG] Nb tousLesContrats :', tousLesContrats.length);
    console.log('[DEBUG] Exemple contrat._id :', tousLesContrats[0]?._id.toString(), '| type :', typeof tousLesContrats[0]?._id.toString());
    console.log('[DEBUG] Match test :', tousLesContrats[0]?._id.toString() === loyersPayes[0]?.contratId);

    // Test sur tous les loyers payés
    for (const loyer of loyersPayes) {
      const found = tousLesContrats.find(c => c._id.toString() === loyer.contratId);
      console.log(`[DEBUG] loyer.contratId=${loyer.contratId} → contrat trouvé: ${found ? found._id : 'NON TROUVÉ'} | box: ${found?.boxId?.numero || 'null'}`);
    }

    // ── 3. Revenus par box ───────────────────────────────────────
    const revenusParBoxMap = new Map();

    for (const loyer of loyersPayes) {
      const contrat = tousLesContrats.find(c => c._id.toString() === loyer.contratId);
      if (!contrat || !contrat.boxId) {
        console.log(`[DEBUG BOX] Loyer ${loyer._id} → contrat ou boxId non trouvé`);
        continue;
      }

      const boxId = contrat.boxId._id.toString();
      if (!revenusParBoxMap.has(boxId)) {
        revenusParBoxMap.set(boxId, {
          _id: boxId,
          boxNumero: contrat.boxId.numero,
          boxNom: contrat.boxId.nom,
          totalPercu: 0,
          nbPaiements: 0
        });
      }
      const entry = revenusParBoxMap.get(boxId);
      entry.totalPercu  += loyer.montant || 0;
      entry.nbPaiements += 1;
    }

    // Boxes des contrats actifs sans loyers payés
    for (const contrat of contratsActifs) {
      if (!contrat.boxId) continue;
      const boxId = contrat.boxId._id.toString();
      if (!revenusParBoxMap.has(boxId)) {
        revenusParBoxMap.set(boxId, {
          _id: boxId,
          boxNumero: contrat.boxId.numero,
          boxNom: contrat.boxId.nom,
          totalPercu: 0,
          nbPaiements: 0
        });
      }
    }

    const revenusParBox = Array.from(revenusParBoxMap.values())
      .sort((a, b) => b.totalPercu - a.totalPercu)
      .slice(0, 10);

    console.log('[DEBUG] revenusParBox :', revenusParBox);

    // ── 4. Revenus par boutique ──────────────────────────────────
    const revenusParBoutiqueMap = new Map();

    for (const loyer of loyersPayes) {
      const boutiqueId = loyer.boutiqueId;
      if (!boutiqueId) continue;

      const contrat = tousLesContrats.find(c => c._id.toString() === loyer.contratId);
      const nom  = contrat?.userId?.nom  || null;
      const mail = contrat?.userId?.mail || null;

      console.log(`[DEBUG BOUTIQUE] loyer.boutiqueId=${boutiqueId} → userId=${contrat?.userId?._id} nom=${nom}`);

      if (!revenusParBoutiqueMap.has(boutiqueId)) {
        revenusParBoutiqueMap.set(boutiqueId, {
          _id: boutiqueId,
          boutiqueNom: nom || 'Boutique inconnue',
          boutiqueMail: mail || '',
          totalPercu: 0,
          nbPaiements: 0
        });
      }

      if (nom) {
        revenusParBoutiqueMap.get(boutiqueId).boutiqueNom  = nom;
        revenusParBoutiqueMap.get(boutiqueId).boutiqueMail = mail;
      }

      revenusParBoutiqueMap.get(boutiqueId).totalPercu  += loyer.montant || 0;
      revenusParBoutiqueMap.get(boutiqueId).nbPaiements += 1;
    }

    // Fallback : chercher dans User si toujours inconnu
    for (const [boutiqueId, entry] of revenusParBoutiqueMap) {
      if (entry.boutiqueNom === 'Boutique inconnue') {
        try {
          const user = await User.findById(boutiqueId).select('nom mail').lean();
          if (user) {
            entry.boutiqueNom  = user.nom  || user.mail || 'Boutique inconnue';
            entry.boutiqueMail = user.mail || '';
          }
        } catch (e) { /* ID invalide, on ignore */ }
      }
    }

    const revenusParBoutique = Array.from(revenusParBoutiqueMap.values())
      .sort((a, b) => b.totalPercu - a.totalPercu)
      .slice(0, 10);

    console.log('[DEBUG] revenusParBoutique :', revenusParBoutique);

    // ── 5. Graphique mensuel (12 derniers mois) ──────────────────
    const graphiqueMensuel = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const moisLabel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const moisNom = date.toLocaleString('fr-FR', { month: 'short', year: '2-digit' });

      const percu = loyersPayes
        .filter(l => l.mois === moisLabel)
        .reduce((sum, l) => sum + (l.montant || 0), 0);

      const estime = contratsActifs
        .filter(c => new Date(c.dateDebut) <= date && new Date(c.dateFin) >= date)
        .reduce((sum, c) => sum + (c.loyerMensuel || 0), 0);

      graphiqueMensuel.push({ mois: moisLabel, moisNom, percu, estime });
    }

    // ── 6. Stats générales ───────────────────────────────────────
    const totalBoxes = await Box.countDocuments();
    const boxesOccupes = await Box.countDocuments({ statut: 'occupe' });
    const tauxOccupation = totalBoxes > 0 ? Math.round((boxesOccupes / totalBoxes) * 100) : 0;

    const loyersEnAttente = await Loyer.find({ statut: 'impaye' });
    const montantEnAttente = loyersEnAttente.reduce((sum, l) => sum + (l.montant || 0), 0);

    res.json({
      success: true,
      data: {
        stats: {
          revenuReel,
          revenuReelMoisCourant,
          revenuEstimeMensuel,
          revenuEstimeTotalRestant,
          montantEnAttente,
          totalBoxes,
          boxesOccupes,
          tauxOccupation,
          nbContratsActifs: contratsActifs.length
        },
        revenusParBox,
        revenusParBoutique,
        graphiqueMensuel
      }
    });
  } catch (err) {
    console.error('[getDashboard] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};