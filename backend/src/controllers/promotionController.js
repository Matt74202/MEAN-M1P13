const Promotion = require('../models/Promotion');

// ── Créer une promotion ──
exports.creerPromotion = async (req, res) => {
  try {
    const { idBoutique, details } = req.body;

    if (!idBoutique)           return res.status(400).json({ message: 'idBoutique requis' });
    if (!details?.idProduit)   return res.status(400).json({ message: 'idProduit requis' });
    if (!details?.pourcentage) return res.status(400).json({ message: 'pourcentage requis' });
    if (!details?.dateDebut)   return res.status(400).json({ message: 'dateDebut requise' });
    if (!details?.dateFin)     return res.status(400).json({ message: 'dateFin requise' });

    // Désactiver l'éventuelle promo existante sur ce produit
    await Promotion.deleteMany({ idBoutique, 'details.idProduit': details.idProduit });

    const promo = await Promotion.create({ idBoutique, details });
    res.status(201).json(promo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Toutes les promos d'une boutique ──
exports.getPromotionsBoutique = async (req, res) => {
  try {
    const { boutiqueId } = req.params;
    const promos = await Promotion.find({ idBoutique: boutiqueId })
      .populate('details.idProduit', 'details.nom details.prix details.image')
      .sort({ createdAt: -1 });
    res.json(promos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Promos actives d'une boutique (dateDebut <= now <= dateFin) ──
exports.getPromotionsActives = async (req, res) => {
  try {
    const { boutiqueId } = req.params;
    const now = new Date();
    const promos = await Promotion.find({
      idBoutique: boutiqueId,
      'details.dateDebut': { $lte: now },
      'details.dateFin':   { $gte: now },
    });
    res.json(promos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Supprimer une promotion ──
exports.supprimerPromotion = async (req, res) => {
  try {
    const promo = await Promotion.findByIdAndDelete(req.params.id);
    if (!promo) return res.status(404).json({ message: 'Promotion introuvable' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Modifier une promotion ──
exports.modifierPromotion = async (req, res) => {
  try {
    const promo = await Promotion.findByIdAndUpdate(
      req.params.id,
      { details: req.body.details },
      { new: true, runValidators: true }
    );
    if (!promo) return res.status(404).json({ message: 'Promotion introuvable' });
    res.json(promo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};