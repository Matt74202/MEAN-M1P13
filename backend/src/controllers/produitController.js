const Produit = require('../models/Produit');
const cloudinary = require('../config/cloudinary');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// ────────────────────────────────────────────────
// Configuration Multer (stockage local simple)
// ────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/uploads/produits/';
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `produit-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Format non autorisé. Seules les images jpeg, jpg, png, webp sont acceptées.'));
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
  fileFilter
}).single('image');  // ← nom du champ dans Postman = "image"


// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────
const handleMulterError = (err, res) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'Fichier trop volumineux (max 5 Mo)' });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};


// ────────────────────────────────────────────────
// CRUD
// ────────────────────────────────────────────────

exports.createProduit = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return handleMulterError(err, res);
    }

    // Debug pour voir exactement ce que reçoit le serveur
    console.log('DEBUG ─ req.body après multer :', JSON.stringify(req.body, null, 2));
    console.log('DEBUG ─ req.file :', req.file ? req.file : 'aucun fichier');

    try {
      // ─── Extraction robuste des champs (gère nested ET notation brackets) ───
      const detailsSource = req.body.details || {};

      const nom = (
        req.body['details[nom]'] ||
        detailsSource.nom ||
        req.body.nom ||
        ''
      ).trim();

      const categorie = (
        req.body['details[categorie]'] ||
        detailsSource.categorie ||
        req.body.categorie ||
        ''
      ).trim();

      const prixStr = (
        req.body['details[prix]'] ||
        detailsSource.prix ||
        req.body.prix ||
        '0'
      ).trim();

      const description = (
        req.body['details[description]'] ||
        detailsSource.description ||
        req.body.description ||
        ''
      ).trim();

      // ─── Validations explicites ───
      if (!nom) {
        return res.status(400).json({
          success: false,
          message: "Le nom du produit est requis",
          debug: { receivedBody: req.body, extractedNom: nom }
        });
      }

      if (!categorie) {
        return res.status(400).json({
          success: false,
          message: "La catégorie est requise",
          debug: { receivedBody: req.body }
        });
      }

      const prix = Number(prixStr);
      if (isNaN(prix) || prix <= 0) {
        return res.status(400).json({
          success: false,
          message: "Le prix doit être un nombre positif valide",
          debug: { prixRecu: prixStr }
        });
      }

      // ─── Construction des données pour Mongoose ───
      const produitData = {
        idBoutique: req.body.idBoutique,
        details: {
          nom,
          description,
          categorie,
          prix,               // ← ici c'est un Number (après conversion)
          date: req.body['details[date]'] || detailsSource.date
            ? new Date(req.body['details[date]'] || detailsSource.date)
            : new Date()
        },
        stock: Number(req.body.stock) || 0,
        enPromotion: req.body.enPromotion === 'true' ||
                     req.body.enPromotion === true ||
                     false
      };

      // ─── Upload vers Cloudinary si fichier présent ───
      if (req.file) {
  try {
    console.log('Début upload Cloudinary...');
    
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'boutique-produits',
      resource_type: 'image',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      transformation: [{ quality: 'auto' }, { fetch_format: 'auto' }],
      timeout: 120000   // ← 120 secondes (2 min) – teste d'abord ça
      // timeout: 180000  // 3 min si toujours timeout
    });

    console.log('Upload Cloudinary OK :', result.secure_url);
    produitData.imageUrl = result.secure_url;
    
    fs.unlinkSync(req.file.path);  // supprime temp
    
  } catch (cloudinaryErr) {
    console.error('ERREUR Cloudinary détaillée :', cloudinaryErr);
    // Ne bloque pas la création du produit (image optionnelle)
  }
} else {
  console.log('Aucun fichier image reçu');
}

      // ─── Debug avant sauvegarde ───
      console.log('DEBUG ─ Données envoyées à Mongoose :', JSON.stringify(produitData, null, 2));

      const nouveauProduit = new Produit(produitData);

      console.log('DEBUG ─ Instance Produit créée :', nouveauProduit.toObject());

      await nouveauProduit.save();

      console.log('DEBUG ─ Sauvegarde réussie');

      res.status(201).json({
        success: true,
        message: 'Produit créé avec succès',
        produit: nouveauProduit
      });

    } catch (error) {
      // Nettoyage fichier temporaire en cas d'erreur
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkErr) {
          console.error('Erreur suppression fichier temporaire :', unlinkErr);
        }
      }

      console.error('Erreur complète création produit :', error);

      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de la création du produit',
        debug: {
          receivedBody: req.body,
          errorStack: error.stack ? error.stack.split('\n').slice(0, 3) : undefined
        }
      });
    }
  });
};


exports.getAllProduits = async (req, res) => {
  try {
    const { boutiqueId, categorie, enPromotion, sort = '-details.date' } = req.query;
    const filter = {};

    if (boutiqueId) filter.idBoutique = boutiqueId;
    if (categorie) filter['details.categorie'] = categorie;
    if (enPromotion === 'true') filter.enPromotion = true;

    const produits = await Produit.find(filter)
      .sort(sort)
      .limit(50);

    res.json({ success: true, count: produits.length, produits });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.getProduitById = async (req, res) => {
  try {
    const produit = await Produit.findById(req.params.id);
    if (!produit) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }
    res.json({ success: true, produit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.updateProduit = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return handleMulterError(err, res);

    try {
      const updateData = { ...req.body };

      // Gestion nested fields (details)
      if (req.body['details[nom]'] || req.body.nom) {
        updateData.details = updateData.details || {};
        updateData.details.nom = req.body['details[nom]'] || req.body.nom;
      }
      // ... même chose pour description, categorie, prix si besoin

      if (req.file) {
        updateData.imageUrl = `/uploads/produits/${req.file.filename}`;
      }

      const produit = await Produit.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!produit) {
        return res.status(404).json({ success: false, message: 'Produit non trouvé' });
      }

      res.json({ success: true, produit });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });
};


exports.deleteProduit = async (req, res) => {
  try {
    const produit = await Produit.findByIdAndDelete(req.params.id);
    if (!produit) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    // Optionnel : supprimer l'image physique
    if (produit.imageUrl) {
      const filePath = path.join(__dirname, '..', '..', 'public', produit.imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({ success: true, message: 'Produit supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};