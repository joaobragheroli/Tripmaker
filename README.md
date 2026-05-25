# 🌍 TripMaker

Plataforma web para roteiro e agendamento de viagens, com suporte a IA para geração de roteiros personalizados, cadastro de espaços turísticos e gerenciamento de destinos por usuário.

---

## 📁 Estrutura do Projeto

```
tripmaker/
│
├── Home/                        → Página inicial com carrossel de destinos
│   ├── index.php
│   ├── app.js
│   └── style.css
│
├── Login_Cadastro/              → Autenticação e cadastro de usuários
│   ├── index.php
│   ├── style.css
│   └── includes/
│       ├── conexao.php          → Conexão com o banco de dados (PDO)
│       ├── login.php            → Lógica de login
│       ├── cadastro.php         → Lógica de cadastro
│       └── logout.php
│
├── Anuncie_Espaco/              → Fluxo de cadastro de pontos turísticos (multi-etapas)
│   ├── 1.Ambiente/              → Escolha do tipo de ambiente
│   ├── 2.Espaco/                → Escolha do tipo de espaço
│   ├── 3.Local/                 → Endereço e localização (com PHP + Composer)
│   ├── 4.Confirmar_Local/       → Confirmação do local
│   ├── 5.Quantidade/            → Capacidade (quartos, banheiros, hóspedes...)
│   ├── 6.Informacao/            → Informações gerais do espaço
│   ├── 7.Imagem_Local/          → Upload de imagens
│   ├── 8.Descricao_Local/       → Descrição do espaço
│   ├── 9.Valor/                 → Valor do imóvel e salvamento no banco
│   │   └── Visualizar_Dados/    → Painel de visualização dos dados cadastrados
│   └── Script_Global.js         → Script compartilhado entre as etapas
│
├── Minhas_Viagens/              → Painel do usuário com destinos salvos
│   ├── minhas_viagens.php
│   ├── salvar_destino.php
│   ├── editar_destino.php
│   ├── excluir_destino.php
│   ├── conexao.php
│   └── uploads/                 → Fotos enviadas pelos usuários
│
├── Pagina-ia/                   → Chat com IA para geração de roteiros de viagem
│   ├── server.js                → Backend Node.js (Express + OpenAI + MySQL)
│   ├── package.json
│   └── public/
│       ├── index.html
│       ├── script.js
│       └── style.css
│
└── turismo.sql                  → Script de criação do banco de dados
```

---

## ⚙️ Tecnologias Utilizadas

| Camada       | Tecnologia                          |
|--------------|-------------------------------------|
| Front-end    | HTML, CSS, JavaScript               |
| Back-end PHP | PHP 8+, PDO, MySQLi, Composer       |
| Back-end Node| Node.js, Express                    |
| Banco        | MySQL / MariaDB                     |
| IA           | OpenAI API (GPT)                    |
| PDF          | PDFKit (geração de roteiros em PDF) |

---

## 🗄️ Banco de Dados

O arquivo `turismo.sql` cria o banco `turismo` com duas tabelas:

**`usuarios`** — cadastro de usuários com campos: `id`, `username`, `email`, `password`, `tipo` (`user` / `adm` / `adm-prefeitura`), `data_criacao`.

**`pontos_turisticos`** — espaços cadastrados pelos anunciantes com campos de endereço, capacidade, imagens (JSON), valor e coordenadas geográficas (`lat`, `lng`).

---

## 🚀 Como Rodar

### Pré-requisitos

- PHP 8.0+
- MySQL / MariaDB (ex: XAMPP)
- Node.js 18+
- Composer

### 1. Banco de Dados

```sql
-- No phpMyAdmin ou terminal MySQL:
source turismo.sql;
```

### 2. Parte PHP (Home, Login, Anuncie_Espaco, Minhas_Viagens)

Coloque a pasta `tripmaker-main/` dentro do diretório do servidor local (ex: `htdocs` no XAMPP).

Acesse pelo navegador: `http://localhost/tripmaker-main/Home/index.php`

> A conexão padrão usa `root` sem senha no host `localhost`. Ajuste em `Login_Cadastro/includes/conexao.php` e `Anuncie_Espaco/3.Local/.env` se necessário.

### 3. Página da IA (Node.js)

```bash
cd Pagina-ia
npm install

# Copie o arquivo de exemplo e preencha sua chave OpenAI
cp .env.example .env
# Edite o .env com: OPENAI_API_KEY=sua_chave_aqui

node server.js
```

Acesse: `http://localhost:3000`

---

## 🔐 Variáveis de Ambiente

**`Pagina-ia/.env`**
```
OPENAI_API_KEY=sua_chave_aqui
```

**`Anuncie_Espaco/3.Local/.env`**
```
# Configurações do ambiente local do PHP
```

> Nenhum `.env` deve ser commitado. O `.gitignore` já está configurado para ignorá-los.

---

## 📌 Observações para Organização

Alguns pontos que podem ser melhorados conforme o projeto cresce:

- **Conexão duplicada**: `conexao.php` existe separado em `Login_Cadastro/` e em `Minhas_Viagens/` com métodos diferentes (PDO vs MySQLi). Vale unificar em um único arquivo compartilhado.
- **Credenciais hardcoded**: alguns arquivos PHP ainda usam `root`/`""` diretamente no código em vez de `.env`. Recomendado mover tudo para variáveis de ambiente.
- **Fluxo Anuncie Espaço**: as 9 etapas se comunicam via URL params e `sessionStorage`. Um `README` próprio dentro da pasta ou um diagrama de fluxo ajudaria novos devs a entender a sequência.
- **`vendor/` e `node_modules/`**: já ignorados pelo `.gitignore`, mas certifique-se de que `package-lock.json` e `composer.lock` estejam versionados para garantir reprodutibilidade.
- **Imagens em `Minhas_Viagens/uploads/`**: fotos de usuários não devem ir para o repositório. Adicionar `Minhas_Viagens/uploads/*` ao `.gitignore` é recomendado.

---

## 👥 Equipe

| Nome              | Responsabilidade                        |
|-------------------|-----------------------------------------|
| Guilherme Cristian | Front-end (Home, Roteiro, Modal)       |
| Braghe            | Integração com IA                       |
| Braghe            | Colaboração geral                       |

---

*Projeto acadêmico — TripMaker © 2025*
