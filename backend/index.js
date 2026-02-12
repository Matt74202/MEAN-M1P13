require('dotenv').config();        
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const boxRoutes = require('./src/routes/boxRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// ───────────────────────────────────────
// Connexion MongoDB (directement ici)
// ───────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('┌──────────────────────────────────────┐');
    console.log('│  MongoDB connecté avec succès ✓      │');
    console.log(`│  Base : ${mongoose.connection.name}         │`);
    console.log('└──────────────────────────────────────┘');
  })
  .catch((err) => {
    console.error('┌─────────────────────────────────────────────┐');
    console.error('│  ÉCHEC CONNEXION MONGODB                    │');
    console.error(`│  → ${err.message}`);
    console.error('└─────────────────────────────────────────────┘');
    process.exit(1);   // arrête le serveur si la DB est indispensable
  });

// Routes
app.use('/api/boxes', boxRoutes);     // ou le préfixe que tu utilises

// Pour debug en dev
if (process.env.NODE_ENV === 'development') {
  mongoose.set('debug', true);        // affiche les requêtes MongoDB dans la console
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
  console.log(`Environnement : ${process.env.NODE_ENV || 'development'}`);
});