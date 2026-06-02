const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const {
  registrarMinutos,
  progressoSemana,
  termometroGeral,
  rankingTurmas
} = require('../controllers/leituraController');

router.use(authMiddleware);

router.post('/registrar', registrarMinutos);
router.get('/progresso', progressoSemana);
router.get('/termometro', termometroGeral);
router.get('/ranking', rankingTurmas);

module.exports = router;