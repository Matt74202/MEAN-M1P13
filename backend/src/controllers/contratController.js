const Contrat = require('../models/Contrat');

exports.createContrat = async (req, res) => {
  try {
    const contrat = new Contrat(req.body);
    await contrat.save();
    res.status(201).json(contrat);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getAllContrats = async (req, res) => {
  try {
    const { idBoutique, idBox, statut } = req.query;
    const filter = {};

    if (idBoutique) filter.idBoutique = idBoutique;
    if (idBox) filter.idBox = idBox;
    if (statut) filter.statut = statut;

    const contrats = await Contrat.find(filter)
      .sort({ dateDebut: -1 });

    // Transformer les contrats pour avoir des strings simples
    const contratsFormatted = contrats.map(c => ({
      _id: c._id.toString(),
      idBoutique: c.idBoutique.toString(),  // ← String au lieu d'objet
      idBox: c.idBox.toString(),            // ← String au lieu d'objet
      duree: c.duree,
      dateDebut: c.dateDebut,
      dateFin: c.dateFin,
      statut: c.statut
    }));

    res.json(contratsFormatted);
  } catch (err) {
    console.error('Erreur getAllContrats:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

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