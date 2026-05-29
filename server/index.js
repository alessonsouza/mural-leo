// ============================================================================
//  Servidor da API — "Relatos de Afeto: Memórias do Servir"
// ----------------------------------------------------------------------------
//  Este é o "miolo" do projeto: um pequeno servidor que fica entre o site e o
//  banco de dados. Ele oferece duas operações:
//    · GET  /api/memories  -> lista todas as memórias do mural
//    · POST /api/memories  -> recebe uma nova memória (com foto) e a salva
//
//  O site (React) nunca fala direto com o banco — sempre passa por aqui. Isso
//  mantém a senha do banco protegida no servidor.
// ============================================================================

import express from 'express';
import multer from 'multer';
import { Readable } from 'node:stream';
import { aplicarSchema, query } from './db.js';
import { enviarImagem } from './r2.js';

// Prefixo público do R2 — usado para validar a rota de proxy de imagens.
// Remove uma barra final eventual para comparar com segurança.
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');

// --- Configurações gerais ---------------------------------------------------

const PORTA = process.env.PORT || 3001;

// Limites simples para conter abusos (o site é aberto, sem login).
const TAMANHO_MAX_IMAGEM = 12 * 1024 * 1024; // 12 MB
const TAMANHO_MAX_NOME = 80; // caracteres
const TAMANHO_MAX_RELATO = 2000; // caracteres

// Tipos de imagem aceitos no upload.
const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// --- Recebimento de arquivos (multer) ---------------------------------------
// O multer lê o arquivo enviado pelo formulário e o entrega na memória, pronto
// para ser repassado ao Cloudflare R2.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAX_IMAGEM },
});

// --- Aplicação Express ------------------------------------------------------

const app = express();

// Permite que o servidor entenda corpos de requisição em formato JSON.
app.use(express.json());

// ----------------------------------------------------------------------------
//  Rota de saúde — útil para checar rapidamente se a API está no ar.
// ----------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// ----------------------------------------------------------------------------
//  GET /api/imagem?url=<URL pública do R2>
//  ----------------------------------------------------------------------------
//  Proxy de leitura: busca a foto no R2 e devolve com o mesmo cabeçalho de tipo,
//  mas servida pela própria API. Isso permite que o frontend desenhe a imagem
//  em um <canvas> (geração do template do story) mesmo quando o R2 não retorna
//  cabeçalhos CORS na URL pública.
//
//  Por segurança, só aceita URLs cujo prefixo é o R2_PUBLIC_URL deste projeto —
//  ou seja, não vira um proxy aberto para a internet inteira.
// ----------------------------------------------------------------------------
app.get('/api/imagem', async (req, res) => {
  try {
    const urlSolicitada = req.query.url;
    if (typeof urlSolicitada !== 'string' || !urlSolicitada) {
      return res.status(400).json({ erro: 'Informe o parâmetro "url".' });
    }
    if (!R2_PUBLIC_URL || !urlSolicitada.startsWith(`${R2_PUBLIC_URL}/`)) {
      return res.status(400).json({ erro: 'URL de imagem não autorizada.' });
    }

    const resposta = await fetch(urlSolicitada);
    if (!resposta.ok || !resposta.body) {
      return res.status(resposta.status || 502).json({
        erro: 'Imagem indisponível no armazenamento.',
      });
    }

    res.setHeader(
      'Content-Type',
      resposta.headers.get('content-type') || 'image/jpeg',
    );
    res.setHeader('Cache-Control', 'public, max-age=86400');
    Readable.fromWeb(resposta.body).pipe(res);
  } catch (erro) {
    console.error('Erro no proxy de imagem:', erro);
    res.status(500).json({ erro: 'Não foi possível obter a imagem.' });
  }
});

// ----------------------------------------------------------------------------
//  GET /api/memories — lista todas as memórias, mais recentes primeiro.
// ----------------------------------------------------------------------------
app.get('/api/memories', async (_req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, nome, relato, imagem_url, criado_em, curtidas FROM memorias ORDER BY criado_em DESC',
    );
    res.json(rows);
  } catch (erro) {
    console.error('Erro ao listar memórias:', erro);
    res.status(500).json({ erro: 'Não foi possível carregar as memórias.' });
  }
});

// ----------------------------------------------------------------------------
//  POST /api/memories — cria uma nova memória.
//  Recebe um formulário (multipart/form-data) com os campos:
//    · nome   (texto)
//    · relato (texto)
//    · foto   (arquivo de imagem)
// ----------------------------------------------------------------------------
app.post('/api/memories', upload.single('foto'), async (req, res) => {
  try {
    // O nome e o relato chegam como texto; tiramos espaços sobrando das pontas.
    const nome = (req.body.nome || '').trim();
    const relato = (req.body.relato || '').trim();
    const foto = req.file;

    // --- Validações dos campos ---
    if (!nome) {
      return res.status(400).json({ erro: 'Informe o nome do companheiro.' });
    }
    if (nome.length > TAMANHO_MAX_NOME) {
      return res
        .status(400)
        .json({ erro: `O nome deve ter no máximo ${TAMANHO_MAX_NOME} caracteres.` });
    }
    if (!relato) {
      return res.status(400).json({ erro: 'Escreva o relato da memória.' });
    }
    if (relato.length > TAMANHO_MAX_RELATO) {
      return res
        .status(400)
        .json({ erro: `O relato deve ter no máximo ${TAMANHO_MAX_RELATO} caracteres.` });
    }
    if (!foto) {
      return res.status(400).json({ erro: 'Anexe uma fotografia.' });
    }
    if (!TIPOS_ACEITOS.includes(foto.mimetype)) {
      return res
        .status(400)
        .json({ erro: 'O arquivo enviado não é uma imagem válida (use JPG, PNG, WEBP ou GIF).' });
    }

    // --- Envia a foto ao Cloudflare R2 e obtém o link público dela ---
    const imagemUrl = await enviarImagem(foto.buffer, foto.mimetype);

    // --- Salva a memória no banco de dados ---
    // Usamos parâmetros ($1, $2, $3) em vez de juntar texto diretamente — isso
    // protege o banco contra ataques de injeção de SQL.
    const { rows } = await query(
      `INSERT INTO memorias (nome, relato, imagem_url)
       VALUES ($1, $2, $3)
       RETURNING id, nome, relato, imagem_url, criado_em, curtidas`,
      [nome, relato, imagemUrl],
    );

    // Devolve a memória recém-criada para o site exibir na hora.
    res.status(201).json(rows[0]);
  } catch (erro) {
    console.error('Erro ao criar memória:', erro);
    res.status(500).json({ erro: 'Não foi possível salvar a memória. Tente de novo.' });
  }
});

