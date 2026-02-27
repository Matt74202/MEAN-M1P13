const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  console.log('[AUTH MIDDLEWARE] === Début vérification ===');

  // Récupération complète du header
  const authHeader = req.headers.authorization || req.headers.Authorization;
  console.log('[AUTH MIDDLEWARE] Header Authorization reçu :', authHeader);

  if (!authHeader) {
    console.log('[AUTH MIDDLEWARE] Aucun header Authorization → 401');
    return res.status(401).json({ 
      success: false, 
      message: 'Aucun token fourni (header Authorization manquant)' 
    });
  }

  // Vérification du format Bearer
  if (!authHeader.startsWith('Bearer ')) {
    console.log('[AUTH MIDDLEWARE] Format incorrect (pas de "Bearer ") → 401');
    return res.status(401).json({ 
      success: false, 
      message: 'Format du token incorrect (attendu : Bearer <token>)' 
    });
  }

  // Extraction du token (robustesse : trim + gestion espaces)
  const token = authHeader.replace('Bearer ', '').trim();
  console.log('[AUTH MIDDLEWARE] Token extrait (premiers 30 chars) :', token.substring(0, 30) + '...');

  if (!token || token.length < 10) {  // sécurité basique
    console.log('[AUTH MIDDLEWARE] Token vide ou trop court après extraction → 401');
    return res.status(401).json({ success: false, message: 'Token vide ou mal formé' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_par_defaut_pour_test');
    console.log('[AUTH MIDDLEWARE] Token VALIDE ! Décodé :', {
      id: decoded.id,
      mail: decoded.mail,
      iat: new Date(decoded.iat * 1000).toISOString(),
      exp: new Date(decoded.exp * 1000).toISOString()
    });

    req.user = decoded;
    next();
  } catch (err) {
    console.error('[AUTH MIDDLEWARE] ÉCHEC jwt.verify :', err.name, err.message);

    let message = 'Token invalide';
    if (err.name === 'TokenExpiredError') message = 'Token expiré';
    if (err.name === 'JsonWebTokenError') message = 'Token mal formé ou signature invalide';
    if (err.name === 'NotBeforeError') message = 'Token pas encore valide';

    return res.status(401).json({ 
      success: false, 
      message,
      error: err.message  // visible en dev
    });
  }
};