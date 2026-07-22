# NyxVantore Designs

Site profissional da NyxVantore Designs, criado em HTML5, CSS3 e JavaScript moderno. O portfólio e o painel privado usam Supabase; a publicação está preparada para a Vercel. Não há cadastro ou login para visitantes.

## O que está pronto

- Página pública responsiva com hero, portfólio filtrável, serviços, sobre, processo, contato e rodapé.
- Modal acessível para detalhes dos projetos e visualização ampliada da galeria.
- Estados de carregamento, erro, tentativa novamente e portfólio vazio.
- Painel privado em `/admin`, sem link na navegação pública.
- Login administrativo por magic link, sem senha fixa no código.
- Cadastro, edição, exclusão, publicação, destaque, ordenação e upload de imagens.
- Prévia dos arquivos, validação de formato e limite de 8 MB por imagem.
- Supabase com RLS, bucket privado e leitura pública somente de projetos publicados.
- Formulário de contato por função serverless; a chave do provedor não vai para o navegador.
- SEO, Schema.org, Open Graph, sitemap, robots, 404, acessibilidade e cabeçalhos de segurança.
- Logo e favicon oficiais preservados em `assets/branding`.

## Estrutura principal

```text
/
├── index.html                 site público
├── 404.html                   página não encontrada
├── admin/index.html           painel privado
├── api/contact.js             envio seguro do formulário
├── assets/branding/           arquivos oficiais e derivados
├── css/                       estilos públicos e administrativos
├── js/                        interface, portfólio, Supabase e painel
├── scripts/                   servidor local e build
├── supabase/schema.sql        banco, RLS e Storage
├── tests/site.test.mjs        testes automáticos
├── .env.example               modelo das variáveis
├── vercel.json                rotas, cache e segurança
├── robots.txt
├── sitemap.xml
└── site.webmanifest
```

## 1. Abrir o projeto localmente

Instale o Node.js 20 ou superior. No PowerShell, dentro desta pasta:

```powershell
Copy-Item .env.example .env
npm run dev
```

Abra o endereço mostrado no terminal, normalmente `http://127.0.0.1:4173`. Antes de configurar o Supabase, o site mostra o estado vazio do portfólio e o painel explica que falta a configuração. Isso é esperado.

O servidor local serve o site e injeta somente a configuração pública. A função de contato é uma função da Vercel; teste seu envio em uma publicação Preview ou com a CLI da Vercel.

## 2. Criar o projeto no Supabase

1. Crie uma conta em supabase.com e clique em **New project**.
2. Escolha nome, região e uma senha forte para o banco.
3. Aguarde o projeto ficar pronto.
4. Em **Project Settings > API**, copie:
   - **Project URL** para `SUPABASE_URL`;
   - **anon public key** para `SUPABASE_ANON_KEY`.
5. Nunca use a **service_role key** neste projeto ou no navegador.

## 3. Criar banco, políticas e Storage

1. Abra **SQL Editor > New query**.
2. Copie todo o conteúdo de `supabase/schema.sql`.
3. Clique em **Run** uma única vez e confirme que não houve erros.

O SQL cria `admin_users`, `projects`, `project_images`, índices, restrições, gatilho de atualização, RLS e o bucket privado `portfolio`. Não torne esse bucket público: as imagens são entregues por URLs assinadas e as políticas verificam se o projeto está publicado.

## 4. Configurar a autenticação

1. Abra **Authentication > Providers > Email**.
2. Mantenha o provedor de e-mail ativado.
3. Desative a opção que permite novos cadastros (**Allow new users to sign up**). O nome pode variar um pouco conforme o painel.
4. Não habilite cadastro anônimo.
5. Em **Authentication > URL Configuration**, configure:
   - **Site URL**: sua URL final da Vercel;
   - **Redirect URLs**: `http://127.0.0.1:4173/admin/`, a URL Preview usada nos testes e `https://seu-dominio.com/admin/`.

O site usa `shouldCreateUser: false`, portanto um visitante não consegue criar uma conta pela tela de login.

## 5. Criar o usuário administrador

1. Em **Authentication > Users**, clique em **Add user**.
2. Use exatamente `nyxfreelancer9@gmail.com`.
3. Marque o e-mail como confirmado. Se o painel pedir senha, gere uma senha longa e aleatória; o acesso normal será pelo magic link.
4. Confirme via SQL que `private.admin_users` contém o mesmo e-mail. O `schema.sql` já insere o endereço inicial.

Para trocar o administrador, altere `ADMIN_EMAIL` na Vercel e execute no SQL Editor:

```sql
insert into private.admin_users (email) values ('novo@email.com') on conflict do nothing;
delete from private.admin_users where email = 'nyxfreelancer9@gmail.com';
```

Depois crie o novo usuário em **Authentication > Users**. A segurança real está em `admin_users` + RLS; esconder `/admin` não é usado como proteção.

## 6. Preencher as variáveis

No arquivo `.env` local e em **Vercel > Project Settings > Environment Variables**, use:

