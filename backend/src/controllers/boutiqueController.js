const Boutique = require('../models/Boutique');

exports.createBoutique = async (req, res) => {
  try {
    const boutique = new Boutique(req.body);
    await boutique.save();
    res.status(201).json(boutique);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getAllBoutiques = async (req, res) => {
  try {
    const { typeCommerce } = req.query;
    const filter = {};
    
    if (typeCommerce) filter.typeCommerce = typeCommerce;
    
    const boutiques = await Boutique.find(filter).sort({ nom: 1 });
    res.json(boutiques);
  } catch (err) {
    console.error('Erreur getAllBoutiques:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBoutiqueById = async (req, res) => {
  try {
    const boutique = await Boutique.findById(req.params.id);
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique non trouvée' });
    }
    res.json(boutique);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateBoutique = async (req, res) => {
  try {
    const boutique = await Boutique.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique non trouvée' });
    }
    res.json(boutique);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteBoutique = async (req, res) => {
  try {
    const boutique = await Boutique.findByIdAndDelete(req.params.id);
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique non trouvée' });
    }
    res.json({ success: true, message: 'Boutique supprimée' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};