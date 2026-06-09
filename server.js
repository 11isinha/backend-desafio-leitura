const express = require('express');
const cors = require('cors');
require('dotenv').config();

const leituraRoutes = require('./routes/leitura');
const supabase = require('./services/supabaseClient');

const app = express();

// Configuração robusta de CORS para a Vercel
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'rm'],
    credentials: true
}));

// Middleware para responder imediatamente aos testes de CORS (OPTIONS)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, rm');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

app.use(express.json());

// Rota base de teste na raiz do servidor
app.get('/', (req, res) => {
    res.json({ message: 'API online e integrada ao Supabase!', status: 'online' });
});

// ============ ROTA DE AUTENTICAÇÃO INTEGRADA (LOGIN OU CADASTRO) ============
async function tratarLoginCadastro(req, res) {
    const { rm, nome, turma } = req.body;

    if (!rm) {
        return res.status(400).json({ error: 'RM é obrigatório' });
    }

    try {
        // Verifica se o aluno já existe no Supabase
        const { data: alunoExistente, error: erroBusca } = await supabase
            .from('alunos')
            .select('*')
            .eq('rm', rm)
            .maybeSingle();

        if (erroBusca) {
            return res.status(500).json({ error: 'Erro no banco: ' + erroBusca.message });
        }

        // Se encontrou o aluno, faz Login
        if (alunoExistente) {
            return res.json({ message: 'Login efetuado com sucesso!', aluno: alunoExistente });
        }

        // Se não encontrou e faltam dados, não cria (É uma tentativa de login inválida)
        if (!nome || !turma) {
            return res.status(404).json({ error: 'RM não cadastrado. Preencha todos os campos para se cadastrar.' });
        }

        // Se não encontrou e tem os dados, faz o Cadastro completo
        const { data: novoAluno, error: erroInsercao } = await supabase
            .from('alunos')
            .insert([{ rm, nome, turma }])
            .select()
            .single();

        if (erroInsercao) {
            return res.status(500).json({ error: 'Erro ao cadastrar aluno: ' + erroInsercao.message });
        }

        return res.status(201).json({ message: 'Cadastro efetuado com sucesso!', aluno: novoAluno });

    } catch (err) {
        return res.status(500).json({ error: 'Erro interno: ' + err.message });
    }
}

// Mapeia os caminhos que o front-end pode chamar devido ao redirecionamento da Vercel
app.post('/api/auth/login-ou-cadastro', tratarLoginCadastro);
app.post('/auth/login-ou-cadastro', tratarLoginCadastro);

// Vincula suas outras rotas de leitura já existentes
app.use('/api/leitura', leituraRoutes);
app.use('/leitura', leituraRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;