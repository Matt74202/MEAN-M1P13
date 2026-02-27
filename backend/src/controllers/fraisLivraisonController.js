const FraisLivraison = require('../models/FraisLivraison');

// GET : Récupérer les frais (un seul document global)
exports.getFrais = async (req, res) => {
  try {
    let frais = await FraisLivraison.findOne();
    if (!frais) {
      // Créer avec valeurs par défaut si n'existe pas
      frais = await FraisLivraison.create({
        frais: [
          { distanceMin: 0,  distanceMax: 4, prix: 4000 },
          { distanceMin: 4,  distanceMax: 8, prix: 6000 },
          { distanceMin: 8,  distanceMax: Infinity, prix: 10000 }
        ]
      });
    }
    res.json(frais);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT : Mettre à jour toutes les tranches
exports.updateFrais = async (req, res) => {
  try {
    const { frais } = req.body;

    let doc = await FraisLivraison.findOne();
    if (!doc) {
      doc = new FraisLivraison({ frais: [] });
    }

    doc.frais = frais.map(t => ({
      distanceMin: t.distanceMin,
      distanceMax: t.distanceMax === null ? Infinity : t.distanceMax,
      prix:        t.prix,
      date:        new Date()
    }));

    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};