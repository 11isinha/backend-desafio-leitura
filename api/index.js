const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Importar as rotas corretamente
const leituraRoutes = require('../routes/leitura');

// Usar as rotas
app.use('/api/leitura', leituraRoutes);

// Rota de teste (raiz)
app.get('/', (req, res) => {
    res.json({ 
        message: 'API Leitura SESI funcionando!',
        endpoints: [
            'GET /api/leitura/termometro',
            'GET /api/leitura/ranking',
            'GET /api/leitura/progresso',
            'POST /api/leitura/registrar'
        ]
    });
});

// Tratar rotas não encontradas
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Rota não encontrada',
        path: req.originalUrl,
        method: req.method
    });
});

module.exports = app;