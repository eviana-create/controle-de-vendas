<h1 align="center">🍷 Adega Lounge</h1>

<p align="center">
  Sistema completo de gestão de <strong>vendas, produtos e estoque</strong> para adegas e bares.<br/>
  Desenvolvido com Firebase e interface moderna separada para <strong>Administradores</strong> e <strong>Funcionários</strong>.
</p>

<div align="center">
  <img src="https://img.shields.io/badge/Status-Em%20Desenvolvimento-yellow" alt="status">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="license">
  <img src="https://img.shields.io/badge/Firebase-integrado-orange" alt="firebase">
</div>

---

## 🚀 Funcionalidades

### 👤 Autenticação
- 🔐 Login e cadastro com Firebase Authentication.
- 👥 Controle de acesso por tipo de usuário: **Administrador** ou **Funcionário**.

### 📦 Gestão de Produtos
- ➕ Cadastro e listagem de produtos.
- ♻️ Atualização automática da quantidade após venda.
- 📌 Produtos continuam visíveis mesmo com estoque zerado.

### 🛒 Vendas
- 🧾 Registro de vendas com data, produto e valor.
- 📉 Estoque decrementado automaticamente.
- 🕓 Histórico completo de transações.

### 🔔 Alerta de Estoque Baixo
- 🚨 Notificação visual (vermelha) quando o estoque atinge 3 unidades ou menos.

### 🖥️ Painéis Separados
- `admin.html` → Acesso completo ao sistema: produtos, vendas, estoque, histórico e cadastro de funcionários.
- `funcionario.html` → Interface restrita ao módulo de vendas.

---

## 🛠️ Tecnologias Utilizadas

- 🌐 **HTML5 / CSS3 / JavaScript (Modular)**
- ☁️ **Firebase**
  - Authentication
  - Firestore Database
  - Hosting *(opcional)*

---

## 📂 Estrutura de Arquivos

```bash
Adega-Lounge/
│
├── index.html
├── login.html
├── cadastro.html
├── admin.html
├── funcionario.html
├── estoque.html
├── vendas.html
├── historico.html
│
├── css/
│   └── style.css
│
├── js/
│   ├── auth.js
│   ├── produtos.js
│   ├── vendas.js
│   ├── estoque.js
│   └── utils.js
│
└── firebase/
    └── firebaseConfig.js
