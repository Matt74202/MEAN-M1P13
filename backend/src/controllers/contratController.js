const Contrat = require('../models/Contrat');

// Créer un nouveau contrat
exports.createContrat = async (req, res) => {
  try {
    const contrat = new Contrat(req.body);
    await contrat.save();
    res.status(201).json(contrat);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Récupérer tous les contrats avec filtres optionnels
exports.getAllContrats = async (req, res) => {
  try {
    const { idBoutique, idBox, statut } = req.query;
    const filter = {};

    if (idBoutique) filter.idBoutique = idBoutique;
    if (idBox) filter.idBox = idBox;
    if (statut) filter.statut = statut;

    const contrats = await Contrat.find(filter)
      .populate('idBoutique', 'nom') // Optionnel: peupler les références
      .populate('idBox', 'nom typeNom')
      .sort({ dateDebut: -1 });

    res.json(contrats);
  } catch (err) {
    console.error('Erreur getAllContrats:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Récupérer un contrat par ID
exports.getContratById = async (req, res) => {
  try {
    const contrat = await Contrat.findById(req.params.id)
      .populate('idBoutique')
      .populate('idBox');
    
    if (!contrat) {
      return res.status(404).json({ success: false, message: 'Contrat non trouvé' });
    }
    res.json(contrat);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Mettre à jour un contrat
exports.updateContrat = async (req, res) => {
  try {
    const contrat = await Contrat.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!contrat) {
      return res.status(404).json({ success: false, message: 'Contrat non trouvé' });
    }
    res.json(contrat);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Supprimer un contrat
exports.deleteContrat = async (req, res) => {
  try {
    const contrat = await Contrat.findByIdAndDelete(req.params.id);
    
    if (!contrat) {
      return res.status(404).json({ success: false, message: 'Contrat non trouvé' });
    }
    res.json({ success: true, message: 'Contrat supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};