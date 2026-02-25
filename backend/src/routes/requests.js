const express = require('express');
const router = express.Router();
const RentalRequest = require('../models/rentalRequest');
const Box = require('../models/box');
const User = require('../models/user');
const Boutique = require('../models/Boutique');
const Contrat = require('../models/contrat');          // ← AJOUT IMPORT
const auth = require('../middlewares/auth');

// POST /api/requests - Boutique soumet une demande de location
router.post('/', auth, async (req, res) => {
  try {
    const { boxId, message, dureeMois } = req.body;     // ← AJOUT dureeMois
    const userId = req.user.id;

    console.log('[POST /requests] userId extrait :', userId);
    console.log('[POST /requests] req.user :', req.user);

    // Vérifier que l'utilisateur est une boutique
    if (req.user.role !== 'boutique') {
      return res.status(403).json({ 
        success: false, 
        message: 'Seules les boutiques peuvent soumettre une demande' 
      });
    }

    // Vérifier que le box existe et est libre
    const box = await Box.findById(boxId);
    if (!box) {
      return res.status(404).json({ success: false, message: 'Box non trouvé' });
    }
    if (box.statut !== 'libre') {
      return res.status(400).json({ 
        success: false, 
        message: 'Ce box n est plus disponible' 
      });
    }

    // ← AJOUT : validation de la durée
    if (!dureeMois || !Number.isInteger(dureeMois) || dureeMois < 6 || dureeMois > 36) {
      return res.status(400).json({ 
        success: false, 
        message: 'La durée doit être un nombre entier entre 6 et 36 mois' 
      });
    }

    // Vérifier si une demande est déjà en cours
    const existing = await RentalRequest.findOne({
      userId,
      boxId,
      statut: 'pending'
    });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Demande déjà en cours pour ce box' 
      });
    }

    const request = new RentalRequest({
      userId,
      boxId,
      messageBoutique: message || '',
      dureeMoisSouhaitee: dureeMois,           // ← AJOUT
      statut: 'pending'
    });

    console.log('[POST /requests] Objet request avant save :', request.toObject());

    await request.save();

    res.status(201).json({
      success: true,
      message: 'Demande de location envoyée avec succès',
      request
    });
  } catch (err) {
    console.error('[POST /requests] Erreur :', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur',
      error: err.message 
    });
  }
});