// ----------------------------------------------------------------------------
//  PATCH /api/memories/:id — edita o nome e/ou o relato de uma memória.
//  ----------------------------------------------------------------------------
//  Aceita corpo JSON com os campos opcionais "nome" e "relato". A foto não é
//  alterada por esta rota — para trocar a foto, basta apagar e cadastrar de
//  novo.
// ----------------------------------------------------------------------------
app.patch('/api/memories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const corpo = req.body || {};
    const nome =
      typeof corpo.nome === 'string' ? corpo.nome.trim() : null;
    const relato =
      typeof corpo.relato === 'string' ? corpo.relato.trim() : null;

    if (nome === null && relato === null) {
      return res
        .status(400)
        .json({ erro: 'Informe ao menos um campo para alterar.' });
    }
    if (nome !== null && !nome) {
      return res.status(400).json({ erro: 'O nome não pode ficar vazio.' });
    }
    if (nome !== null && nome.length > TAMANHO_MAX_NOME) {
      return res
        .status(400)
        .json({ erro: `O nome deve ter no máximo ${TAMANHO_MAX_NOME} caracteres.` });
    }
    if (relato !== null && !relato) {
      return res.status(400).json({ erro: 'O relato não pode ficar vazio.' });
    }
    if (relato !== null && relato.length > TAMANHO_MAX_RELATO) {
      return res
        .status(400)
        .json({ erro: `O relato deve ter no máximo ${TAMANHO_MAX_RELATO} caracteres.` });
    }

    const { rows } = await query(
      `UPDATE memorias
       SET nome   = COALESCE($2, nome),
           relato = COALESCE($3, relato)
       WHERE id = $1
       RETURNING id, nome, relato, imagem_url, criado_em, curtidas`,
      [id, nome, relato],
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Memória não encontrada.' });
    }

    res.json(rows[0]);
  } catch (erro) {
    console.error('Erro ao atualizar memória:', erro);
    res.status(500).json({ erro: 'Não foi possível atualizar a memória.' });
  }
});

// ----------------------------------------------------------------------------
//  POST /api/memories/:id/like
//  DELETE /api/memories/:id/like
//  ----------------------------------------------------------------------------
//  Incrementa ou decrementa o contador de curtidas. Quem realmente está
//  curtindo é controlado pelo navegador via localStorage — o backend é
//  basicamente um contador. Por isso essas rotas são abertas e idempotentes
//  do ponto de vista do banco (não dá pra ficar negativo).
// ----------------------------------------------------------------------------
app.post('/api/memories/:id/like', async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE memorias
       SET curtidas = curtidas + 1
       WHERE id = $1
       RETURNING curtidas`,
      [req.params.id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Memória não encontrada.' });
    }
    res.json({ curtidas: rows[0].curtidas });
  } catch (erro) {
    console.error('Erro ao curtir memória:', erro);
    res.status(500).json({ erro: 'Não foi possível registrar a curtida.' });
  }
});

app.delete('/api/memories/:id/like', async (req, res) => {
  try {
    // GREATEST evita que o contador fique negativo se houver descurtidas a mais
    // do que curtidas (cenário só possível por chamadas manuais à API).
    const { rows } = await query(
      `UPDATE memorias
       SET curtidas = GREATEST(curtidas - 1, 0)
       WHERE id = $1
       RETURNING curtidas`,
      [req.params.id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Memória não encontrada.' });
    }
    res.json({ curtidas: rows[0].curtidas });
  } catch (erro) {
    console.error('Erro ao remover curtida:', erro);
    res.status(500).json({ erro: 'Não foi possível remover a curtida.' });
  }
});

// ----------------------------------------------------------------------------
//  Tratamento de erros do multer (ex.: imagem maior que o limite permitido).
// ----------------------------------------------------------------------------
app.use((erro, _req, res, _next) => {
  if (erro instanceof multer.MulterError) {
    if (erro.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(400)
        .json({ erro: 'A imagem é muito grande (limite de 12 MB).' });
    }
    return res.status(400).json({ erro: 'Erro ao processar o arquivo enviado.' });
  }
  console.error('Erro inesperado:', erro);
  res.status(500).json({ erro: 'Ocorreu um erro inesperado.' });
});

// --- Inicia o servidor ------------------------------------------------------
// Antes de aceitar requisições, aplica o schema (cria a tabela "memorias" se
// ainda não existir). Se isso falhar, encerra o processo para o orquestrador
// reiniciar — não vale a pena subir um servidor sem banco utilizável.
try {
  await aplicarSchema();
} catch (erro) {
  console.error('Falha ao aplicar o schema do banco:', erro);
  process.exit(1);
}

app.listen(PORTA, () => {
  console.log(`API do mural rodando na porta ${PORTA}`);
});
