// ============================================================================
//  Cliente do Cloudflare R2 (armazenamento das fotos)
// ----------------------------------------------------------------------------
//  O R2 é compatível com a API do Amazon S3, então usamos o SDK oficial da AWS
//  apontando para o endereço do R2. As fotos enviadas pelos companheiros LEO
//  são guardadas lá; o banco de dados guarda apenas o link público de cada foto.
// ============================================================================

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

// Confere se todas as variáveis necessárias do R2 foram definidas no .env.
const obrigatorias = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_URL',
];
for (const nome of obrigatorias) {
  if (!process.env[nome]) {
    throw new Error(`A variável de ambiente ${nome} não foi definida.`);
  }
}

const R2_BUCKET = process.env.R2_BUCKET;
// Endereço público do bucket (ex.: o link r2.dev ou um domínio próprio).
// Removemos uma eventual "/" no final para montar os links corretamente.
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL.replace(/\/+$/, '');

// Cria o cliente que conversa com o R2.
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Descobre a extensão do arquivo (.jpg, .png, ...) a partir do tipo da imagem.
function extensaoDoTipo(mimetype) {
  const mapa = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return mapa[mimetype] || 'jpg';
}

/**
 * Envia uma foto para o R2 e devolve a URL pública dela.
 * @param {Buffer} buffer   - o conteúdo do arquivo de imagem
 * @param {string} mimetype - o tipo da imagem (ex.: "image/jpeg")
 * @returns {Promise<string>} a URL pública da imagem
 */
export async function enviarImagem(buffer, mimetype) {
  // Nome único do arquivo dentro do bucket, dentro da pasta "memorias/".
  const chave = `memorias/${randomUUID()}.${extensaoDoTipo(mimetype)}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: chave,
      Body: buffer,
      ContentType: mimetype,
    }),
  );

  // Link público que será salvo no banco e exibido no mural.
  return `${R2_PUBLIC_URL}/${chave}`;
}
