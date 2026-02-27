const RentalRequest = require('../models/rentalRequest');
const Box           = require('../models/Box');
const Contrat       = require('../models/Contrat');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/requests
// Body : { boxId, userId, message, dureeMois }
// ─────────────────────────────────────────────────────────────────────────────
exports.createRequest = async (req, res) => {
  try {
    console.log('BODY REÇU:', req.body);
    const { boxId, message, dureeMois, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId manquant' });
    }
    if (!boxId) {
      return res.status(400).json({ success: false, message: 'boxId manquant' });
    }

    const box = await Box.findById(boxId);
    if (!box) {
      return res.status(404).json({ success: false, message: 'Box non trouvée' });
    }
    if (box.statut !== 'LIBRE') {
      return res.status(400).json({ success: false, message: 'Cette box n\'est plus disponible' });
    }

    const dejaExistante = await RentalRequest.findOne({ boxId, statut: 'pending' });
    if (dejaExistante) {
      return res.status(409).json({ success: false, message: 'Une demande est déjà en attente pour cette box' });
    }

    const request = new RentalRequest({
      userId,
      boxId,
      dureeMois:       Number(dureeMois) || 12,
      messageBoutique: message || '',
      statut:          'pending',
    });

    await request.save();
    console.log('[createRequest] Demande créée :', request._id);

    res.status(201).json({
      success: true,
      message: 'Demande de location envoyée avec succès',
      request,
    });
  } catch (err) {
    console.error('[createRequest] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/requests/pending
// ─────────────────────────────────────────────────────────────────────────────
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await RentalRequest.find({ statut: 'pending' })
      .populate('userId', 'nom mail')
      .populate('boxId', 'nom etage loyer typeNom statut');

    res.json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    console.error('Erreur getPendingRequests:', err);
    res.status(500).json({ success: false, message: 'Erreur récupération' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/requests/:id/validate
// ─────────────────────────────────────────────────────────────────────────────
exports.validateRequest = async (req, res) => {
  try {
    // On ne populate pas userId — on garde l'ObjectId brut pour le contrat
    const request = await RentalRequest.findById(req.params.id)
      .populate('boxId');

    if (!request)
      return res.status(404).json({ success: false, message: 'Demande non trouvée' });
    if (request.statut !== 'pending')
      return res.status(400).json({ success: false, message: 'Demande déjà traitée' });

    const box = request.boxId;
    if (box.statut !== 'LIBRE')
      return res.status(400).json({ success: false, message: 'Box plus disponible' });

    // userId = ObjectId brut (pas populé)
    const boutiqueRef = request.userId;

    const dureeMois = req.body.dureeMois || request.dureeMois || 12;
    const dateDebut = new Date();
    const dateFin   = new Date(dateDebut);
    dateFin.setMonth(dateFin.getMonth() + dureeMois);

    const contrat = new Contrat({
      idBoutique: boutiqueRef,
      idBox:      box._id,
      duree:      dureeMois,
      dateDebut,
      dateFin,
      statut:     'ACTIF',
    });
    await contrat.save();

    // updateOne évite la revalidation complète du schéma Box (typeNom required, etc.)
    await box.updateOne({ $set: { statut: 'OCCUPE' } });

    request.statut     = 'approved';
    request.notesAdmin = req.body.notesAdmin || 'Approuvée par admin';
    request.contratId  = contrat._id;
    await request.save();

    res.json({ success: true, message: 'Demande validée', contrat });
  } catch (err) {
    console.error('Erreur validateRequest:', err);
    res.status(500).json({ success: false, message: 'Erreur validation', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/requests/:id/reject
// ─────────────────────────────────────────────────────────────────────────────
exports.rejectRequest = async (req, res) => {
  try {
    const request = await RentalRequest.findById(req.params.id);
    if (!request)
      return res.status(404).json({ success: false, message: 'Demande non trouvée' });
    if (request.statut !== 'pending')
      return res.status(400).json({ success: false, message: 'Demande déjà traitée' });

    request.statut     = 'rejected';
    request.notesAdmin = req.body.notesAdmin || 'Rejetée par admin';
    await request.save();

    res.json({ success: true, message: 'Demande rejetée' });
  } catch (err) {
    console.error('Erreur rejectRequest:', err);
    res.status(500).json({ success: false, message: 'Erreur rejet' });
  }
};

exports.getAllRequests = async (req, res) => {
  try {
    const requests = await RentalRequest.find()
      .populate('userId', 'nom mail')
      .populate('boxId', 'nom etage loyer typeNom statut')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    console.error('Erreur getAllRequests:', err);
    res.status(500).json({ success: false, message: 'Erreur récupération' });
  }
};