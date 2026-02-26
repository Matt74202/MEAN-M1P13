const CarteClient   = require('../models/CarteClient');
const CarteFidelite = require('../models/CarteFidelite');
const Boutique      = require('../models/Boutique'); // adapte le chemin si besoin

// Créer ou récupérer la carte client
exports.getOrCreateCarteClient = async (idClient, idBoutique) => {
  const carteFidelite = await CarteFidelite.findOne({ idBoutique, actif: true });
  if (!carteFidelite) return null;

  let carteClient = await CarteClient.findOne({ idClient, idBoutique });

  if (!carteClient) {
    carteClient = await CarteClient.create({
      idClient,
      idBoutique,
      idCarte:          carteFidelite._id,
      nombreAchat:      0,
      dateDebut:        new Date(),
      dateDernierAchat: new Date(),
    });
  }

  return { carteClient, carteFidelite };
};

// Incrémenter après un achat (appelé depuis creerCommande)
exports.incrementerAchat = async (idClient, idBoutique) => {
  const result = await exports.getOrCreateCarteClient(idClient, idBoutique);
  if (!result) return null;

  const { carteClient, carteFidelite } = result;
  const nombreCases = carteFidelite.design.nombreCases;

  const nouvelleValeur = (carteClient.nombreAchat % nombreCases) + 1;
  carteClient.nombreAchat      = nouvelleValeur;
  carteClient.dateDernierAchat = new Date();
  await carteClient.save();

  return { carteClient, carteFidelite };
};

// GET /client/:clientId — Toutes les cartes d'un client
exports.getAllCartesClient = async (req, res) => {
  try {
    const { clientId } = req.params;

    // Toutes les CarteClient du client
    const cartesClient = await CarteClient.find({ idClient: clientId });

    if (cartesClient.length === 0) {
      return res.json([]);
    }

    // Pour chaque carte : récupérer la CarteFidelite + le nom de la boutique
    const results = await Promise.all(
      cartesClient.map(async (carteClient) => {
        const carteFidelite = await CarteFidelite.findById(carteClient.idCarte);
        if (!carteFidelite) return null;

        const boutique = await Boutique.findById(carteClient.idBoutique).select('nom');
        const nomBoutique = boutique?.nom ?? 'Boutique';

        return { carteClient, carteFidelite, nomBoutique };
      })
    );

    // Filtrer les nulls (carte fidelite supprimée entre-temps)
    res.json(results.filter(Boolean));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /:clientId/:boutiqueId — Carte d'un client pour une boutique
exports.getCarteClient = async (req, res) => {
  try {
    const { clientId, boutiqueId } = req.params;

    const result = await exports.getOrCreateCarteClient(clientId, boutiqueId);

    if (!result) {
      return res.status(404).json({ message: 'Pas de programme fidélité actif' });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /simuler-reduction
exports.simulerReduction = async (req, res) => {
  try {
    const { clientId, boutiqueId, total } = req.query;

    const result = await exports.getOrCreateCarteClient(clientId, boutiqueId);
    if (!result) {
      return res.json({ reduction: 0, palier: null });
    }

    const { carteClient, carteFidelite } = result;
    const prochainNombre = carteClient.nombreAchat + 1;
    const palier = (carteFidelite.paliers ?? []).find(p => p.achatNumero === prochainNombre);

    let reduction = 0;
    if (palier) {
      if (palier.type === 'pourcentage') {
        reduction = Math.round(parseFloat(total) * palier.valeur / 100);
      } else if (palier.type === 'montant') {
        reduction = palier.valeur;
      }
    }

    res.json({ reduction, palier, nombreAchat: prochainNombre });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};