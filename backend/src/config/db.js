const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('Tentative de connexion à :', process.env.MONGODB_URI);

    await mongoose.connect(process.env.MONGODB_URI, {
      // ces options ne sont plus obligatoires mais aident parfois à voir les erreurs
      serverSelectionTimeoutMS: 5000,
    });

    console.log('MongoDB connecté avec succès ✓');
    console.log('→ Base :', mongoose.connection.name);
    console.log('→ Host :', mongoose.connection.host);
  } catch (err) {
    console.error('─'.repeat(60));
    console.error('ERREUR CONNEXION MONGODB :');
    console.error(err.message);
    if (err.stack) console.error('Stack:', err.stack.split('\n')[1]);
    console.error('─'.repeat(60));

    // Pour debug : montre ce qui est vraiment lu dans .env
    console.log('MONGODB_URI lu =', process.env.MONGODB_URI || '(vide !)');

    process.exit(1);
  }
};

module.exports = connectDB;