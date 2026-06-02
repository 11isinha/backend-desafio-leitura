const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Importar rotas
const leituraRoutes = require('../routes/leitura');

// Rotas da API
app.use('/api/leitura', leituraRoutes);

// Rota de teste
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

// Rota de teste para o ranking (debug)
app.get('/api/leitura/ranking', async (req, res) => {
    const supabase = require('../services/supabaseClient');
    
    const { data, error } = await supabase
        .from('registros_leitura')
        .select(`
            minutos,
            alunos!inner (turma)
        `);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    const turmas = {};
    data.forEach(reg => {
        const turma = reg.alunos.turma;
        if (!turmas[turma]) turmas[turma] = 0;
        turmas[turma] += reg.minutos;
    });

    const ranking = Object.entries(turmas)
        .map(([turma, total]) => ({ turma, total }))
        .sort((a, b) => b.total - a.total);

    res.json(ranking);
});

// Para qualquer outra rota não encontrada
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Rota não encontrada',
        path: req.originalUrl 
    });
});

module.exports = app;