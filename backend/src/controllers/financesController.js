// src/controllers/financesController.js
const Contrat = require('../models/Contrat');
const Loyer   = require('../models/Loyer');
const Box     = require('../models/Box');
const User    = require('../models/User');

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function moisStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}
function moisLabel(date) {
  return date.toLocaleString('fr-FR', { month: 'short', year: '2-digit' });
}
function moisCalendaires(debut, fin) {
  return (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth());
}
function regressionLineaire(values) {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0 };
  const sumX  = values.reduce((s, _, i) => s + i, 0);
  const sumY  = values.reduce((s, v) => s + v, 0);
  const sumXY = values.reduce((s, v, i) => s + i * v, 0);
  const sumX2 = values.reduce((s, _, i) => s + i * i, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope     = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// ─────────────────────────────────────────────────────────────
// Construit le contexte enrichi pour le chatbot IA
// ─────────────────────────────────────────────────────────────
function buildContexteChatbot(data) {
  const { stats, analysePayeurs, previsions, contratsExpirants, revenusParBoutique } = data;

  const bons    = analysePayeurs.filter(b => b.categorie === 'excellent').map(b => b.boutiqueNom).join(',') || 'aucun';
  const mauvais = analysePayeurs.filter(b => b.categorie === 'mauvais').map(b => b.boutiqueNom).join(',')   || 'aucun';
  const moyens  = analysePayeurs.filter(b => b.categorie === 'moyen').map(b => b.boutiqueNom).join(',')     || 'aucun';

  const expirants = contratsExpirants.length > 0
    ? contratsExpirants.map(c => `${c.boutiqueNom} box${c.boxNumero} J-${c.joursRestants} loyer${Math.round((c.loyerMensuel||0)/1000)}kAr`).join(', ')
    : 'aucun';

  const payeursDetail = analysePayeurs
    .map(b => `${b.boutiqueNom}:score${b.scoreGlobal}/100 paiement${b.tauxPaiement}%(${b.nbPayes}/${b.moisAttendus}mois) ponctualite${b.tauxPonctualite}% retards${b.nbEnRetard}(moy${b.retardMoyenJours}j) total${Math.round((b.montantTotal||0)/1000)}kAr`)
    .join(' | ');

  const boutiquesDetail = revenusParBoutique
    .map(b => `${b.boutiqueNom}:${Math.round((b.totalPercu||0)/1000)}kAr(${b.nbPaiements}paiements)`)
    .join(' | ');

  const alertes = [];
  if (stats.revenuManque > stats.revenuReel * 0.3) alertes.push('ALERTE:revenus_manques_elevés(>' + Math.round(stats.revenuManque/1000) + 'kAr)');
  if (previsions.tauxRecouvrement < 50) alertes.push('ALERTE:taux_recouvrement_faible(' + previsions.tauxRecouvrement + '%)');
  if (contratsExpirants.filter(c => c.joursRestants <= 30).length > 0) alertes.push('ALERTE:contrats_expirent_dans_30j');
  analysePayeurs.filter(b => b.categorie === 'mauvais').forEach(b => alertes.push(`ALERTE:mauvais_payeur(${b.boutiqueNom})`));
  if (stats.tauxOccupation < 70) alertes.push('ALERTE:occupation_faible(' + stats.tauxOccupation + '%)');

  return [
    'Tu es un assistant financier expert pour un gestionnaire de marché (boutiques/boxes). Réponds en français, de façon claire et directe.',
    '',
    '=== DONNÉES FINANCIÈRES ===',
    `REVENUS: total=${Math.round((stats.revenuReel||0)/1000)}kAr | mois_courant=${Math.round((stats.revenuReelMoisCourant||0)/1000)}kAr | estime_mensuel=${Math.round((stats.revenuEstimeMensuel||0)/1000)}kAr | attendu_12mois=${Math.round((stats.revenuAttendu12Mois||0)/1000)}kAr | manque_cumule=${Math.round((stats.revenuManque||0)/1000)}kAr | en_attente=${Math.round((stats.montantEnAttente||0)/1000)}kAr | croissance_annuelle=${stats.tauxCroissanceAnnuel}%`,
    `OCCUPATION: ${stats.boxesOccupes}/${stats.totalBoxes}boxes(${stats.tauxOccupation}%) | contrats_actifs=${stats.nbContratsActifs}`,
    `PREVISIONS: recouvrement=${previsions.tauxRecouvrement}% | tendance=${previsions.tendancePct}% | mois_prochain=${Math.round((previsions.previsionMoisProchain?.prevision||0)/1000)}kAr | annuel_projete=${Math.round((previsions.previsionAnnuelle||0)/1000)}kAr | taux_renouvellement=${previsions.tauxRenouvellement}%`,
    `PAYEURS: excellents=${bons} | moyens=${moyens} | mauvais=${mauvais}`,
    `DETAIL_PAYEURS: ${payeursDetail}`,
    `CONTRATS_EXPIRANTS: ${expirants}`,
    `BOUTIQUES: ${boutiquesDetail}`,
    alertes.length > 0 ? `ALERTES_DETECTEES: ${alertes.join(' | ')}` : '',
    '',
    '=== LOGIQUE DES CALCULS (pour expliquer si demandé) ===',
    'SCORE_PAYEUR: score=(tauxPaiement*0.6)+(ponctualite*0.4) | excellent>=75 moyen>=50 mauvais<50',
    'PONCTUALITE: paiement a temps = date_paiement avant le 5 du mois concerné',
    'TAUX_PAIEMENT: nbMoisPayes/nbMoisAttendus*100 (moisAttendus = mois calendaires depuis debut contrat)',
    'RECOUVREMENT: totalPercu/totalAttendu sur 12 derniers mois',
    'PROJECTION: (base_contractuelle*0.5 + regression_lineaire*0.3 + renouvellement*0.2) * facteur_confiance_decroissant',
    'REVENU_MANQUE: somme des mois sans paiement sur toute la durée des contrats',
    'CROISSANCE: (revenus_12mois / revenus_12mois_precedents - 1) * 100',
    '',
    '=== INSTRUCTIONS ===',
    'Utilise UNIQUEMENT ces données pour répondre. Sois direct et actionnable.',
    'Pour un rapport mensuel: fais un résumé narratif structuré avec points forts, points faibles et recommandations.',
    'Pour des alertes: signale proactivement les anomalies détectées.',
    'Pour des conseils: base-toi sur les données pour formuler des actions concrètes avec délais.'
  ].filter(Boolean).join('\n');
}

// ─────────────────────────────────────────────────────────────
// Génère les alertes automatiques à afficher dans le chat
// ─────────────────────────────────────────────────────────────
function genererAlertes(data) {
  const { stats, analysePayeurs, previsions, contratsExpirants } = data;
  const alertes = [];

  analysePayeurs.filter(b => b.categorie === 'mauvais').forEach(b => {
    alertes.push({
      type: 'danger',
      titre: `Mauvais payeur : ${b.boutiqueNom}`,
      message: `Score ${b.scoreGlobal}/100 — ${b.tauxPaiement}% de paiement, ${b.nbEnRetard} retard(s) de ${b.retardMoyenJours}j en moyenne`,
      action: `Que faire avec ${b.boutiqueNom} qui est un mauvais payeur ?`
    });
  });

  contratsExpirants.filter(c => c.joursRestants <= 30).forEach(c => {
    alertes.push({
      type: 'warning',
      titre: `Contrat urgent : ${c.boutiqueNom}`,
      message: `Box ${c.boxNumero} expire dans ${c.joursRestants} jours — ${Math.round((c.loyerMensuel||0)/1000)}k Ar/mois à risque`,
      action: `Comment gérer le renouvellement du contrat de ${c.boutiqueNom} ?`
    });
  });

  if (previsions.tauxRecouvrement < 50) {
    alertes.push({
      type: 'warning',
      titre: `Recouvrement faible : ${previsions.tauxRecouvrement}%`,
      message: `Seulement ${previsions.tauxRecouvrement}% des loyers attendus sont encaissés`,
      action: 'Comment améliorer mon taux de recouvrement ?'
    });
  }

  if (stats.revenuManque > stats.revenuReel * 0.3) {
    alertes.push({
      type: 'danger',
      titre: `Revenu manqué élevé`,
      message: `${Math.round((stats.revenuManque||0)/1000)}k Ar de loyers jamais encaissés depuis le début`,
      action: 'Comment récupérer les revenus manqués ?'
    });
  }

  // Alerte si montant en attente significatif
  if (stats.montantEnAttente > 0) {
    alertes.push({
      type: 'warning',
      titre: `Loyers en attente : ${Math.round((stats.montantEnAttente||0)/1000)}k Ar`,
      message: `Des loyers de février et/ou mars ne sont pas encore enregistrés`,
      action: 'Quelles boutiques n\'ont pas encore payé leur loyer ?'
    });
  }

  if (stats.tauxOccupation < 70) {
    alertes.push({
      type: 'info',
      titre: `Occupation : ${stats.tauxOccupation}%`,
      message: `${stats.totalBoxes - stats.boxesOccupes} box(es) libre(s) sur ${stats.totalBoxes}`,
      action: "Comment optimiser le taux d'occupation ?"
    });
  }

  return alertes;
}

// ─────────────────────────────────────────────────────────────
// GET /api/finances/dashboard
// ─────────────────────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    console.log('[getDashboard] Début');
    const today = new Date();

    // ── 1. Données brutes ────────────────────────────────────
    const loyersPayes   = await Loyer.find({ statut: 'paye' }).lean();
    const loyersImpayés = await Loyer.find({ statut: 'impaye' }).lean();
    console.log('[getDashboard] loyersPayes OK:', loyersPayes.length);

    const revenuReel = loyersPayes.reduce((s, l) => s + (l.montant || 0), 0);

    const moisCourant = moisStr(today);
    const revenuReelMoisCourant = loyersPayes
      .filter(l => l.mois === moisCourant)
      .reduce((s, l) => s + (l.montant || 0), 0);

    const contratsActifs = await Contrat.find({ statut: 'ACTIF' })
      .populate('idBox',      'numero nom loyer superficie')
      .populate('idBoutique', 'nom mail')
      .lean();
    console.log('[getDashboard] contratsActifs OK:', contratsActifs.length);

    const tousLesContrats = await Contrat.find({})
      .populate('idBox',      'numero nom loyer superficie')
      .populate('idBoutique', 'nom mail')
      .lean();

    // Normalisation
    for (const c of contratsActifs) {
      c.loyerMensuel = c.idBox?.loyer || 0;
      c.boxId        = c.idBox;
      c.userId       = c.idBoutique;
    }
    for (const c of tousLesContrats) {
      c.loyerMensuel = c.idBox?.loyer || 0;
      c.boxId        = c.idBox;
      c.userId       = c.idBoutique;
    }

    // ── MONTANT EN ATTENTE (CORRIGÉ) ─────────────────────────
    // Base : loyers explicitement marqués 'impaye'
    let montantEnAttente = loyersImpayés.reduce((s, l) => s + (l.montant || 0), 0);

    // Ajout : loyers non enregistrés du mois courant ET du mois précédent
    const moisAVerifier = [moisStr(today), moisStr(addMonths(today, -1))];

    for (const contrat of contratsActifs) {
      for (const mois of moisAVerifier) {
        const debutContrat = new Date(contrat.dateDebut);
        const finContrat   = new Date(contrat.dateFin);
        const dateMois     = new Date(mois + '-01');

        // Le contrat couvre-t-il ce mois ?
        if (debutContrat > dateMois || finContrat < dateMois) continue;

        // Un paiement ou un impayé existe déjà pour ce mois ?
        const dejaPaye = loyersPayes.some(
          l => l.contratId === contrat._id.toString() && l.mois === mois
        );
        const dejaImpaye = loyersImpayés.some(
          l => l.contratId === contrat._id.toString() && l.mois === mois
        );

        // Ni payé ni marqué impayé = en attente
        if (!dejaPaye && !dejaImpaye) {
          montantEnAttente += contrat.loyerMensuel || 0;
        }
      }
    }

    const revenuEstimeMensuel = contratsActifs.reduce((s, c) => s + (c.loyerMensuel || 0), 0);

    const revenuEstimeTotalRestant = contratsActifs.reduce((s, c) => {
      const fin = new Date(c.dateFin);
      const moisRestants = Math.max(0, moisCalendaires(today, fin));
      return s + (c.loyerMensuel || 0) * moisRestants;
    }, 0);

    // Revenu attendu sur 12 mois glissants
    let revenuAttendu12Mois = 0;
    for (let i = 0; i < 12; i++) {
      const d = addMonths(today, i);
      revenuAttendu12Mois += contratsActifs
        .filter(c => new Date(c.dateDebut) <= d && new Date(c.dateFin) >= d)
        .reduce((s, c) => s + (c.loyerMensuel || 0), 0);
    }

    // Revenu manqué
    let revenuManque = 0;
    for (const contrat of tousLesContrats) {
      const debut    = new Date(contrat.dateDebut);
      const finCont  = new Date(contrat.dateFin);
      const finCalc  = finCont < today ? finCont : today;
      let curseur    = new Date(debut.getFullYear(), debut.getMonth(), 1);
      while (curseur <= finCalc) {
        const ml = moisStr(curseur);
        const payé = loyersPayes.some(l => l.contratId === contrat._id.toString() && l.mois === ml);
        if (!payé) revenuManque += contrat.loyerMensuel || 0;
        curseur = new Date(curseur.getFullYear(), curseur.getMonth() + 1, 1);
      }
    }

    // Taux de croissance annuel
    let revenuAn1 = 0, revenuAn2 = 0;
    for (let i = 1; i <= 12; i++) {
      const ml = moisStr(addMonths(today, -i));
      revenuAn1 += loyersPayes.filter(l => l.mois === ml).reduce((s, l) => s + (l.montant || 0), 0);
    }
    for (let i = 13; i <= 24; i++) {
      const ml = moisStr(addMonths(today, -i));
      revenuAn2 += loyersPayes.filter(l => l.mois === ml).reduce((s, l) => s + (l.montant || 0), 0);
    }
    const tauxCroissanceAnnuel = revenuAn2 > 0
      ? Math.round(((revenuAn1 - revenuAn2) / revenuAn2) * 100) : 0;

    // Contrats expirant dans les 3 prochains mois
    const dans3Mois = addMonths(today, 3);
    const contratsExpirants = contratsActifs
      .filter(c => {
        const fin = new Date(c.dateFin);
        return fin >= today && fin <= dans3Mois;
      })
      .map(c => ({
        contratId:    c._id.toString(),
        boutiqueNom:  c.userId?.nom  || c.userId?.mail || 'Inconnu',
        boutiqueMail: c.userId?.mail || '',
        boxNumero:    c.boxId?.numero || '?',
        boxNom:       c.boxId?.nom   || '',
        dateFin:      c.dateFin,
        loyerMensuel: c.loyerMensuel,
        joursRestants: Math.ceil((new Date(c.dateFin) - today) / (1000 * 60 * 60 * 24))
      }))
      .sort((a, b) => a.joursRestants - b.joursRestants);

    // ── 2. Revenus par box ───────────────────────────────────
    const revenusParBoxMap = new Map();
    for (const loyer of loyersPayes) {
      const contrat = tousLesContrats.find(c => c._id.toString() === loyer.contratId);
      if (!contrat?.boxId) continue;
      const boxId = contrat.boxId._id.toString();
      if (!revenusParBoxMap.has(boxId)) {
        revenusParBoxMap.set(boxId, { _id: boxId, boxNumero: contrat.boxId.numero, boxNom: contrat.boxId.nom, totalPercu: 0, nbPaiements: 0 });
      }
      revenusParBoxMap.get(boxId).totalPercu  += loyer.montant || 0;
      revenusParBoxMap.get(boxId).nbPaiements += 1;
    }
    for (const c of contratsActifs) {
      if (!c.boxId) continue;
      const boxId = c.boxId._id.toString();
      if (!revenusParBoxMap.has(boxId)) {
        revenusParBoxMap.set(boxId, { _id: boxId, boxNumero: c.boxId.numero, boxNom: c.boxId.nom, totalPercu: 0, nbPaiements: 0 });
      }
    }
    const revenusParBox = Array.from(revenusParBoxMap.values())
      .sort((a, b) => b.totalPercu - a.totalPercu)
      .slice(0, 10);

    // ── 3. Revenus par boutique ──────────────────────────────
    const revenusParBoutiqueMap = new Map();
    for (const loyer of loyersPayes) {
      const boutiqueId = loyer.boutiqueId;
      if (!boutiqueId) continue;
      const contrat = tousLesContrats.find(c => c._id.toString() === loyer.contratId);
      const nom  = contrat?.userId?.nom  || null;
      const mail = contrat?.userId?.mail || null;
      if (!revenusParBoutiqueMap.has(boutiqueId)) {
        revenusParBoutiqueMap.set(boutiqueId, { _id: boutiqueId, boutiqueNom: nom || 'Inconnu', boutiqueMail: mail || '', totalPercu: 0, nbPaiements: 0 });
      }
      if (nom) {
        revenusParBoutiqueMap.get(boutiqueId).boutiqueNom  = nom;
        revenusParBoutiqueMap.get(boutiqueId).boutiqueMail = mail;
      }
      revenusParBoutiqueMap.get(boutiqueId).totalPercu  += loyer.montant || 0;
      revenusParBoutiqueMap.get(boutiqueId).nbPaiements += 1;
    }
    for (const [boutiqueId, entry] of revenusParBoutiqueMap) {
      if (entry.boutiqueNom === 'Inconnu') {
        try {
          const user = await User.findById(boutiqueId).select('nom mail').lean();
          if (user) { entry.boutiqueNom = user.nom || user.mail || 'Inconnu'; entry.boutiqueMail = user.mail || ''; }
        } catch (_) {}
      }
    }
    const revenusParBoutique = Array.from(revenusParBoutiqueMap.values())
      .sort((a, b) => b.totalPercu - a.totalPercu)
      .slice(0, 10);

    // ── 4. Stats générales ───────────────────────────────────
    const totalBoxes = await Box.countDocuments();

    const boxIdsOccupees = new Set(
      contratsActifs
        .filter(c => c.boxId?._id)
        .map(c => c.boxId._id.toString())
    );
    const boxesOccupes   = boxIdsOccupees.size;
    const tauxOccupation = totalBoxes > 0 ? Math.round((boxesOccupes / totalBoxes) * 100) : 0;

    // ── 5. Timeline draggable ────────────────────────────────
    const MOIS_PASSES = 24;
    const MOIS_FUTURS = 60;

    let totalAttenduHisto = 0, totalPercuHisto = 0;
    const percusHistoReg = [];
    for (let i = 11; i >= 0; i--) {
      const d  = addMonths(today, -i);
      const ml = moisStr(d);
      const att  = contratsActifs.filter(c => new Date(c.dateDebut) <= d && new Date(c.dateFin) >= d).reduce((s, c) => s + (c.loyerMensuel || 0), 0);
      const perc = loyersPayes.filter(l => l.mois === ml).reduce((s, l) => s + (l.montant || 0), 0);
      totalAttenduHisto += att;
      totalPercuHisto   += perc;
      percusHistoReg.push(perc);
    }
    const tauxRecouvrement = totalAttenduHisto > 0 ? Math.round((totalPercuHisto / totalAttenduHisto) * 100) : 0;
    const { slope, intercept } = regressionLineaire(percusHistoReg);
    const tendancePct = intercept > 0 ? Math.round((slope * 11 / intercept) * 100) : 0;

    const contratsTermines   = tousLesContrats.filter(c => new Date(c.dateFin) < today);
    const contratsRenouveles = contratsTermines.filter(c =>
      tousLesContrats.some(c2 =>
        c2._id.toString() !== c._id.toString() &&
        c2.userId?._id?.toString() === c.userId?._id?.toString() &&
        c2.boxId?._id?.toString()  === c.boxId?._id?.toString() &&
        Math.abs(new Date(c2.dateDebut) - new Date(c.dateFin)) < 1000 * 60 * 60 * 24 * 10
      )
    );
    const tauxRenouvellement = contratsTermines.length > 0
      ? Math.round((contratsRenouveles.length / contratsTermines.length) * 100) : 70;

    const timeline = [];
    for (let i = -MOIS_PASSES; i < MOIS_FUTURS; i++) {
      const d   = addMonths(today, i);
      const ml  = moisStr(d);
      const nom = moisLabel(d);
      const percu      = loyersPayes.filter(l => l.mois === ml).reduce((s, l) => s + (l.montant || 0), 0);
      const estimeCont = contratsActifs.filter(c => new Date(c.dateDebut) <= d && new Date(c.dateFin) >= d).reduce((s, c) => s + (c.loyerMensuel || 0), 0);

      let projection = 0, projMin = 0, projMax = 0;
      if (i >= 0) {
        const baseContractuelle = estimeCont * (tauxRecouvrement / 100);
        const valReg = Math.max(0, intercept + slope * (12 + i));
        const contratsQuiFinissent = contratsActifs.filter(c => {
          const diff = (new Date(c.dateFin) - today) / (1000 * 60 * 60 * 24 * 30);
          return diff >= 0 && diff <= i + 3;
        });
        const revenuRenouvellement = contratsQuiFinissent.reduce((s, c) => s + (c.loyerMensuel || 0) * (tauxRenouvellement / 100), 0);
        const raw = baseContractuelle * 0.5 + valReg * 0.3 + revenuRenouvellement * 0.2;
        const facteur = Math.max(0.5, 1 - (i / MOIS_FUTURS) * 0.4);
        projection = Math.round(raw * facteur);
        projMin    = Math.round(projection * (0.75 + (i / MOIS_FUTURS) * 0.1));
        projMax    = Math.round(projection * (1.25 - (i / MOIS_FUTURS) * 0.1));
      }

      timeline.push({
        mois: ml, moisNom: nom, index: i,
        type: i < 0 ? 'passe' : i === 0 ? 'present' : 'futur',
        percu, estimeCont, projection, projMin, projMax
      });
    }

    const graphiqueMensuel = timeline
      .filter(t => t.index >= -11 && t.index <= 0)
      .map(t => ({ mois: t.mois, moisNom: t.moisNom, percu: t.percu, estime: t.estimeCont }));

    // ── 6. Analyse ponctualité ───────────────────────────────
    const analyseParBoutique = new Map();

    for (const loyer of loyersPayes) {
      const boutiqueId = loyer.boutiqueId;
      if (!boutiqueId) continue;

      if (!analyseParBoutique.has(boutiqueId)) {
        let boutiqueNom  = revenusParBoutiqueMap.get(boutiqueId)?.boutiqueNom  || null;
        let boutiqueMail = revenusParBoutiqueMap.get(boutiqueId)?.boutiqueMail || '';

        if (!boutiqueNom || boutiqueNom === 'Inconnu') {
          const contratLie = tousLesContrats.find(c => c._id.toString() === loyer.contratId);
          if (contratLie?.userId) {
            boutiqueNom  = contratLie.userId.nom  || contratLie.userId.mail || null;
            boutiqueMail = contratLie.userId.mail || '';
          }
        }

        if (!boutiqueNom || boutiqueNom === 'Inconnu') {
          try {
            const user = await User.findById(boutiqueId).select('nom mail').lean();
            if (user) {
              boutiqueNom  = user.nom  || user.mail || 'Inconnu';
              boutiqueMail = user.mail || '';
            }
          } catch (_) {}
        }

        analyseParBoutique.set(boutiqueId, {
          boutiqueId,
          boutiqueNom:  boutiqueNom  || 'Inconnu',
          boutiqueMail: boutiqueMail || '',
          nbPayes: 0, nbATemps: 0, nbEnRetard: 0,
          montantTotal: 0, retardsMoyenJours: [], moisAttendus: 0,
        });
      }

      const entry = analyseParBoutique.get(boutiqueId);
      entry.nbPayes      += 1;
      entry.montantTotal += loyer.montant || 0;

      if (loyer.datePaiement && loyer.mois) {
        const [annee, moisNum] = loyer.mois.split('-').map(Number);
        const echeance = new Date(annee, moisNum - 1, 5, 23, 59, 59);
        const datePaie = new Date(loyer.datePaiement);
        if (datePaie <= echeance) {
          entry.nbATemps += 1;
        } else {
          entry.nbEnRetard += 1;
          entry.retardsMoyenJours.push(Math.ceil((datePaie - echeance) / (1000 * 60 * 60 * 24)));
        }
      }
    }

    for (const [boutiqueId, entry] of analyseParBoutique) {
      const contratsB = tousLesContrats.filter(c =>
        c.idBoutique?._id?.toString() === boutiqueId ||
        c.idBoutique?.toString()       === boutiqueId ||
        c.userId?._id?.toString()      === boutiqueId ||
        c.userId?.toString()           === boutiqueId
      );
      entry.moisAttendus = contratsB.reduce((sum, c) => {
        const debut   = new Date(c.dateDebut);
        const finCont = new Date(c.dateFin);
        const finCalc = finCont < today ? finCont : today;
        return sum + Math.max(1, moisCalendaires(debut, finCalc));
      }, 0);

      entry.tauxPaiement    = entry.moisAttendus > 0 ? Math.min(100, Math.round((entry.nbPayes / entry.moisAttendus) * 100)) : 0;
      entry.tauxPonctualite = entry.nbPayes > 0 ? Math.round((entry.nbATemps / entry.nbPayes) * 100) : 0;
      entry.retardMoyenJours = entry.retardsMoyenJours.length > 0
        ? Math.round(entry.retardsMoyenJours.reduce((s, v) => s + v, 0) / entry.retardsMoyenJours.length) : 0;
      delete entry.retardsMoyenJours;

      entry.scoreGlobal  = Math.round(entry.tauxPaiement * 0.6 + entry.tauxPonctualite * 0.4);
      entry.categorie    = entry.scoreGlobal >= 75 ? 'excellent' : entry.scoreGlobal >= 50 ? 'moyen' : 'mauvais';
      entry.scoreRisque  = Math.max(0, 100 - entry.scoreGlobal);
      entry.niveauRisque = entry.scoreRisque >= 70 ? 'élevé' : entry.scoreRisque >= 40 ? 'moyen' : 'faible';
    }

    const analysePayeurs = Array.from(analyseParBoutique.values()).sort((a, b) => b.scoreGlobal - a.scoreGlobal);
    const bonsPayeurs    = analysePayeurs.filter(b => b.categorie === 'excellent');
    const mauvaisPayeurs = analysePayeurs.filter(b => b.categorie === 'mauvais');

    // ── 7. Prévisions synthèse ───────────────────────────────
    const prevision6Mois = timeline.filter(t => t.index >= 1 && t.index <= 6);
    const moyennePrevision = prevision6Mois.length > 0
      ? prevision6Mois.reduce((s, m) => s + m.projection, 0) / prevision6Mois.length
      : revenuEstimeMensuel;
    const previsionAnnuelle = Math.round(moyennePrevision * 12);

    const stats = {
      revenuReel, revenuReelMoisCourant,
      revenuEstimeMensuel, revenuEstimeTotalRestant,
      revenuAttendu12Mois, revenuManque,
      tauxCroissanceAnnuel,
      montantEnAttente,   // ← valeur corrigée
      totalBoxes, boxesOccupes,
      tauxOccupation, nbContratsActifs: contratsActifs.length
    };

    const previsions = {
      tauxRecouvrement, tendancePct, tauxRenouvellement,
      previsionMoisProchain: prevision6Mois[0]
        ? { ...prevision6Mois[0], prevision: prevision6Mois[0].projection, min: prevision6Mois[0].projMin, max: prevision6Mois[0].projMax }
        : null,
      prevision6Mois: prevision6Mois.map(m => ({
        mois: m.mois, moisNom: m.moisNom,
        prevision: m.projection, min: m.projMin, max: m.projMax, estimeCont: m.estimeCont
      })),
      previsionAnnuelle,
      scoresRisque: analysePayeurs.map(b => ({
        boutiqueId: b.boutiqueId, boutiqueNom: b.boutiqueNom, boutiqueMail: b.boutiqueMail,
        tauxPaiement: b.tauxPaiement, scoreRisque: b.scoreRisque, niveau: b.niveauRisque,
        totalPercu: b.montantTotal, totalAttendu: b.moisAttendus
      }))
    };

    const chatData = { stats, analysePayeurs, previsions, contratsExpirants, revenusParBoutique };
    const contexteChatbot = buildContexteChatbot(chatData);
    const alertesChatbot  = genererAlertes(chatData);

    res.json({
      success: true,
      data: {
        stats, revenusParBox, revenusParBoutique,
        graphiqueMensuel, timeline,
        analysePayeurs, bonsPayeurs, mauvaisPayeurs,
        previsions, contratsExpirants,
        contexteChatbot,
        alertesChatbot
      }
    });

  } catch (err) {
    console.error('[getDashboard] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/finances/chat  (Groq — gratuit, fonctionne mondial)
// ─────────────────────────────────────────────────────────────
exports.chat = async (req, res) => {
  try {
    const { message, contexte, historique = [] } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message requis' });

    const Groq = require('groq-sdk');
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const messages = [
      {
        role: 'system',
        content: contexte || 'Tu es un assistant financier. Réponds en français de façon concise.'
      },
      ...historique
        .slice(-10)
        .filter(h => h.content && h.content.trim())
        .map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    const completion = await groq.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      messages,
      max_tokens:  1024,
      temperature: 0.7,
    });

    const reponse = completion.choices[0]?.message?.content || 'Désolé, pas de réponse.';
    res.json({ success: true, reponse });

  } catch (err) {
    console.error('[chat Groq] Erreur :', err);
    res.status(500).json({ success: false, message: 'Erreur chatbot', error: err.message });
  }
};
