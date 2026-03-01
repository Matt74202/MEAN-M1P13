const Achat          = require('../models/Achat');
const NoteBoutique   = require('../models/NoteBoutique');
const NoteProduit    = require('../models/NoteProduit');
const MouvementStock = require('../models/MouvementStock');
const Produit        = require('../models/Produit');
const Contrat        = require('../models/Contrat');
const Loyer          = require('../models/Loyer');
const mongoose       = require('mongoose');

exports.getDashboardBoutique = async (req, res) => {
  try {
    const { boutiqueId } = req.params;
    const { periode = '7' } = req.query;

    const nbJours   = parseInt(periode);
    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - nbJours);

    const idBoutique = new mongoose.Types.ObjectId(boutiqueId);

    // ── 1. Commandes sur la période ──────────────────────────────────────────
    const achats = await Achat.find({
      idBoutique,
      createdAt: { $gte: dateDebut }
    }).sort({ createdAt: 1 });

    // ── 2. CA total ──────────────────────────────────────────────────────────
    const caTotal = await Achat.aggregate([
      { $match: { idBoutique } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // ── 3. Ventes par jour ───────────────────────────────────────────────────
    const ventesParJour = await Achat.aggregate([
      { $match: { idBoutique, createdAt: { $gte: dateDebut } } },
      {
        $group: {
          _id:       { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total:     { $sum: '$total' },
          commandes: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // ── 4. Produits les plus vendus ──────────────────────────────────────────
    const produitsVendus = await Achat.aggregate([
      { $match: { idBoutique, createdAt: { $gte: dateDebut } } },
      { $unwind: '$details' },
      {
        $group: {
          _id:      '$details.idProduit',
          nom:      { $first: '$details.nom' },
          quantite: { $sum: '$details.quantite' },
          chiffre:  { $sum: { $multiply: ['$details.prixUnitaire', '$details.quantite'] } }
        }
      },
      { $sort: { quantite: -1 } },
      { $limit: 5 }
    ]);

    // ── 5. Notes boutique ────────────────────────────────────────────────────
    const notesBoutique = await NoteBoutique.aggregate([
      { $match: { idBoutique } },
      {
        $group: {
          _id:         null,
          moyenne:     { $avg: '$note' },
          total:       { $sum: 1 },
          repartition: { $push: '$note' }
        }
      }
    ]);

    const repartition = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (notesBoutique.length) {
      notesBoutique[0].repartition.forEach(n => repartition[n]++);
    }

    // ── 6. Derniers avis ─────────────────────────────────────────────────────
    const derniersAvis = await NoteBoutique.find({ idBoutique })
      .sort({ date: -1 })
      .limit(5);

    // ── 7. Stock actuel + alertes ────────────────────────────────────────────
    const SEUIL_ALERTE = 5;

    const produits = await Produit.find(
      { idBoutique: boutiqueId },
      'details.nom details.categorie stock imageUrl'
    ).sort('details.nom').lean();

    const stockTotal  = produits.reduce((s, p) => s + (p.stock || 0), 0);
    const stockFaible = produits.filter(p => p.stock <= SEUIL_ALERTE);

    // ── 8. Mouvements récents ────────────────────────────────────────────────
    const mouvements = await MouvementStock.find({
      idBoutique: boutiqueId,
      date:       { $gte: dateDebut }
    })
      .populate('idProduit', 'details.nom imageUrl')
      .sort({ date: -1 })
      .limit(10)
      .lean();

    const totalEntrees = mouvements
      .filter(m => m.type === 'entree')
      .reduce((s, m) => s + (m.nombre || 0), 0);

    const totalSorties = mouvements
      .filter(m => m.type === 'sortie')
      .reduce((s, m) => s + (m.nombre || 0), 0);

    // ── 9. Mouvements par jour ───────────────────────────────────────────────
    const mouvementsParJour = await MouvementStock.aggregate([
      {
        $match: {
          idBoutique: boutiqueId,
          date:       { $gte: dateDebut }
        }
      },
      {
        $group: {
          _id: {
            jour: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            type: '$type'
          },
          total: { $sum: '$nombre' }
        }
      },
      { $sort: { '_id.jour': 1 } }
    ]);

    // ── 10. Loyers — prochain impayé + résumé ────────────────────────────────
    const today = new Date();

    // Récupérer les contrats actifs de la boutique
    const contratsActifs = await Contrat.find({
      $or: [
        { userId:     idBoutique },
        { idBoutique: boutiqueId }
      ],
      statut: { $in: ['ACTIF', 'EN_ATTENTE'] }
    })
      .populate('idBox', 'numero nom loyer')
      .lean();

    // Récupérer tous les loyers déjà payés pour cette boutique
    const loyersPaies = await Loyer.find({
      boutiqueId,
      statut: 'paye'
    }).lean();

    const paidSet = new Set(loyersPaies.map(l => `${l.contratId}__${l.mois}`));

    // Générer les loyers virtuels de chaque contrat et trouver les impayés
    const loyersImpayes = [];

    for (const contrat of contratsActifs) {
      const debut = new Date(contrat.dateDebut);
      const fin   = new Date(contrat.dateFin);

      let curseur = new Date(debut.getFullYear(), debut.getMonth(), 1);

      while (curseur <= fin && curseur <= today) {
        const moisStr = `${curseur.getFullYear()}-${String(curseur.getMonth() + 1).padStart(2, '0')}`;
        const key     = `${contrat._id}__${moisStr}`;

        if (!paidSet.has(key)) {
          // Échéance = le 5 du mois
          const echeance = new Date(curseur.getFullYear(), curseur.getMonth(), 5, 23, 59, 59);

          loyersImpayes.push({
            contratId:    contrat._id.toString(),
            mois:         moisStr,
            montant:      contrat.idBox?.loyer || 0,
            dateEcheance: echeance.toISOString(),
            boxNumero:    contrat.idBox?.numero || '?',
            boxNom:       contrat.idBox?.nom    || '',
            enRetard:     echeance < today
          });
        }

        curseur.setMonth(curseur.getMonth() + 1);
      }
    }

    // Trier : d'abord les en retard (les plus anciens), puis les à venir
    loyersImpayes.sort((a, b) => new Date(a.dateEcheance) - new Date(b.dateEcheance));

    // Prochain loyer à payer = le plus ancien impayé
    const prochainLoyer = loyersImpayes[0] || null;

    // Calculer les jours restants / de retard pour le prochain
    let joursInfo = null;
    if (prochainLoyer) {
      const diffMs   = new Date(prochainLoyer.dateEcheance) - today;
      const diffJours = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      joursInfo = {
        jours:    Math.abs(diffJours),
        enRetard: diffJours < 0
      };
    }

    // Prochain mois à payer (futur) pour affichage "dans X jours"
    // = le 5 du mois prochain si tout est payé pour ce mois
    const moisCourantStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const echeanceCeMois = new Date(today.getFullYear(), today.getMonth(), 5, 23, 59, 59);
    const echeanceMoisProchain = new Date(today.getFullYear(), today.getMonth() + 1, 5, 23, 59, 59);

    const montantMensuelTotal = contratsActifs.reduce((s, c) => s + (c.idBox?.loyer || 0), 0);

    const loyersSummary = {
      nbImpayes:            loyersImpayes.length,
      montantImpayes:       loyersImpayes.reduce((s, l) => s + l.montant, 0),
      montantMensuelTotal,
      prochainLoyer,
      joursInfo,
      echeanceCeMois:       echeanceCeMois.toISOString(),
      echeanceMoisProchain: echeanceMoisProchain.toISOString(),
      // Les 3 prochains impayés pour la liste
      prochainImpayes:      loyersImpayes.slice(0, 3)
    };

    // ── Réponse finale ───────────────────────────────────────────────────────
    res.json({
      success: true,
      periode: nbJours,

      ca: {
        total:   caTotal[0]?.total ?? 0,
        periode: achats.reduce((s, a) => s + (a.total || 0), 0)
      },

      commandes: {
        total:      achats.length,
        enAttente:  achats.filter(a => a.statut === 'EN_ATTENTE').length,
        confirmees: achats.filter(a => a.statut === 'CONFIRMEE').length
      },

      ventesParJour,
      produitsVendus,

      notes: {
        moyenne:      notesBoutique[0] ? Math.round(notesBoutique[0].moyenne * 10) / 10 : null,
        total:        notesBoutique[0]?.total ?? 0,
        repartition,
        derniersAvis
      },

      stock: {
        total:      stockTotal,
        nbProduits: produits.length,
        alertes:    stockFaible.map(p => ({
          _id:       p._id,
          nom:       p.details?.nom      || '—',
          categorie: p.details?.categorie || '—',
          stock:     p.stock
        })),
        mouvementsRecents: mouvements.map(m => ({
          _id:        m._id,
          type:       m.type,
          nombre:     m.nombre,
          raison:     m.raison,
          note:       m.note || '',
          date:       m.date,
          produitNom: m.idProduit?.details?.nom || '—'
        })),
        totalEntrees,
        totalSorties,
        mouvementsParJour
      },

      loyers: loyersSummary
    });

  } catch (err) {
    console.error('DASHBOARD ERROR:', err.message);
    console.error('DASHBOARD STACK:', err.stack);
    res.status(500).json({ message: err.message });
  }
};