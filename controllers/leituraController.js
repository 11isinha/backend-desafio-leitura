const supabase = require('../services/supabaseClient');

async function registrarMinutos(req, res) {
  const { minutos } = req.body;
  const alunoId = req.aluno.id;
  const hoje = new Date().toISOString().split('T')[0];

  // VALIDAÇÃO BACK-END 16 min/dia
  if (minutos > 16) {
    return res.status(400).json({
      error: 'Você não pode registrar mais de 16 minutos por dia!'
    });
  }

  if (minutos <= 0) {
    return res.status(400).json({ error: 'Minutos devem ser maiores que zero' });
  }

  // Buscar registros de hoje
  const { data: registrosHoje, error: selectError } = await supabase
    .from('registros_leitura')
    .select('minutos')
    .eq('aluno_id', alunoId)
    .eq('data_registro', hoje);

  if (selectError) {
    return res.status(500).json({ error: 'Erro ao verificar registros' });
  }

  const totalHoje = registrosHoje.reduce((sum, r) => sum + r.minutos, 0);

  if (totalHoje + minutos > 16) {
    const restante = 16 - totalHoje;
    return res.status(400).json({
      error: `Você já leu ${totalHoje} min hoje. Só pode adicionar mais ${restante} min.`
    });
  }

  // Inserir novo registro
  const { data, error } = await supabase
    .from('registros_leitura')
    .insert([{
      aluno_id: alunoId,
      minutos: minutos,
      data_registro: hoje
    }]);

  if (error) {
    return res.status(500).json({ error: 'Erro ao salvar registro' });
  }

  res.status(201).json({
    success: true,
    message: 'Leitura registrada com sucesso!',
    minutos_registrados: minutos,
    total_hoje: totalHoje + minutos
  });
}

// Progresso individual na semana
async function progressoSemana(req, res) {
  const alunoId = req.aluno.id;
  const hoje = new Date();
  const dataInicio = new Date();
  dataInicio.setDate(hoje.getDate() - 6);

  const { data, error } = await supabase
    .from('registros_leitura')
    .select('minutos, data_registro')
    .eq('aluno_id', alunoId)
    .gte('data_registro', dataInicio.toISOString().split('T')[0])
    .lte('data_registro', hoje.toISOString().split('T')[0]);

  if (error) {
    return res.status(500).json({ error: 'Erro ao buscar progresso' });
  }

  res.json({ progresso: data });
}

// Termômetro geral (total escola)
async function termometroGeral(req, res) {
  const { data, error } = await supabase
    .from('registros_leitura')
    .select('minutos');

  if (error) {
    return res.status(500).json({ error: 'Erro ao buscar total' });
  }

  const totalMinutos = data.reduce((sum, r) => sum + r.minutos, 0);
  res.json({ total_escola: totalMinutos, meta: 1000000 });
}

// Ranking por turma
async function rankingTurmas(req, res) {
  const { data, error } = await supabase
    .from('registros_leitura')
    .select(`
      minutos,
      alunos!inner (turma)
    `);

  if (error) {
    return res.status(500).json({ error: 'Erro ao gerar ranking' });
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
}

module.exports = {
  registrarMinutos,
  progressoSemana,
  termometroGeral,
  rankingTurmas
};