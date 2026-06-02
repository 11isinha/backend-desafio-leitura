const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Importar as rotas
const leituraRoutes = require('../routes/leitura');

// Rotas principais
app.use('/api/leitura', leituraRoutes);

// ============ ROTA DE TESTE DO SUPABASE ============
app.get('/api/teste-supabase', async (req, res) => {
    const supabase = require('../services/supabaseClient');
    
    try {
        // Tenta consultar a tabela de alunos
        const { data, error, count } = await supabase
            .from('alunos')
            .select('*', { count: 'exact', head: true });
        
        if (error) {
            return res.status(500).json({ 
                erro: 'Erro na conexão com Supabase',
                detalhes: error.message,
                supabase_url: process.env.SUPABASE_URL ? '✅ Configurada' : '❌ NÃO CONFIGURADA',
                supabase_key: process.env.SUPABASE_KEY ? '✅ Configurada' : '❌ NÃO CONFIGURADA'
            });
        }
        
        res.json({ 
            success: true, 
            mensagem: '✅ Conexão com Supabase OK!',
            total_alunos: count,
            supabase_url: process.env.SUPABASE_URL ? '✅ Configurada' : '❌ NÃO CONFIGURADA',
            supabase_key: process.env.SUPABASE_KEY ? '✅ Configurada' : '❌ NÃO CONFIGURADA'
        });
    } catch (error) {
        res.status(500).json({ 
            erro: 'Erro ao conectar',
            mensagem: error.message
        });
    }
});

// ============ ROTA DE TESTE SIMPLES ============
app.get('/api/teste', (req, res) => {
    res.json({ 
        mensagem: 'API está funcionando!',
        rotas_disponiveis: [
            'GET /',
            'GET /api/teste',
            'GET /api/teste-supabase',
            'GET /api/leitura/termometro',
            'GET /api/leitura/ranking',
            'GET /api/leitura/progresso',
            'POST /api/leitura/registrar'
        ]
    });
});

// Rota raiz
app.get('/', (req, res) => {
    res.json({ 
        message: 'API Leitura SESI funcionando!',
        endpoints: [
            'GET /api/leitura/termometro',
            'GET /api/leitura/ranking',
            'GET /api/leitura/progresso',
            'POST /api/leitura/registrar',
            'GET /api/teste',
            'GET /api/teste-supabase'
        ]
    });
});

// Tratar rotas não encontradas (sempre no final)
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Rota não encontrada',
        path: req.originalUrl,
        method: req.method
    });
});

module.exports = app;