| Variável | Uso | Visibilidade |
|---|---|---|
| `SUPABASE_URL` | URL do projeto Supabase | pública |
| `SUPABASE_ANON_KEY` | anon key protegida por RLS | pública |
| `ADMIN_EMAIL` | e-mail esperado pela interface | pública |
| `CONTACT_FORM_KEY` | chave Web3Forms usada em `/api/contact` | privada, servidor |

O build gera `dist/js/config.js` somente com os três valores públicos. `CONTACT_FORM_KEY` nunca é incluída no site estático.

## 7. Ativar o formulário de contato

1. Crie uma chave em Web3Forms e confirme o e-mail de destino.
2. Salve essa chave como `CONTACT_FORM_KEY` na Vercel.
3. Faça uma nova publicação e envie um briefing de teste.

Sem essa variável, a função retorna uma mensagem clara e os links de WhatsApp e e-mail continuam funcionando.

## 8. Testar o painel

1. Acesse `/admin` diretamente.
2. Informe o e-mail autorizado e abra o magic link recebido.
3. Crie um projeto como rascunho, com capa e duas imagens.
4. Confira as prévias e salve.
5. Publique, marque como destaque e altere a ordem.
6. Volte à página pública e confira filtro, modal e galeria ampliada.
7. Edite textos e imagens; depois remova uma imagem da galeria.
8. Crie um usuário de teste com outro e-mail e confirme que ele é recusado.
9. Em uma janela anônima, confirme que rascunhos não aparecem.
10. Exclua o projeto de teste e confirme a caixa de aviso.

## 9. Validar e gerar a versão de produção

```powershell
npm test
npm run build
```

A pasta `dist` é recriada a cada build. Não edite arquivos dentro dela; edite os arquivos-fonte na raiz.

## 10. Publicar na Vercel

1. Envie esta pasta para um repositório Git ou use a CLI da Vercel.
2. No painel da Vercel, clique em **Add New > Project** e importe o repositório.
3. Em **Framework Preset**, selecione **Other**.
4. Use **Build Command** `npm run build` e **Output Directory** `dist` (o `vercel.json` já registra essa pasta).
5. Cadastre as quatro variáveis descritas acima para Production e Preview.
6. Clique em **Deploy**.
7. Atualize as URLs autorizadas do Supabase com a URL recebida.
8. Teste `/`, `/admin`, uma URL inexistente, formulário e magic link.

## 11. Conectar um domínio próprio

Em **Vercel > Settings > Domains**, adicione o domínio e siga os registros DNS mostrados. Depois:

1. Troque `https://nyxvantore.com.br` em `index.html`, `robots.txt` e `sitemap.xml` pelo domínio definitivo, se for diferente.
2. Atualize **Site URL** e **Redirect URLs** no Supabase.
3. Faça uma nova publicação e teste o magic link.

## 12. Trocar textos, cores, fontes e marca

- Textos e seções: `index.html`.
- Cores, tipografia e espaçamento: variáveis no início de `css/style.css`.
- Logo original: `assets/branding/logo-original.png`.
- Versão exibida: `assets/branding/logo-web.webp`.
- Favicons: referências no `<head>` de `index.html`, `404.html` e `admin/index.html`.

Ao trocar a marca no futuro, mantenha proporções, gere os mesmos nomes derivados e confirme o texto alternativo “NyxVantore Designs”.

## 13. Backup

- Banco: em **Table Editor**, exporte `projects`, `project_images` e `admin_users` como CSV. Para backup completo, use os backups do plano Supabase ou `pg_dump` com a conexão exibida em **Database Settings**.
- Imagens: em **Storage > portfolio**, baixe as pastas. Mantenha a estrutura `projects/UUID/...`, pois os caminhos estão salvos no banco.
- Faça banco e Storage no mesmo momento para manter as referências consistentes.

## 14. Erros comuns

- **“Supabase ainda não foi configurado”**: preencha `.env` ou as variáveis da Vercel e reinicie/republique.
- **Magic link não chega**: confira spam, usuário criado, e-mail confirmado, provedor Email e limite de envio do Supabase.
- **Link volta para endereço errado**: corrija Site URL e Redirect URLs no Supabase.
- **Usuário sem permissão**: o e-mail de Authentication, `admin_users` e `ADMIN_EMAIL` precisam ser idênticos, inclusive sem espaços.
- **Imagem não aparece**: mantenha o bucket privado, execute todo o SQL e confirme que o projeto está publicado.
- **Upload recusado**: use JPG, JPEG, PNG ou WebP com até 8 MB.
- **Slug duplicado**: escolha outro slug; o banco impõe unicidade.
- **Formulário não envia**: configure `CONTACT_FORM_KEY` e confira os logs da função `/api/contact` na Vercel.
- **CSP bloqueia o Supabase**: preserve `https://*.supabase.co` e `wss://*.supabase.co` em `vercel.json`.
- **Rascunho aparece publicamente**: interrompa a publicação e confirme que o `schema.sql` foi executado sem erros; não desative RLS.

## Observação sobre segurança

A anon key do Supabase pode aparecer no navegador: ela foi criada para esse uso. A proteção depende das políticas RLS e do bucket privado. Nunca adicione service role key, senha, token administrativo ou chave de formulário aos arquivos HTML/JavaScript públicos.
# NYX_DESIGNS
