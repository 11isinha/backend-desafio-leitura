const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============ ROTA PRINCIPAL ============
app.get('/', (req, res) => {
    res.json({ message: 'API funcionando!', status: 'online' });
});

// ============ NOVA ROTA: AUTENTICAÇÃO (LOGIN OU CADASTRO) ============
app.post('/api/auth/login-ou-cadastro', async (req, res) => {
    const { rm, nome, turma } = req.body;

    if (!rm) {
        return res.status(400).json({ error: 'RM é obrigatório' });
    }

    try {
        // Verificar se o aluno já existe no Supabase
        const { data: alunoExistente, error: erroBusca } = await supabase
            .from('alunos')
            .select('*')
            .eq('rm', rm)
            .maybeSingle();

        if (erroBusca) {
            return res.status(500).json({ error: 'Erro ao buscar aluno: ' + erroBusca.message });
        }

        // Se o aluno existe, faz o login
        if (alunoExistente) {
            return res.json({ message: 'Login realizado com sucesso!', aluno: alunoExistente });
        }

        // Se o aluno não existe e não enviou nome/turma, barra por falta de dados
        if (!nome || !turma) {
            return res.status(404).json({ error: 'RM não cadastrado. Preencha todos os campos para se cadastrar.' });
        }

        // Caso não exista, realiza o cadastro no Supabase
        const { data: novoAluno, error: erroInsercao } = await supabase
            .from('alunos')
            .insert([{ rm, nome, turma }])
            .select()
            .single();

        if (erroInsercao) {
            return res.status(500).json({ error: 'Erro ao cadastrar aluno: ' + erroInsercao.message });
        }

        return res.status(201).json({ message: 'Cadastro realizado com sucesso!', aluno: novoAluno });

    } catch (err) {
        return res.status(500).json({ error: 'Erro interno no servidor: ' + err.message });
    }
});

// ============ TERMÔMETRO (não precisa de RM) ============
app.get('/api/leitura/termometro', async (req, res) => {
    const { data, error } = await supabase
        .from('registros_leitura')
        .select('minutos');
    
    const total = data?.reduce((s, r) => s + r.minutos, 0) || 0;
    res.json({ total_escola: total, meta: 1000000 });
});

// ============ RANKING (não precisa de RM) ============
app.get('/api/leitura/ranking', async (req, res) => {
    const { data, error } = await supabase
        .from('registros_leitura')
        .select('minutos, alunos!inner(turma)');
    
    if (error || !data) {
        return res.json([]);
    }
    
    const turmas = {};
    data.forEach(reg => {
        const turma = reg.alunos?.turma;
        if (turma) turmas[turma] = (turmas[turma] || 0) + reg.minutos;
    });
    
    const ranking = Object.entries(turmas)
        .map(([turma, total]) => ({ turma, total }))
        .sort((a, b) => b.total - a.total);
    
    res.json(ranking);
});

// ============ PROGRESSO (RM por query string) ============
app.get('/api/leitura/progresso', async (req, res) => {
    const rm = req.query.rm || req.headers.rm;
    
    console.log('📡 Progresso - RM recebido:', rm);
    
    if (!rm) {
        return res.status(401).json({ error: 'RM não informado' });
    }
    
    // Buscar aluno
    const { data: aluno, error: erroAluno } = await supabase
        .from('alunos')
        .select('id')
        .eq('rm', rm)
        .single();
    
    if (erroAluno || !aluno) {
        return res.status(401).json({ error: 'Aluno não encontrado' });
    }
    
    // Buscar registros
    const { data: registros } = await supabase
        .from('registros_leitura')
        .select('minutos, data_registro')
        .eq('aluno_id', aluno.id);
    
    res.json({ progresso: registros || [] });
});

// ============ REGISTRAR LEITURA ============
app.post('/api/leitura/registrar', async (req, res) => {
    const { minutos } = req.body;
    const rm = req.query.rm || req.headers.rm;
    
    console.log('📝 Registrar - RM:', rm, 'Minutos:', minutos);
    
    if (!rm) {
        return res.status(401).json({ error: 'RM não informado' });
    }
    
    if (!minutos || minutos <= 0 || minutos > 16) {
        return res.status(400).json({ error: 'Minutos inválidos (1-16)' });
    }
    
    // Buscar aluno
    const { data: aluno, error: erroAluno } = await supabase
        .from('alunos')
        .select('id')
        .eq('rm', rm)
        .single();
    
    if (erroAluno || !aluno) {
        return res.status(401).json({ error: 'Aluno não encontrado' });
    }
    
    const hoje = new Date().toISOString().split('T')[0];
    
    // Verificar registros de hoje
    const { data: registrosHoje } = await supabase
        .from('registros_leitura')
        .select('minutos')
        .eq('aluno_id', aluno.id)
        .eq('data_registro', hoje);
    
    const totalHoje = registrosHoje?.reduce((s, r) => s + r.minutos, 0) || 0;
    
    if (totalHoje + minutos > 16) {
        return res.status(400).json({ error: `Limite de 16 min/dia. Você já leu ${totalHoje} min hoje.` });
    }
    
    // Inserir registro
    const { error: insertError } = await supabase
        .from('registros_leitura')
        .insert([{ aluno_id: aluno.id, minutos, data_registro: hoje }]);
    
    if (insertError) {
        return res.status(500).json({ error: 'Erro ao salvar: ' + insertError.message });
    }
    
    res.json({ success: true, message: 'Leitura registrada com sucesso!' });
});

module.exports = app;