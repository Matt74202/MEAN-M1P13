const Favori = require('../models/Favori');

// ── Toggle favori (ajoute ou retire) ──────────
exports.toggleFavori = async (req, res) => {
  try {
    const { idClient, type, idCible } = req.body;

    if (!['produit', 'boutique'].includes(type)) {
      return res.status(400).json({ message: 'Type invalide' });
    }

    const existant = await Favori.findOne({ idClient, type, idCible });

    if (existant) {
      await Favori.deleteOne({ _id: existant._id });
      return res.json({ success: true, favori: false, message: 'Retiré des favoris' });
    }

    await Favori.create({ idClient, type, idCible });
    res.json({ success: true, favori: true, message: 'Ajouté aux favoris' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Favoris d'un client ───────────────────────
exports.getFavorisClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { type } = req.query;

    const filter = { idClient: clientId };
    if (type) filter.type = type;

    const favoris = await Favori.find(filter).sort({ date: -1 });

    res.json({ success: true, favoris });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── IDs en favoris d'un client (pour init rapide) ──
exports.getIdsFavorisClient = async (req, res) => {
  try {
    const { clientId, type } = req.query;

    const filter = { idClient: clientId };
    if (type) filter.type = type;

    const favoris = await Favori.find(filter, 'idCible type');
    const ids = favoris.map(f => f.idCible.toString());

    res.json({ success: true, ids });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};