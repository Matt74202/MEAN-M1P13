const Achat  = require('../models/Achat');
const Panier = require('../models/Panier');
const { incrementerAchat } = require('./carteClientController');
const { sortieStockInterne } = require('./stockController');

function calculerFrais(distanceKm) {
  if (distanceKm < 4) return 4000;
  if (distanceKm < 8) return 6000;
  return 10000;
}

exports.creerCommande = async (req, res) => {
  try {
    const {
      idClient, idBoutique, typeLivraison,
      modePaiement, telephone, livraison, reduction
    } = req.body;

    if (!telephone)  return res.status(400).json({ message: 'Numéro de téléphone requis' });
    if (!idBoutique) return res.status(400).json({ message: 'idBoutique requis' });

    const panier = await Panier.findOne({ idClient, statut: 'EN_COURS' });
    if (!panier || panier.articles.length === 0) {
      return res.status(400).json({ message: 'Panier vide' });
    }

    const details = panier.articles.map(a => ({
      idProduit:    a.idProduit,
      nom:          a.nom,
      quantite:     a.quantite,
      prixUnitaire: a.prix
    }));

    let total = panier.total;
    let livraisonData = null;

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

    if (reduction && reduction > 0) {
      total = Math.max(0, total - reduction);
    }

    // 1. Vérifier et décrémenter le stock de chaque produit
    await Promise.all(
      panier.articles.map(article =>
        sortieStockInterne(
          idBoutique,
          article.idProduit,
          article.quantite,
          null  // idReference sera mis à jour après création de l'achat
        )
      )
    );

    // 2. Créer l'achat
    const achat = await Achat.create({
      idClient, idBoutique, details, modePaiement,
      typeLivraison, telephone,
      livraison: livraisonData,
      reduction: reduction || 0,
      total,
      statut: 'EN_ATTENTE'
    });

    // 3. Vider le panier
    panier.articles = [];
    panier.total    = 0;
    await panier.save();

    await incrementerAchat(idClient, idBoutique);

    res.json({ success: true, achat });

  } catch (err) {
    console.error('Erreur creerCommande:', err.message);
    // Si sortieStockInterne lève une erreur (stock insuffisant), elle remonte ici
    res.status(400).json({ message: err.message });
  }
};

exports.getCommandesClient = async (req, res) => {
  try {
    const achats = await Achat.find({ idClient: req.params.clientId })
      .sort({ createdAt: -1 });
    res.json(achats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getCommandesEnAttente = async (req, res) => {
  try {
    const { clientId } = req.params;

    const achats = await Achat.find({
      idClient: clientId,
      statut:   'EN_ATTENTE'
    }).sort({ createdAt: -1 });

    res.json({ success: true, achats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.marquerCommandeRecue = async (req, res) => {
  try {
    const achat = await Achat.findByIdAndUpdate(
      req.params.id,
      { statut: 'CONFIRMEE' },
      { new: true }
    );
    if (!achat) return res.status(404).json({ message: 'Commande non trouvée' });
    res.json({ success: true, achat });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

