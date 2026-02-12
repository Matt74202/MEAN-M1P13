const Box = require('../models/Box');

exports.createBox = async (req, res) => {
  try {
    const box = new Box(req.body);
    await box.save();
    res.status(201).json(box);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getAllBoxes = async (req, res) => {
  try {
    const { etage, statut } = req.query;
    const filter = {};

    if (etage) filter.etage = etage;
    if (statut) filter.statut = statut;

    const boxes = await Box.find(filter)
      .populate('idType', 'nom longueur largeur') // optionnel
      .sort({ etage: 1, y: 1, x: 1 });

    res.json(boxes);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBoxById = async (req, res) => {
  try {
    const box = await Box.findById(req.params.id).populate('idType');
    if (!box) {
      return res.status(404).json({ success: false, message: 'Box non trouvée' });
    }
    res.json(box);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateBox = async (req, res) => {
  try {
    const box = await Box.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!box) {
      return res.status(404).json({ success: false, message: 'Box non trouvée' });
    }
    res.json(box);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteBox = async (req, res) => {
  try {
    const box = await Box.findByIdAndDelete(req.params.id);
    if (!box) {
      return res.status(404).json({ success: false, message: 'Box non trouvée' });
    }
    res.json({ success: true, message: 'Box supprimée' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};