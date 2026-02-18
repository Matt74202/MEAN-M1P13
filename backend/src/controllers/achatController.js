const Achat = require('../models/Achat');
const Panier = require('../models/Panier');
const FraisLivraison = require('../models/FraisLivraison');

// Calculer le frais selon la distance
function calculerFrais(distanceKm) {
  const frais = [
    { min: 0, max: 4, prix: 4000 },
    { min: 4, max: 8, prix: 6000 },
    { min: 8, max: Infinity, prix: 10000 }
  ];
  
  const tranche = frais.find(f => distanceKm >= f.min && distanceKm < f.max);
  return tranche ? tranche.prix : 10000;
}

// POST : Créer une commande
exports.creerCommande = async (req, res) => {
  try {
    const { 
      idClient, 
      typeLivraison, 
      modePaiement,
      telephone, 
      livraison
    } = req.body;

    // Validation
    if (!telephone) {
      return res.status(400).json({ message: 'Numéro de téléphone requis' });
    }

    // Récupérer le panier
    const panier = await Panier.findOne({ idClient, statut: 'EN_COURS' });
    if (!panier || panier.articles.length === 0) {
      return res.status(400).json({ message: 'Panier vide' });
    }

    // Préparer les détails
    const details = panier.articles.map(a => ({
      idProduit:    a.idProduit,
      nom:          a.nom,
      quantite:     a.quantite,
      prixUnitaire: a.prix
    }));

    let total = panier.total;
    let livraisonData = null;

    // Si livraison → calculer frais
    if (typeLivraison === 'livraison') {
      const frais = calculerFrais(livraison.distance);
      total += frais;
      
      livraisonData = {
        adresse:   livraison.adresse,
        latitude:  livraison.latitude,
        longitude: livraison.longitude,
        distance:  livraison.distance,
        frais
      };
    }

    const achat = await Achat.create({
      idClient,
      details,
      modePaiement,
      typeLivraison,
      telephone,  
      livraison: livraisonData,
      total,
      statut: 'EN_ATTENTE'
    });

    // Vider le panier
    panier.articles = [];
    panier.total = 0;
    await panier.save();

    res.json({ success: true, achat });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET : Liste des commandes d'un client
exports.getCommandesClient = async (req, res) => {
  try {
    const achats = await Achat.find({ idClient: req.params.clientId })
      .sort({ dateAchat: -1 });
    res.json(achats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};