// controllers/panierController.js
const Panier  = require('../models/Panier');
const Produit = require('../models/Produit');

// ── GET : Récupérer ou créer le panier EN_COURS du client ──
exports.getPanier = async (req, res) => {
  try {
    let panier = await Panier.findOne({
      idClient: req.params.clientId,
      statut:   'EN_COURS'
    });

    if (!panier) {
      panier = await Panier.create({
        idClient: req.params.clientId,
        articles: [],
        total:    0,
        statut:   'EN_COURS'
      });
    }

    res.json(panier);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST : Ajouter ou incrémenter un article ──
exports.ajouterArticle = async (req, res) => {
  try {
    const { idProduit, quantite, prix } = req.body;

    // Vérifier que le produit existe
    const produit = await Produit.findById(idProduit);
    if (!produit) return res.status(404).json({ message: 'Produit introuvable' });

    const prixUnitaire = (prix !== undefined && prix > 0) ? prix : produit.details.prix;

    // Récupérer ou créer le panier
    let panier = await Panier.findOne({
      idClient: req.params.clientId,
      statut:   'EN_COURS'
    });

    if (!panier) {
      panier = new Panier({
        idClient: req.params.clientId,
        articles: [],
        total:    0,
        statut:   'EN_COURS'
      });
    }

    // Article déjà dans le panier → incrémenter
    const idx = panier.articles.findIndex(
      a => a.idProduit.toString() === idProduit
    );

    if (idx >= 0) {
      panier.articles[idx].prix     = prixUnitaire;  
      panier.articles[idx].quantite += quantite;
      panier.articles[idx].sousTotal = prixUnitaire * panier.articles[idx].quantite;
    } else {
      // Nouvel article → snapshot des infos produit
      console.log('prixUnitaire calculé:', prixUnitaire, '| prix reçu:', prix, '| prix produit:', produit.details.prix);
      panier.articles.push({
      idProduit,
      nom:      produit.details.nom,
      prix:     prixUnitaire,       
      image:    produit.imageUrl || '',
      quantite,
      sousTotal: prixUnitaire * quantite 
    });
    }

    // Recalculer le total
    panier.total = panier.articles.reduce((s, a) => s + a.sousTotal, 0);
    await panier.save();

    res.json(panier);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT : Modifier la quantité d'un article ──
exports.modifierQuantite = async (req, res) => {
  try {
    const { idProduit, quantite } = req.body;

    const panier = await Panier.findOne({
      idClient: req.params.clientId,
      statut:   'EN_COURS'
    });
    if (!panier) {
      return res.status(404).json({ success: false, message: 'Panier non trouvé' });
    }

    const idx = panier.articles.findIndex(
      a => a.idProduit.toString() === idProduit
    );
    if (idx < 0) {
      return res.status(404).json({ success: false, message: 'Article non trouvé' });
    }

    if (quantite <= 0) {
      // Supprimer l'article si quantité = 0
      panier.articles.splice(idx, 1);
    } else {
      panier.articles[idx].quantite  = quantite;
      panier.articles[idx].sousTotal = panier.articles[idx].prix * quantite;
    }

    panier.total = panier.articles.reduce((s, a) => s + a.sousTotal, 0);
    await panier.save();

    res.json(panier);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE : Supprimer un article ──
exports.supprimerArticle = async (req, res) => {
  try {
    const panier = await Panier.findOne({
      idClient: req.params.clientId,
      statut:   'EN_COURS'
    });
    if (!panier) {
      return res.status(404).json({ success: false, message: 'Panier non trouvé' });
    }

    panier.articles = panier.articles.filter(
      a => a.idProduit.toString() !== req.params.idProduit
    );
    panier.total = panier.articles.reduce((s, a) => s + a.sousTotal, 0);
    await panier.save();

    res.json(panier);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE : Vider le panier ──
exports.viderPanier = async (req, res) => {
  try {
    const panier = await Panier.findOne({
      idClient: req.params.clientId,
      statut:   'EN_COURS'
    });
    if (!panier) {
      return res.status(404).json({ success: false, message: 'Panier non trouvé' });
    }

    panier.articles = [];
    panier.total    = 0;
    await panier.save();

    res.json(panier);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};