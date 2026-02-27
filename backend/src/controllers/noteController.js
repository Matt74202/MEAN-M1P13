const NoteBoutique = require('../models/NoteBoutique');
const NoteProduit  = require('../models/NoteProduit');
const mongoose     = require('mongoose');

exports.noterBoutique = async (req, res) => {
  try {
    const { idClient, idBoutique, note, commentaire } = req.body;
    if (!note || note < 1 || note > 5)
      return res.status(400).json({ message: 'Note invalide (1 à 5)' });

    const result = await NoteBoutique.findOneAndUpdate(
      { idClient, idBoutique },
      { note, commentaire: commentaire || '', date: new Date() },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ success: true, noteBoutique: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.noterProduit = async (req, res) => {
  try {
    const { idClient, idProduit, idBoutique, note, commentaire } = req.body;
    if (!note || note < 1 || note > 5)
      return res.status(400).json({ message: 'Note invalide (1 à 5)' });

    const result = await NoteProduit.findOneAndUpdate(
      { idClient, idProduit },
      { note, commentaire: commentaire || '', idBoutique, date: new Date() },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ success: true, noteProduit: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getStatsBoutique = async (req, res) => {
  try {
    const stats = await NoteBoutique.aggregate([
      { $match: { idBoutique: new mongoose.Types.ObjectId(req.params.boutiqueId) } },
      { $group: { _id: null, moyenne: { $avg: '$note' }, total: { $sum: 1 } }}
    ]);
    if (!stats.length) return res.json({ success: true, moyenne: null, total: 0 });
    res.json({ success: true, moyenne: Math.round(stats[0].moyenne * 10) / 10, total: stats[0].total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getStatsProduit = async (req, res) => {
  try {
    const stats = await NoteProduit.aggregate([
      { $match: { idProduit: new mongoose.Types.ObjectId(req.params.produitId) } },
      { $group: { _id: null, moyenne: { $avg: '$note' }, total: { $sum: 1 } }}
    ]);
    if (!stats.length) return res.json({ success: true, moyenne: null, total: 0 });
    res.json({ success: true, moyenne: Math.round(stats[0].moyenne * 10) / 10, total: stats[0].total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getStatsProduitsBoutique = async (req, res) => {
  try {
    const stats = await NoteProduit.aggregate([
      { $match: { idBoutique: new mongoose.Types.ObjectId(req.params.boutiqueId) } },
      { $group: { _id: '$idProduit', moyenne: { $avg: '$note' }, total: { $sum: 1 } }},
      { $project: { idProduit: '$_id', moyenne: { $round: ['$moyenne', 1] }, total: 1, _id: 0 }}
    ]);
    const map = {};
    stats.forEach(s => { map[s.idProduit.toString()] = { moyenne: s.moyenne, total: s.total }; });
    res.json({ success: true, stats: map });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};