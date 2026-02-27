const CarteFidelite = require('../models/CarteFidelite');

// GET : Récupérer la carte d'une boutique
exports.getCarteBoutique = async (req, res) => {
  try {
    const { boutiqueId } = req.params;
    
    let carte = await CarteFidelite.findOne({ idBoutique: boutiqueId });
    
    // Si pas de carte, créer une carte par défaut
    if (!carte) {
      carte = await CarteFidelite.create({
        idBoutique: boutiqueId,
        design: {
          couleur1: '#7d936c',
          couleur2: '#3a4a2f',
          slogan: 'Votre fidélité, nos récompenses',
          nombreCases: 10
        },
        reduction: {
          type: 'pourcentage',
          valeur: 10,
          description: '10% de réduction après 10 achats'
        }
      });
    }
    
    res.json(carte);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT : Mettre à jour la carte
exports.updateCarte = async (req, res) => {
  try {
    const { boutiqueId } = req.params;
    const { design, paliers, actif } = req.body;

    let carte = await CarteFidelite.findOne({ idBoutique: boutiqueId });

    if (!carte) {
      carte = new CarteFidelite({ idBoutique: boutiqueId });
    }

    if (design)             carte.design  = { ...carte.design.toObject(), ...design };
    if (paliers !== undefined) carte.paliers = paliers;  // ← manquait
    if (actif !== undefined)   carte.actif   = actif;

    await carte.save();
    res.json(carte);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE : Désactiver la carte
exports.desactiverCarte = async (req, res) => {
  try {
    const { boutiqueId } = req.params;
    
    const carte = await CarteFidelite.findOneAndUpdate(
      { idBoutique: boutiqueId },
      { actif: false },
      { new: true }
    );
    
    res.json(carte);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};