# Relatos de Afeto: Memórias do Servir

Mural digital coletivo do clube **LEO**. Os companheiros acessam o site, anexam
uma fotografia de um momento marcante no movimento LEO e escrevem um relato
contando por que aquela memória é importante. O resultado é uma galeria visual
que fortalece os laços do clube.

Qualquer pessoa com o link pode adicionar memórias — não há login nem senha.

---

## Como o projeto funciona

O projeto tem 3 partes, que rodam juntas em contêineres Docker:

```
Navegador (celular/desktop)
        │  HTTPS
        ▼
┌─────────────────────────────────────────┐
│  Servidor (VPS)  —  docker compose       │
│                                          │
│  web  · Caddy: entrega o site React      │
│         e ativa o HTTPS automático       │
│  api  · Node.js: a API (porta 3001)      │
│  db   · PostgreSQL: guarda as memórias   │
└─────────────────────────────────────────┘
        │  envia/serve as fotos
        ▼
   Cloudflare R2  (armazenamento das imagens)
```

- **Frontend** (`src/`, `index.html`): o site, feito em React + Vite.
- **Backend** (`server/`): a API que conversa com o banco e o R2.
- **Banco** (`db/init.sql`): cria a tabela `memorias` no PostgreSQL.
- **Fotos**: ficam no Cloudflare R2; o banco guarda só o link de cada foto.

---

## Pré-requisitos

- **Node.js** 22 ou superior — https://nodejs.org
- **Docker** e **Docker Compose** — https://www.docker.com
- Uma conta gratuita na **Cloudflare** (para o armazenamento das fotos).

---

## Parte 1 — Configurar o Cloudflare R2 (armazenamento das fotos)

O R2 é onde as fotos enviadas ficam guardadas. O plano gratuito é generoso
(10 GB) e suficiente para o mural.

1. Crie uma conta em https://dash.cloudflare.com e, no menu lateral, abra **R2**.
2. Clique em **Create bucket**, dê o nome `mural-leo-fotos` e confirme.
3. Abra o bucket criado → aba **Settings** → seção **Public access**:
   - Em **R2.dev subdomain**, clique em **Allow Access**. A Cloudflare vai
     mostrar um endereço público parecido com
     `https://pub-xxxxxxxx.r2.dev` — **anote**, é o seu `R2_PUBLIC_URL`.
4. Volte ao menu **R2** → **Manage R2 API Tokens** → **Create API Token**:
   - Permissão: **Object Read & Write**.
   - Após criar, anote o **Access Key ID**, o **Secret Access Key** e o
     **Account ID** (o Account ID também aparece na página inicial do R2).

Guarde esses 5 valores — eles vão no arquivo `.env`:
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
`R2_PUBLIC_URL`.

---

## Parte 2 — Rodar localmente (no seu computador)

Útil para testar antes de publicar.

### 1. Subir o banco de dados

Na pasta do projeto, copie o modelo de variáveis e preencha:

```bash
copy .env.example .env        # Windows
# cp .env.example .env        # Linux/Mac
```

Depois suba só o banco:

```bash
docker compose up -d db
```

### 2. Rodar o backend (a API)

```bash
cd server
npm install
copy .env.example .env        # Windows  (cp no Linux/Mac)
```

Edite `server/.env` preenchendo as chaves do R2 e confira o `DATABASE_URL`
(use o mesmo usuário/senha do `.env` da raiz). Então:

```bash
npm run dev
```

A API ficará rodando em `http://localhost:3001`.

### 3. Rodar o site

Em **outro terminal**, na pasta raiz do projeto:

```bash
npm install
npm run dev
```

Abra o endereço que aparecer (normalmente `http://localhost:5173`). O site já
conversa com a API automaticamente.

---

## Parte 3 — Publicar online (no VPS Hetzner)

### 1. Preparar o servidor

Conecte-se ao VPS por SSH e instale o Docker (caso ainda não tenha):

```bash
curl -fsSL https://get.docker.com | sh
```

### 2. Apontar o domínio

No painel do seu domínio, crie um registro **A** apontando para o **IP do VPS**
(ex.: `mural.seuclube.org.br` → `203.0.113.10`).

> Sem um domínio dá para testar pelo IP: basta usar `DOMINIO=:80` no `.env`
> (o acesso será só por HTTP, sem cadeado de segurança).

### 3. Enviar o projeto e configurar

Copie a pasta do projeto para o VPS (via `git clone`, `scp` ou outro meio).
Dentro dela, crie o arquivo `.env`:

```bash
cp .env.example .env
nano .env        # preencha o DOMINIO, as senhas do banco e as chaves do R2
```

### 4. Subir tudo

```bash
docker compose up -d --build
```

Pronto! O Caddy obtém o certificado HTTPS sozinho e o site fica no ar em
`https://seu-dominio`. Compartilhe o link com os companheiros do clube. 💛

Para ver os registros (logs), caso algo dê errado:

```bash
docker compose logs -f
```

---

## Manutenção

### Atualizar o site depois de mudanças no código

```bash
docker compose up -d --build
```

### Remover uma memória imprópria

O site não tem botão de exclusão. Para apagar uma memória, liste-as e remova
pelo banco:

```bash
# Lista as memórias com seus identificadores
docker compose exec db psql -U mural -d mural -c "SELECT id, nome, criado_em FROM memorias ORDER BY criado_em DESC;"

# Apaga a memória escolhida (troque o id pelo valor real)
docker compose exec db psql -U mural -d mural -c "DELETE FROM memorias WHERE id = 'cole-o-id-aqui';"
```

> Observação: isso remove a memória do mural, mas o arquivo da foto continua no
> Cloudflare R2. Se quiser, apague-o também pelo painel do R2.

### Fazer backup do banco de dados

```bash
docker compose exec db pg_dump -U mural mural > backup-mural.sql
```

Guarde o arquivo `backup-mural.sql` em local seguro. Para restaurar:

```bash
docker compose exec -T db psql -U mural -d mural < backup-mural.sql
```

---

## Estrutura dos arquivos

```
mural-leo/
├── docker-compose.yml     # orquestra os 3 contêineres
├── Dockerfile             # build do site + servidor web Caddy
├── Caddyfile              # configuração do Caddy (HTTPS + proxy da API)
├── .env.example           # modelo de variáveis (copie para .env)
├── db/init.sql            # cria a tabela "memorias"
├── server/                # backend Node.js (a API)
│   ├── index.js           # rotas da API
│   ├── db.js              # conexão com o PostgreSQL
│   └── r2.js              # envio das fotos ao Cloudflare R2
├── index.html             # página base do site
└── src/                   # código do site React
    ├── App.tsx            # componente principal
    ├── api.ts             # chamadas à API
    ├── styles.css         # identidade visual (cores e fontes do LEO)
    └── components/        # cabeçalho, mural, card e modal
```
