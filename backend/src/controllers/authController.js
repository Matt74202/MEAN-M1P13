const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, mail: user.mail },
    process.env.JWT_SECRET || 'votre_secret_par_defaut_pour_test',
    { expiresIn: '7d' }
  );
};

exports.login = async (req, res) => {
  try {
    console.log('=== DEBUG LOGIN ===');
    console.log('Headers:', req.headers);
    console.log('Body reçu:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Erreurs validation login:', errors.array());
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { mail, mdp } = req.body;

    const user = await User.findOne({ mail }).select('+mdp');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    const isMatch = await user.comparePassword(mdp);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        nom: user.nom,
        mail: user.mail,
        adresse: user.adresse,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la connexion'
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-mdp');
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }
    
    res.json({
      success: true,
      user
    });
    
  } catch (err) {
    console.error('Erreur getMe:', err);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { nom, mail, mdp, adresse, role, description, typeCommerce, contact, logo, prenom } = req.body;

    // Sécurité renforcée : on interdit complètement le rôle supermarche via l'API
    if (role === 'supermarche') {
      return res.status(403).json({
        success: false,
        message: 'Impossible de créer un compte supermarché via cette interface. Le compte administrateur existe déjà et a été créé manuellement.'
      });
    }

    // On force le rôle à être soit 'boutique' soit 'client'
    // Si rien n'est envoyé ou valeur invalide → on met 'client' par défaut
    const allowedRoles = ['boutique', 'client'];
    const finalRole = allowedRoles.includes(role) ? role : 'client';

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ mail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Création de l'utilisateur
    const user = new User({
      nom,
      mail,
      mdp,
      adresse: adresse || '',
      role: finalRole,
      // Champs boutique (seulement si role boutique)
      description: finalRole === 'boutique' ? (description || '') : undefined,
      typeCommerce: finalRole === 'boutique' ? (typeCommerce || 'autre') : undefined,
      contact: finalRole === 'boutique' ? (contact || {}) : undefined,
      logo: finalRole === 'boutique' ? (logo || '') : undefined,
      // Champs client
      prenom: finalRole === 'client' ? (prenom || '') : undefined
    });

    const savedUser = await user.save();

    const token = generateToken(savedUser);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: savedUser._id,
        nom: savedUser.nom,
        mail: savedUser.mail,
        adresse: savedUser.adresse,
        role: savedUser.role
      }
    });

  } catch (error) {
    console.error('Erreur register:', error);
    let message = 'Erreur serveur lors de l\'inscription';
    if (error.code === 11000) message = 'Cet email est déjà utilisé';
    if (error.name === 'ValidationError') message = 'Données invalides';
    
    res.status(500).json({
      success: false,
      message,
      errorDetail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};