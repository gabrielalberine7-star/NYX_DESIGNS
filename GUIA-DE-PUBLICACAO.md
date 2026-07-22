# Guia de publicação — NyxVantore Designs

Este guia cobre três tarefas:

1. Configurar o Supabase uma única vez;
2. Publicar o site na Vercel;
3. Cadastrar e publicar seus projetos pelo painel administrativo.

## Parte 1 — Configuração obrigatória do Supabase

Faça esta parte antes de tentar usar o painel `/admin`.

### 1. Criar o projeto

1. Entre em [supabase.com](https://supabase.com/) e crie uma conta.
2. Clique em **New project**.
3. Escolha um nome, uma região próxima e uma senha forte para o banco.
4. Aguarde o projeto terminar de ser criado.

### 2. Criar o banco e as regras de segurança

1. No painel do Supabase, abra **SQL Editor**.
2. Clique em **New query**.
3. Abra o arquivo `supabase/schema.sql` deste projeto.
4. Copie todo o conteúdo, cole no SQL Editor e clique em **Run**.
5. Confirme que o comando terminou sem mensagens de erro.

Esse SQL cria o portfólio, as políticas RLS, o administrador e o bucket privado de imagens.

### 3. Criar seu usuário administrador

1. No Supabase, abra **Authentication > Users**.
2. Clique em **Add user**.
3. Use exatamente o e-mail `nyxfreelancer9@gmail.com`.
4. Marque o e-mail como confirmado.
5. Caso uma senha seja exigida, use uma senha longa; o painel normalmente enviará um magic link para o seu e-mail.

### 4. Bloquear cadastros públicos

1. Abra **Authentication > Providers > Email**.
2. Deixe o provedor de e-mail ativo.
3. Desative **Allow new users to sign up** ou a opção equivalente.
4. Não habilite usuários anônimos.

O site já usa `shouldCreateUser: false`, mas esta configuração adiciona uma segunda proteção.

### 5. Copiar os valores públicos do Supabase

Em **Project Settings > API**, copie:

- **Project URL** → será `SUPABASE_URL`;
- **anon public key** → será `SUPABASE_ANON_KEY`.

Não use nem copie a **service_role key** para o site.

## Parte 2 — Publicar na Vercel

O arquivo ZIP precisa ser descompactado antes da publicação.

### Opção A — GitHub + Vercel, recomendada

Esta opção é melhor porque, depois da primeira configuração, novas alterações podem ser publicadas apenas atualizando o repositório.

#### 1. Colocar os arquivos no GitHub

1. Crie uma conta em [github.com](https://github.com/) se ainda não possuir.
2. Clique em **New repository**.
3. Dê um nome, por exemplo `nyxvantore-designs`.
4. Escolha repositório privado ou público.
5. Crie o repositório sem adicionar README ou outros arquivos automáticos.
6. Abra o repositório e use **Add file > Upload files**.
7. Arraste todo o conteúdo da pasta descompactada, não a pasta externa e não o ZIP.
8. Confirme o envio em **Commit changes**.

#### 2. Importar na Vercel

1. Entre em [vercel.com](https://vercel.com/) usando sua conta do GitHub.
2. Clique em **Add New > Project**.
3. Localize `nyxvantore-designs` e clique em **Import**.
4. Em **Framework Preset**, selecione **Other**.
5. Confira as configurações:
   - **Root Directory:** `./`;
   - **Build Command:** `npm run build`;
   - **Output Directory:** `dist`;
   - **Install Command:** pode ficar automático.

#### 3. Adicionar as variáveis de ambiente

Ainda na tela de configuração, abra **Environment Variables** e cadastre:

| Nome | Valor |
|---|---|
| `SUPABASE_URL` | Project URL copiada do Supabase |
| `SUPABASE_ANON_KEY` | anon public key copiada do Supabase |
| `ADMIN_EMAIL` | `nyxfreelancer9@gmail.com` |
| `CONTACT_FORM_KEY` | chave do Web3Forms, se quiser ativar o formulário |

Marque as variáveis para **Production**, **Preview** e **Development**. Nunca adicione uma service role key.

#### 4. Fazer o primeiro deploy

1. Clique em **Deploy**.
2. Aguarde o build terminar.
3. Abra o endereço terminado em `.vercel.app` fornecido pela Vercel.
4. Teste a página principal e depois acrescente `/admin` ao endereço.

### Opção B — Publicar pelo terminal, sem GitHub

Com Node.js instalado, abra o PowerShell dentro da pasta descompactada e execute:

```powershell
npm install --global vercel@latest
vercel login
vercel link
```

Depois, cadastre as mesmas quatro variáveis no painel da Vercel em **Settings > Environment Variables** e publique uma prévia:

```powershell
vercel deploy
```

Quando confirmar que está tudo correto, publique em produção:

```powershell
vercel deploy --prod
```

A documentação oficial também confirma que `vercel deploy` publica a pasta atual e `vercel deploy --prod` envia para produção: [Vercel CLI](https://vercel.com/docs/projects/deploy-from-cli).

## Parte 3 — Autorizar o endereço na autenticação

Depois que a Vercel fornecer o endereço do site:

1. Volte ao Supabase.
2. Abra **Authentication > URL Configuration**.
3. Em **Site URL**, coloque o endereço principal, por exemplo:

```text
https://nyxvantore-designs.vercel.app
```

4. Em **Redirect URLs**, adicione:

```text
https://nyxvantore-designs.vercel.app/admin/
http://127.0.0.1:4173/admin/
```

5. Se usar um domínio próprio, adicione também `https://seu-dominio.com/admin/`.

O endereço usado pelo magic link precisa estar autorizado nessa lista. Consulte também a [documentação de Redirect URLs do Supabase](https://supabase.com/docs/guides/auth/redirect-urls).

## Parte 4 — Ativar o formulário de contato

O WhatsApp, Instagram e e-mail já funcionam sem configuração adicional. Para ativar o formulário:

1. Crie uma chave em [Web3Forms](https://web3forms.com/).
2. Confirme o e-mail que receberá os contatos.
3. Copie a access key.
4. Na Vercel, abra **Settings > Environment Variables**.
5. Adicione a chave como `CONTACT_FORM_KEY`.
6. Abra **Deployments**, escolha o último deploy e use **Redeploy**.

## Parte 5 — Como publicar seus projetos

Depois que Supabase e Vercel estiverem configurados:

### 1. Entrar no painel

1. Acesse `https://seu-site.com/admin`.
2. Informe `nyxfreelancer9@gmail.com`.
3. Clique em **Enviar link de acesso**.
4. Abra o e-mail recebido e clique no magic link.
5. Você será redirecionada para o painel administrativo.

### 2. Criar um trabalho

1. Clique em **Novo projeto**.
2. Preencha:
   - título;
   - slug, que será o identificador único;
   - categoria;
   - resumo;
   - descrição completa;
   - ano;
   - data de publicação;
   - ferramentas utilizadas;
   - links externos ou de vídeo, quando existirem;
   - ordem de exibição.
3. Selecione uma imagem de capa.
4. Escreva um texto alternativo descrevendo essa capa.
5. Se quiser, adicione várias imagens à galeria e revise o texto alternativo de cada uma.
6. Marque **Publicado** para o trabalho aparecer no site.
7. Marque **Projeto em destaque** se quiser priorizá-lo.
8. Clique em **Salvar projeto** e aguarde a confirmação.

Formatos aceitos: JPG, JPEG, PNG e WebP. O limite é 8 MB por imagem.

### 3. Administrar trabalhos existentes

Na lista de projetos você poderá:

- **Editar** textos, imagens, links e informações;
- **Publicar/Ocultar** sem excluir o projeto;
- **Destacar/Remover destaque**;
- usar as setas para alterar a ordem;
- **Excluir** permanentemente, após confirmação.

Se quiser preparar um trabalho aos poucos, salve sem marcar **Publicado**. Ele ficará visível somente no painel.

## Parte 6 — Domínio próprio

1. Na Vercel, abra **Settings > Domains**.
2. Clique em **Add Domain** e informe o domínio.
3. Siga os registros DNS mostrados pela Vercel.
4. Atualize a **Site URL** e as **Redirect URLs** no Supabase.
5. Se o domínio final não for `nyxvantore.com.br`, substitua esse endereço em `index.html`, `robots.txt` e `sitemap.xml` e faça um novo deploy.

## Checklist final

- [ ] `schema.sql` executado sem erro;
- [ ] usuário administrador criado e confirmado;
- [ ] cadastros públicos desativados;
- [ ] quatro variáveis cadastradas na Vercel;
- [ ] Site URL e Redirect URLs configuradas no Supabase;
- [ ] página inicial abre corretamente;
- [ ] `/admin` envia o magic link;
- [ ] projeto de teste pode ser criado, publicado, editado e excluído;
- [ ] formulário de contato testado;
- [ ] versão mobile conferida no celular.
