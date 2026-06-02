const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Suas rotas
const leituraRoutes = require('../routes/leitura');
app.use('/api/leitura', leituraRoutes);

// Rota raiz para teste
app.get('/', (req, res) => {
    res.json({ 
        status: 'online',
        endpoints: ['/api/leitura/registrar', '/api/leitura/progresso', '/api/leitura/termometro', '/api/leitura/ranking']
    });
});

module.exports = app;