const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Importar rotas
const leituraRoutes = require('../routes/leitura');

// Rotas
app.use('/api/leitura', leituraRoutes);

// Rota raiz para teste
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Leitura SESI funcionando!',
    endpoints: [
      'POST /api/leitura/registrar',
      'GET /api/leitura/progresso',
      'GET /api/leitura/termometro',
      'GET /api/leitura/ranking'
    ]
  });
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

module.exports = app;