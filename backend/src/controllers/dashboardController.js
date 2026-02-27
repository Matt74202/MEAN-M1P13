const Achat      = require('../models/Achat');
const NoteBoutique = require('../models/NoteBoutique');
const NoteProduit  = require('../models/NoteProduit');
const mongoose   = require('mongoose');

exports.getDashboardBoutique = async (req, res) => {
  try {
    const { boutiqueId } = req.params;
    const { periode = '7' } = req.query;

    const nbJours = parseInt(periode);
    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - nbJours);

    const idBoutique = new mongoose.Types.ObjectId(boutiqueId);
    console.log('idBoutique:', idBoutique, 'dateDebut:', dateDebut);

    // ── 1. Commandes sur la période ──
    const achats = await Achat.find({
      idBoutique,
      createdAt: { $gte: dateDebut }
    }).sort({ createdAt: 1 });
    console.log('achats trouvés:', achats.length);

    // ── 2. CA total ──
    const caTotal = await Achat.aggregate([
      { $match: { idBoutique } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    console.log('caTotal:', caTotal);

    // ── 3. Ventes par jour ──
    const ventesParJour = await Achat.aggregate([
      { $match: { idBoutique, createdAt: { $gte: dateDebut } } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total:     { $sum: '$total' },
          commandes: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);
    console.log('ventesParJour:', ventesParJour.length);

    // ── 4. Produits les plus vendus ──
    const produitsVendus = await Achat.aggregate([
      { $match: { idBoutique, createdAt: { $gte: dateDebut } } },
      { $unwind: '$details' },
      { $group: {
          _id:      '$details.idProduit',
          nom:      { $first: '$details.nom' },
          quantite: { $sum: '$details.quantite' },
          chiffre:  { $sum: { $multiply: ['$details.prixUnitaire', '$details.quantite'] } }
      }},
      { $sort: { quantite: -1 } },
      { $limit: 5 }
    ]);
    console.log('produitsVendus:', produitsVendus.length);

    // ── 5. Notes boutique ──
    const notesBoutique = await NoteBoutique.aggregate([
      { $match: { idBoutique } },
      { $group: {
          _id: null,
          moyenne:     { $avg: '$note' },
          total:       { $sum: 1 },
          repartition: { $push: '$note' }
      }}
    ]);
    console.log('notesBoutique:', notesBoutique);

    const repartition = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (notesBoutique.length) {
      notesBoutique[0].repartition.forEach(n => repartition[n]++);
    }

    // ── 6. Derniers avis ──
    const derniersAvis = await NoteBoutique.find({ idBoutique })
      .sort({ date: -1 })
      .limit(5);

    res.json({
      success: true,
      periode: nbJours,
      ca: {
        total:   caTotal[0]?.total ?? 0,
        periode: achats.reduce((s, a) => s + a.total, 0)
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
      }
    });

  } catch (err) {
    console.error('DASHBOARD ERROR:', err.message);
    console.error('DASHBOARD STACK:', err.stack);
    res.status(500).json({ message: err.message });
  }
};