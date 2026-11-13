# 🚗 Auto Vale Locadora

Sistema web completo para gestão e catálogo de veículos de locadora, contando com vitrine pública para clientes e painel administrativo para cadastro, edição e controle de frota.

## ✨ Funcionalidades

- **Catálogo de Veículos:** Exibição de veículos disponíveis com detalhes como categoria, ano, quilometragem e descrição.
- **Painel Administrativo:** Área restrita para gerenciamento interno da frota.
- **Gestão de Fotos:** Upload e armazenamento de imagens dos veículos.
- **Validação de Dados:** Verificação automática dos dados cadastrados (nome, categoria, ano, quilometragem e disponibilidade).

## 🛠️ Tecnologias Utilizadas

- **Back-end:** Node.js, Express
- **Front-end:** HTML5, CSS3, JavaScript
- **Armazenamento:** Sistema de arquivos local (JSON / Uploads)

## 📁 Estrutura do Projeto

```text
├── public/          # Arquivos estáticos (HTML, CSS, JS e imagens)
│   ├── admin/       # Interface do painel administrativo
│   └── images/      # Banners e imagens padrão
├── src/             # Código-fonte do servidor e regras de negócio
│   ├── config.js
│   ├── errors.js
│   ├── middlewares.js
│   ├── photoStorage.js
│   ├── routes.js
│   ├── vehicleRepository.js
│   ├── vehicleService.js
│   └── vehicleValidator.js
├── server.js        # Arquivo principal de inicialização do servidor
└── package.json     # Dependências e scripts do projeto
```

## 🚀 Como executar o projeto localmente

### Pré-requisitos
Certifique-se de ter o [Node.js](https://nodejs.org) instalado em sua máquina.

### Passo a passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com
   ```

2. **Acesse a pasta do projeto:**
   ```bash
   cd AUTO-VALE-LOCADORA
   ```

3. **Instale as dependências:**
   ```bash
   npm install
   ```

4. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env` na raiz do projeto (caso necessário) com as configurações da porta e credenciais de acesso.

5. **Inicie o servidor:**
   ```bash
   node server.js
   ```
   *(Ou utilize `npm start` caso esteja configurado no seu `package.json`).*

6. **Acesse no navegador:**
   Abra `http://localhost:3000` (ou a porta definida no seu `.env`).

---

Desenvolvido por [Ygor Henrique](https://github.com).
