const Produit = require('../models/Produit');
const cloudinary = require('../config/cloudinary');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');



// ────────────────────────────────────────────────
// Configuration Multer
// ────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/uploads/produits/';
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

  if (extname && mimetype) return cb(null, true);
  cb(new Error('Format non autorisé. Seules les images jpeg, jpg, png, webp sont acceptées.'));
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
}).single('image');


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
// Helpers
// ────────────────────────────────────────────────
const deleteLocalFile = async (filePath) => {
  if (!filePath) return;
  
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      console.log('🗑️ Fichier supprimé:', filePath);
    }
  } catch (error) {
    if (error.code === 'EPERM' || error.code === 'EBUSY') {
      console.warn('⚠️ Fichier verrouillé, suppression ignorée:', path.basename(filePath));
    } else {
      console.error('❌ Erreur suppression:', error.message);
    }
  }
};

const extractPublicIdFromUrl = (url) => {
  if (!url || !url.includes('cloudinary')) return null;
  const parts = url.split('/');
  const file = parts[parts.length - 1];
  const folder = parts[parts.length - 2];
  const publicId = `${folder}/${file.split('.')[0]}`;
  return publicId;
};


// ────────────────────────────────────────────────
// CREATE
// ────────────────────────────────────────────────

exports.createProduit = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return handleMulterError(err, res);

    try {
      console.log('=== CREATE PRODUIT DEBUG ===');
      console.log('Body:', req.body);
      console.log('File:', req.file);

      const {
        nom,
        description,
        categorie,
        prix,
        stock,
        enPromotion,
        idBoutique
      } = req.body;

      if (!nom || !categorie || !prix || !idBoutique) {
        deleteLocalFile(req.file?.path);
        return res.status(400).json({
          success: false,
          message: 'Nom, catégorie, prix et idBoutique sont requis'
        });
      }

      const prixNumber = Number(prix);
      if (isNaN(prixNumber) || prixNumber <= 0) {
        deleteLocalFile(req.file?.path);
        return res.status(400).json({
          success: false,
          message: 'Prix invalide'
        });
      }

      const produitData = {
        idBoutique,
        details: {
          nom: nom.trim(),
          description: description?.trim() || '',
          categorie: categorie.trim().toLowerCase(),
          prix: prixNumber,
          date: new Date()
        },
        stock: Number(stock) || 0,
        enPromotion: enPromotion === 'true' || enPromotion === true
      };

      // Upload avec compression Sharp
      if (req.file) {
        console.log('📤 Compression et upload vers Cloudinary...');
        console.log('Taille originale:', (req.file.size / 1024 / 1024).toFixed(2), 'Mo');
        
        const compressedPath = req.file.path.replace(/\.\w+$/, '-compressed.jpg');
        
        try {
          // Compression avec Sharp
          await sharp(req.file.path)
            .resize(1200, 1200, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: 80 })
            .toFile(compressedPath);
          
          const compressedStats = fs.statSync(compressedPath);
          console.log('Taille compressée:', (compressedStats.size / 1024 / 1024).toFixed(2), 'Mo');
          
          // Upload vers Cloudinary
          console.log('☁️ Upload vers Cloudinary...');
          const result = await cloudinary.uploader.upload(compressedPath, {
            folder: 'boutique-produits',
            resource_type: 'image'
          });

          console.log('✅ Upload Cloudinary réussi:', result.secure_url);
          produitData.imageUrl = result.secure_url;
          
          // Nettoyage
          deleteLocalFile(req.file.path);
          deleteLocalFile(compressedPath);
          
        } catch (cloudinaryError) {
          console.error('❌ Erreur:', cloudinaryError);
          deleteLocalFile(req.file.path);
          deleteLocalFile(compressedPath);
          return res.status(400).json({ 
            success: false, 
            message: `Erreur upload: ${cloudinaryError.message || cloudinaryError.error?.message}` 
          });
        }
      }

      console.log('💾 Création en base de données...');
      const nouveauProduit = await Produit.create(produitData);
      console.log('✅ Produit créé:', nouveauProduit._id);

      res.status(201).json({
        success: true,
        message: 'Produit créé avec succès',
        produit: nouveauProduit
      });

    } catch (error) {
      console.error('❌ ERREUR GLOBALE:', error);
      deleteLocalFile(req.file?.path);
      res.status(400).json({ success: false, message: error.message });
    }
  });
};


