require('dotenv').config();        
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const boxRoutes            = require('./src/routes/boxRoutes');
const produitRoutes        = require('./src/routes/produitRoutes');
const boutiqueRoutes       = require('./src/routes/boutiqueRoutes');
const contratRoutes        = require('./src/routes/contratRoutes');
const userRoutes           = require('./src/routes/userRoutes');
const panierRoutes         = require('./src/routes/panierRoutes');
const fraisLivraisonRoutes = require('./src/routes/fraisLivraisonRoutes');
const carteClientRoutes    = require('./src/routes/carteClientRoutes');
const stockRoutes          = require('./src/routes/stockRoutes');

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('┌──────────────────────────────────────┐');
    console.log('│  MongoDB connecté avec succès ✓      │');
    console.log(`│  Base : ${mongoose.connection.name}         │`);
    console.log('└──────────────────────────────────────┘');
  })
  .catch((err) => {
    console.error('ÉCHEC CONNEXION MONGODB :', err.message);
    process.exit(1);
  });

// Routes
app.use('/api/boxes',          boxRoutes);     
app.use('/api/produits',       produitRoutes);
app.use('/api/boutiques',      boutiqueRoutes);
app.use('/api/contrats',       contratRoutes);
app.use('/api/users',          userRoutes);
app.use('/api/paniers',        panierRoutes);
app.use('/api/frais',          fraisLivraisonRoutes);
app.use('/api/achats',         require('./src/routes/achatRoutes'));
app.use('/api/carte-fidelite', require('./src/routes/carteFideliteRoutes'));
app.use('/api/cartes-client',  carteClientRoutes);
app.use('/api/promotions', require('./src/routes/promotionRoutes'));
app.use('/api/stock', stockRoutes);
app.use('/api/favoris', require('./src/routes/favoriRoutes'));
app.use('/api/notes', require('./src/routes/noteRoutes'));
app.use('/api/dashboard', require('./src/routes/dashboardRoutes'));

if (process.env.NODE_ENV === 'development') {
  mongoose.set('debug', true);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
  console.log(`Environnement : ${process.env.NODE_ENV || 'development'}`);
});