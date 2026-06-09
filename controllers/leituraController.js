const supabase = require('../services/supabaseClient');

// Registrar minutos lidos (Limite de 16 min por dia)
async function registrarMinutos(req, res) {
  const { minutos } = req.body;
  const alunoId = req.aluno.id;
  
  const hoje = new Date().toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).split(" ")[0];

  if (!minutos || minutos <= 0 || minutos > 16) {
    return res.status(400).json({ error: 'Minutos inválidos (deve ser entre 1 e 16)' });
  }

  try {
    const { data: registrosHoje, error: selectError } = await supabase
      .from('registros_leitura')
      .select('minutos')
      .eq('aluno_id', alunoId)
      .eq('data_registro', hoje);

    if (selectError) {
      return res.status(500).json({ error: 'Erro ao verificar registros de hoje' });
    }

    const totalHoje = registrosHoje.reduce((sum, r) => sum + r.minutos, 0);

    if (totalHoje + minutos > 16) {
      const restante = 16 - totalHoje;
      return res.status(400).json({
        error: `Limite diário de 16 minutos atingido. Você já leu ${totalHoje} min hoje. Restam apenas ${restante} min.`
      });
    }

    const { error: insertError } = await supabase
      .from('registros_leitura')
      .insert([{ aluno_id: alunoId, minutos, data_registro: hoje }]);

    if (insertError) {
      return res.status(500).json({ error: 'Erro ao salvar o registro de leitura' });
    }

    return res.json({ success: true, message: 'Leitura registrada com sucesso!' });
  } catch (e) {
    return res.status(500).json({ error: 'Erro interno no servidor: ' + e.message });
  }
}

// Progresso semanal do usuário conectado
async function progressoSemana(req, res) {
  const alunoId = req.aluno.id;
  
  try {
    const { data, error } = await supabase
      .from('registros_leitura')
      .select('minutos, data_registro')
      .eq('aluno_id', alunoId);

    if (error) {
      return res.status(500).json({ error: 'Erro ao buscar progresso do aluno' });
    }

    return res.json({ progresso: data || [] });
  } catch (e) {
    return res.status(500).json({ error: 'Erro interno: ' + e.message });
  }
}

// Termômetro geral (Soma total da escola)
async function termometroGeral(req, res) {
  try {
    const { data, error } = await supabase
      .from('registros_leitura')
      .select('minutos');

    if (error) {
      return res.status(500).json({ error: 'Erro ao buscar dados do termômetro' });
    }

    const totalMinutos = data.reduce((sum, r) => sum + r.minutos, 0);
    return res.json({ total_escola: totalMinutos, meta: 1000000 });
  } catch (e) {
    return res.status(500).json({ error: 'Erro interno: ' + e.message });
  }
}

// ============ RANKING DIÁRIO POR TURMA (QUEM LEU MAIS HOJE) ============
async function rankingTurmas(req, res) {
  try {
    // Pega a data de hoje no formato YYYY-MM-DD (Fuso de São Paulo)
    const hoje = new Date().toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).split(" ")[0];

    // Busca APENAS as leituras feitas HOJE e traz a turma do aluno correspondente
    const { data, error } = await supabase
      .from('registros_leitura')
      .select('minutos, alunos(turma)')
      .eq('data_registro', hoje);

    if (error) {
      console.error('Erro na consulta do Supabase para o ranking:', error);
      return res.status(500).json({ error: 'Erro ao processar dados do ranking' });
    }

    // Se ninguém leu nada hoje ainda, retorna uma lista vazia pro front saber que tá zerado
    if (!data || data.length === 0) {
      return res.json([]);
    }

    // Agrupa e soma os minutos de cada turma manualmente (Garante funcionamento)
    const turmas = {};
    data.forEach(reg => {
      const turma = reg.alunos?.turma;
      if (turma) {
        turmas[turma] = (turmas[turma] || 0) + reg.minutos;
      }
    });

    // Converte o objeto em array e ordena do MAIOR total para o MENOR total
    const ranking = Object.entries(turmas)
      .map(([turma, total]) => ({ turma, total }))
      .sort((a, b) => b.total - a.total);

    return res.json(ranking);
  } catch (e) {
    console.error('Erro interno na rota de ranking:', e);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}

module.exports = {
  registrarMinutos,
  progressoSemana,
  termometroGeral,
  rankingTurmas
};
