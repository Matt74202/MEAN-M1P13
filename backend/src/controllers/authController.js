const User = require('../models/user');
const Boutique = require('../models/Boutique');
const Client = require('../models/Client');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const generateToken = (user) => {
  return jwt.sign(
    {
      id:   user._id,
      mail: user.mail,
      role: user.role,
    },
    process.env.JWT_SECRET || 'votre_secret_par_defaut_pour_test',
    { expiresIn: '7d' }
  );
};

exports.login = async (req, res) => {
  try {
    const { mail, mdp } = req.body;

    const user = await User.findOne({ mail }).select('+mdp');
    if (!user)
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });

    const isMatch = await user.comparePassword(mdp);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });

    // ── Résolution du profileId selon le rôle ──
    let profileId = null;

    if (user.role === 'boutique') {
      const boutique = await Boutique.findOne({ mail: user.mail });
      profileId = boutique ? boutique._id : user._id; // fallback sur user._id si pas de boutique séparée
    } else if (user.role === 'client') {
      const client = await Client.findOne({ mail: user.mail });
      profileId = client ? client._id : null;
    } else if (user.role === 'supermarche') {
      profileId = user._id; // l'admin utilise son propre _id comme profileId
    }

    const token = jwt.sign(
      {
        id:        user._id,
        mail:      user.mail,
        role:      user.role,
        profileId,
      },
      process.env.JWT_SECRET || 'secret_test',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id:        user._id,
        nom:       user.nom,
        mail:      user.mail,
        role:      user.role,
        profileId,
      },
    });

  } catch (err) {
    console.error('Erreur login:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-mdp');
    if (!user)
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

    res.json({ success: true, user });
  } catch (err) {
    console.error('Erreur getMe:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { nom, mail, mdp, adresse, role, description, typeCommerce, contact, logo, prenom } = req.body;

    // Interdire la création de compte supermarche via l'API
    if (role === 'supermarche') {
      return res.status(403).json({
        success: false,
        message: "Impossible de créer un compte supermarché via cette interface.",
      });
    }

    const allowedRoles = ['boutique', 'client'];
    const finalRole = allowedRoles.includes(role) ? role : 'client';

    const existingUser = await User.findOne({ mail });
    if (existingUser)
      return res.status(400).json({ success: false, message: 'Cet email est déjà utilisé' });

    const user = new User({
      nom,
      mail,
      mdp,
      adresse:      adresse || '',
      role:         finalRole,
      description:  finalRole === 'boutique' ? (description  || '')    : undefined,
      typeCommerce: finalRole === 'boutique' ? (typeCommerce || 'autre'): undefined,
      contact:      finalRole === 'boutique' ? (contact      || {})     : undefined,
      logo:         finalRole === 'boutique' ? (logo         || '')     : undefined,
      prenom:       finalRole === 'client'   ? (prenom       || '')     : undefined,
    });

    const savedUser = await user.save();
    const token = generateToken(savedUser);

    res.status(201).json({
      success: true,
      token,
      user: {
        id:      savedUser._id,
        nom:     savedUser.nom,
        mail:    savedUser.mail,
        adresse: savedUser.adresse,
        role:    savedUser.role,
      },
    });

  } catch (error) {
    console.error('Erreur register:', error);
    let message = "Erreur serveur lors de l'inscription";
    if (error.code === 11000) message = 'Cet email est déjà utilisé';
    if (error.name === 'ValidationError') message = 'Données invalides';

    res.status(500).json({
      success: false,
      message,
      errorDetail: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};