// GET /api/requests/pending - Admin voit les demandes en attente
router.get('/pending', auth, async (req, res) => {
  try {
    if (req.user.role !== 'supermarche') {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès réservé à l administrateur' 
      });
    }

    const requests = await RentalRequest.find({ statut: 'pending' })
      .populate('userId', 'nom mail')
      .populate({
        path: 'boxId',
        select: 'numero etage loyer superficie statut',
        populate: { path: 'etage', select: 'nom' }
      });

    console.log('📋 Demandes en attente:', requests.length);
    res.json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    console.error('[GET /pending] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/requests/:id/approve - Admin valide
router.post('/:id/approve', auth, async (req, res) => {
  try {
    if (req.user.role !== 'supermarche') {
      return res.status(403).json({ success: false, message: 'Accès réservé' });
    }

    const request = await RentalRequest.findById(req.params.id)
      .populate('userId')
      .populate('boxId');
      
    if (!request) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée' });
    }
    if (request.statut !== 'pending') {
      return res.status(400).json({ success: false, message: 'Demande déjà traitée' });
    }

    console.log('[APPROVE] Traitement de la demande pour:', request.userId.mail);

    // Récupérer le mot de passe hashé de l'utilisateur
    const userWithPassword = await User.findById(request.userId._id).select('+mdp');
    if (!userWithPassword) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    console.log('[APPROVE] Mot de passe récupéré:', !!userWithPassword.mdp);

    // Vérifier si la boutique existe déjà
    let boutique = await Boutique.findOne({ mail: request.userId.mail });
    
    if (boutique) {
      console.log('[APPROVE] Boutique existe déjà, ajout du box');
      if (!boutique.boxes.includes(request.boxId._id)) {
        boutique.boxes.push(request.boxId._id);
        await boutique.save();
      }
    } else {
      console.log('[APPROVE] Création d\'une nouvelle boutique');
      
      const mapTypeCommerce = (type) => {
        const mapping = {
          'électronique': 'tech', 'tech': 'tech',
          'vêtements': 'mode', 'mode': 'mode',
          'alimentaire': 'alimentation', 'alimentation': 'alimentation',
          'cosmétique': 'beauté', 'beauté': 'beauté',
          'service': 'services', 'services': 'services'
        };
        return mapping[type?.toLowerCase()] || 'autre';
      };

      const boutiqueData = {
        mail: request.userId.mail,
        mdp: userWithPassword.mdp,
        nom: request.userId.nom,
        description: request.userId.description || 'Description à compléter',
        typeCommerce: mapTypeCommerce(request.userId.typeCommerce),
        contact: {
          numero: request.userId.contact?.numero || '',
          email: request.userId.mail,
          reseau: request.userId.contact?.reseau || ''
        },
        logo: request.userId.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(request.userId.nom)}&background=random`,
        couleur: '#6c757d',
        boxes: [request.boxId._id],
        createdAt: new Date()
      };

      const result = await Boutique.collection.insertOne(boutiqueData);
      boutique = await Boutique.findById(result.insertedId);
      console.log('[APPROVE] Boutique créée avec succès:', boutique._id);
    }

    // ✅ Vérification fraîche du box depuis la DB
    const box = await Box.findById(request.boxId._id);
    if (!box) {
      return res.status(404).json({ success: false, message: 'Box non trouvé' });
    }
    if (box.statut !== 'libre') {
      return res.status(400).json({ 
        success: false, 
        message: 'Ce box est déjà occupé, impossible de valider cette demande' 
      });
    }

    // ✅ Mise à jour du box via findByIdAndUpdate (bypass hooks)
    await Box.findByIdAndUpdate(
      request.boxId._id,
      { statut: 'occupe', locataire: boutique._id },
      { new: true }
    );
    console.log('[APPROVE] Box mis à jour:', request.boxId._id);

    // Création du contrat
    const dureeMois = request.dureeMoisSouhaitee || 12;
    const dateDebut = new Date();
    const dateFin = new Date(dateDebut);
    dateFin.setMonth(dateFin.getMonth() + dureeMois);
    dateFin.setHours(23, 59, 59, 999);

    const nouveauContrat = new Contrat({
      userId: request.userId._id,
      boxId: request.boxId._id,
      dateDebut,
      dateFin,
      dureeMois,
      loyerMensuel: box.loyer || 0,
      caution: (box.loyer || 0) * 2,
      statut: 'signe'
    });
    await nouveauContrat.save();
    console.log('[APPROVE] Contrat créé :', nouveauContrat._id);

    // Mise à jour du rôle utilisateur
    await User.findByIdAndUpdate(request.userId._id, { role: 'boutique' });
    console.log('[APPROVE] User mis à jour: role = boutique');

    // Marquer la demande comme approuvée
    request.statut = 'approved';
    request.dateReponse = new Date();
    request.contratId = nouveauContrat._id;
    await request.save();
    console.log('[APPROVE] Demande marquée comme approved');

    res.json({ 
      success: true, 
      message: 'Demande approuvée, boutique créée et contrat généré',
      boutique: {
        id: boutique._id,
        nom: boutique.nom,
        mail: boutique.mail,
        typeCommerce: boutique.typeCommerce,
        boxes: boutique.boxes
      },
      contratId: nouveauContrat._id
    });
  } catch (err) {
    console.error('[POST /approve] Erreur complète:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// POST /api/requests/:id/reject - Admin rejette
router.post('/:id/reject', auth, async (req, res) => {
  try {
    if (req.user.role !== 'supermarche') {
      return res.status(403).json({ success: false, message: 'Accès réservé' });
    }

    const request = await RentalRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Demande non trouvée' });
    }
    if (request.statut !== 'pending') {
      return res.status(400).json({ success: false, message: 'Demande déjà traitée' });
    }

    request.statut = 'rejected';
    request.dateReponse = new Date();
    request.notesAdmin = req.body.notesAdmin || '';
    await request.save();

    res.json({ success: true, message: 'Demande rejetée' });
  } catch (err) {
    console.error('[POST /reject] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;