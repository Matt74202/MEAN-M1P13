const CarteClient   = require('../models/CarteClient');
const CarteFidelite = require('../models/CarteFidelite');

// Créer ou récupérer la carte client
exports.getOrCreateCarteClient = async (idClient, idBoutique) => {
  const carteFidelite = await CarteFidelite.findOne({ idBoutique, actif: true });
  if (!carteFidelite) return null;

  let carteClient = await CarteClient.findOne({ idClient, idBoutique });

  if (!carteClient) {
    carteClient = await CarteClient.create({
      idClient,
      idBoutique,
      idCarte:    carteFidelite._id,
      nombreAchat: 0, // ← commence à 0 avant le premier achat
      dateDebut:   new Date(),
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

  // Cycle : après nombreCases achats, on repart à 1
  const nouvelleValeur = (carteClient.nombreAchat % nombreCases) + 1;
  carteClient.nombreAchat      = nouvelleValeur;
  carteClient.dateDernierAchat = new Date();
  await carteClient.save();

  return { carteClient, carteFidelite };
};

// GET : Récupérer la carte d'un client pour une boutique
exports.getCarteClient = async (req, res) => {
  try {
    const { clientId, boutiqueId } = req.params;

    // ── Créer automatiquement si n'existe pas ──
    const result = await exports.getOrCreateCarteClient(clientId, boutiqueId);
    
    if (!result) {
      return res.status(404).json({ message: 'Pas de programme fidélité actif' }); 
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET : Simuler la réduction AVANT l'achat
exports.simulerReduction = async (req, res) => {
  try {
    const { clientId, boutiqueId, total } = req.query;

    const result = await exports.getOrCreateCarteClient(clientId, boutiqueId);
    if (!result) {
      return res.json({ reduction: 0, palier: null });
    }

    const { carteClient, carteFidelite } = result;
    
    // Nombre d'achats APRÈS cet achat (on simule +1)
    const prochainNombre = carteClient.nombreAchat + 1;
    
    // Chercher un palier pour ce nombre
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