// ────────────────────────────────────────────────
// GET ALL (avec pagination)
// ────────────────────────────────────────────────
exports.getAllProduits = async (req, res) => {
  try {
    const {
      boutiqueId,
      categorie,
      enPromotion,
      sort = '-details.date',
      page = 1,
      limit = 10
    } = req.query;

    console.log('QUERY reçue:', req.query);

    const filter = {};

    if (boutiqueId) filter.idBoutique = boutiqueId;

    // Comparaison insensible à la casse → fonctionne quelle que soit la casse en base
    if (categorie) filter['details.categorie'] = { $regex: new RegExp(`^${categorie.trim()}$`, 'i') };

    if (enPromotion === 'true') filter.enPromotion = true;

    console.log('FILTER appliqué:', JSON.stringify(filter));

    const skip = (Number(page) - 1) * Number(limit);

    const produits = await Produit.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await Produit.countDocuments(filter);

    res.json({
      success: true,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      total,
      count: produits.length,
      produits
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ────────────────────────────────────────────────
// GET BY ID
// ────────────────────────────────────────────────
exports.getProduitById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID invalide' });
    }

    const produit = await Produit.findById(req.params.id);

    if (!produit) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    res.json({ success: true, produit });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ────────────────────────────────────────────────
// UPDATE
// ────────────────────────────────────────────────
exports.updateProduit = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return handleMulterError(err, res);

    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        deleteLocalFile(req.file?.path);
        return res.status(400).json({ success: false, message: 'ID invalide' });
      }

      const produit = await Produit.findById(req.params.id);
      if (!produit) {
        deleteLocalFile(req.file?.path);
        return res.status(404).json({ success: false, message: 'Produit non trouvé' });
      }

      const updateFields = {};

      if (req.body.nom) updateFields["details.nom"] = req.body.nom.trim();
      if (req.body.description) updateFields["details.description"] = req.body.description.trim();
      if (req.body.categorie) updateFields["details.categorie"] = req.body.categorie.trim().toLowerCase();

      if (req.body.prix) {
        const prix = Number(req.body.prix);
        if (isNaN(prix) || prix <= 0) {
          deleteLocalFile(req.file?.path);
          return res.status(400).json({ success: false, message: 'Prix invalide' });
        }
        updateFields["details.prix"] = prix;
      }

      if (req.body.stock !== undefined) {
        updateFields.stock = Number(req.body.stock);
      }

      if (req.body.enPromotion !== undefined) {
        updateFields.enPromotion =
          req.body.enPromotion === 'true' || req.body.enPromotion === true;
      }

      // Upload image avec compression
      if (req.file) {
        console.log('📤 Compression et upload nouvelle image...');
        console.log('Taille originale:', (req.file.size / 1024 / 1024).toFixed(2), 'Mo');
        
        const compressedPath = req.file.path.replace(/\.\w+$/, '-compressed.jpg');
        
        try {
          // Compression
          await sharp(req.file.path)
            .resize(1200, 1200, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: 80 })
            .toFile(compressedPath);
          
          const compressedStats = fs.statSync(compressedPath);
          console.log('Taille compressée:', (compressedStats.size / 1024 / 1024).toFixed(2), 'Mo');
          
          // Supprimer ancienne image Cloudinary
          if (produit.imageUrl) {
            const publicId = extractPublicIdFromUrl(produit.imageUrl);
            if (publicId) {
              await cloudinary.uploader.destroy(publicId);
            }
          }

          // Upload nouvelle image
          const result = await cloudinary.uploader.upload(compressedPath, {
            folder: 'boutique-produits',
            resource_type: 'image'
          });

          console.log('✅ Upload réussi:', result.secure_url);
          updateFields.imageUrl = result.secure_url;
          
          // Nettoyage
          deleteLocalFile(req.file.path);
          deleteLocalFile(compressedPath);
          
        } catch (cloudinaryError) {
          console.error('❌ Erreur upload:', cloudinaryError);
          deleteLocalFile(req.file.path);
          deleteLocalFile(compressedPath);
          return res.status(400).json({ 
            success: false, 
            message: `Erreur upload: ${cloudinaryError.message || cloudinaryError.error?.message}` 
          });
        }
      }

      const updatedProduit = await Produit.findByIdAndUpdate(
        req.params.id,
        { $set: updateFields },
        { new: true, runValidators: true }
      );

      res.json({ success: true, produit: updatedProduit });

    } catch (err) {
      deleteLocalFile(req.file?.path);
      res.status(400).json({ success: false, message: err.message });
    }
  });
};


// ────────────────────────────────────────────────
// DELETE
// ────────────────────────────────────────────────
exports.deleteProduit = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID invalide' });
    }

    const produit = await Produit.findByIdAndDelete(req.params.id);

    if (!produit) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    if (produit.imageUrl) {
      const publicId = extractPublicIdFromUrl(produit.imageUrl);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    }

    res.json({ success: true, message: 'Produit supprimé avec succès' });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
