const MouvementStock = require('../models/MouvementStock');
const Produit        = require('../models/Produit');


const RAISONS_SORTIE = ['achat_physique', 'produit_defectueux', 'perte', 'don', 'correction'];
const RAISONS_ENTREE = ['approvisionnement', 'retour_client', 'correction'];

// ─────────────────────────────────────────────
// ENTRÉE STOCK (approvisionnement manuel)
// ─────────────────────────────────────────────
exports.entreeStock = async (req, res) => {
  try {
    const { idBoutique, idProduit, nombre, raison, note } = req.body;

    const produit = await Produit.findById(idProduit);
    if (!produit) return res.status(404).json({ success: false, message: 'Produit non trouvé' });

    if (!RAISONS_ENTREE.includes(raison)) {
      return res.status(400).json({ success: false, message: 'Raison invalide' });
    }

    const mouvement = await MouvementStock.create({
      idBoutique, idProduit, type: 'entree',
      nombre: Number(nombre), raison, note: note || ''
    });

    await Produit.findByIdAndUpdate(idProduit, { $inc: { stock: Number(nombre) } });

    res.status(201).json({
      success: true,
      message: `+${nombre} unités ajoutées`,
      mouvement,
      nouveauStock: produit.stock + Number(nombre)
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// SORTIE STOCK (interne — appelé par achatController)
// ─────────────────────────────────────────────
exports.sortieStockInterne = async (idBoutique, idProduit, nombre, idReference) => {
  const produit = await Produit.findById(idProduit);
  if (!produit) throw new Error(`Produit ${idProduit} non trouvé`);
  if (produit.stock < nombre) throw new Error(`Stock insuffisant pour "${produit.details.nom}" (dispo: ${produit.stock})`);

  await MouvementStock.create({
    idBoutique, idProduit, type: 'sortie',
    nombre, raison: 'achat_client', idReference: idReference || null
  });

  await Produit.findByIdAndUpdate(idProduit, { $inc: { stock: -nombre } });
};

// ─────────────────────────────────────────────
// SORTIE STOCK MANUELLE (boutique)
// ─────────────────────────────────────────────
exports.sortieStockManuelle = async (req, res) => {
  try {
    const { idBoutique, idProduit, nombre, raison, note } = req.body;

    if (!RAISONS_SORTIE.includes(raison)) {
      return res.status(400).json({ success: false, message: 'Raison invalide' });
    }

    const produit = await Produit.findById(idProduit);
    if (!produit) return res.status(404).json({ success: false, message: 'Produit non trouvé' });

    if (produit.stock < Number(nombre)) {
      return res.status(400).json({
        success: false,
        message: `Stock insuffisant (disponible : ${produit.stock})`
      });
    }

    const mouvement = await MouvementStock.create({
      idBoutique, idProduit, type: 'sortie',
      nombre: Number(nombre), raison, note: note || ''
    });

    await Produit.findByIdAndUpdate(idProduit, { $inc: { stock: -Number(nombre) } });

    res.status(201).json({
      success: true,
      message: `-${nombre} unités retirées`,
      mouvement,
      nouveauStock: produit.stock - Number(nombre)
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// HISTORIQUE des mouvements
// ─────────────────────────────────────────────
exports.getHistorique = async (req, res) => {
  try {
    const { boutiqueId, produitId, type, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (boutiqueId) filter.idBoutique = boutiqueId;
    if (produitId)  filter.idProduit  = produitId;
    if (type)       filter.type       = type;

    const skip = (Number(page) - 1) * Number(limit);

    const [mouvements, total] = await Promise.all([
      MouvementStock.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('idProduit', 'details.nom details.categorie imageUrl'),
      MouvementStock.countDocuments(filter)
    ]);

    res.json({
      success: true,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      total,
      mouvements
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// STOCK ACTUEL de tous les produits d'une boutique
// ─────────────────────────────────────────────
exports.getStockBoutique = async (req, res) => {
  try {
    const { boutiqueId } = req.params;
    const { seuilAlerte = 5 } = req.query;

    const produits = await Produit.find(
      { idBoutique: boutiqueId },
      'details.nom details.categorie imageUrl stock'
    ).sort('details.nom');

    const result = produits.map(p => ({
      ...p.toJSON(),
      stockFaible: p.stock <= Number(seuilAlerte)
    }));

    res.json({ success: true, produits: result });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};