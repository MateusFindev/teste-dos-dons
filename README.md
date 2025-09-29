# Teste dos Dons - Aplicação Web

Uma aplicação web responsiva para descobrir dons espirituais, baseada no livro "O Teste dos Dons" de Christian A. Schwarz.

## 🚀 Funcionalidades

- ✅ **7 seções de perguntas** com 13 questões cada
- ✅ **Interface responsiva** para mobile e desktop
- ✅ **Cálculo automático** dos resultados baseado em pontuação
- ✅ **Página de resultados colorida** com ranking dos top 3 dons
- ✅ **Exportação para PDF** dos resultados
- ✅ **Integração com Firebase** para armazenamento de dados
- ✅ **Aviso especial** para a seção 7 (respondida por terceiros)
- ✅ **Design minimalista** com Tailwind CSS

## 🛠️ Tecnologias Utilizadas

- **React** - Framework frontend
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes de interface
- **Firebase Firestore** - Banco de dados
- **jsPDF + html2canvas** - Geração de PDF
- **Vite** - Build tool
- **Lucide React** - Ícones

## 📋 Pré-requisitos

- Node.js 18+ 
- pnpm (ou npm/yarn)
- Conta no Firebase

## 🔧 Configuração

### 1. Clone e instale dependências

```bash
git clone <url-do-repositorio>
cd teste-dos-dons
pnpm install
```

### 2. Configurar Firebase

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Crie um novo projeto ou use um existente
3. Ative o **Firestore Database**
4. Nas configurações do projeto, obtenha as credenciais de configuração
5. Edite o arquivo `src/lib/firebase.js` e substitua as configurações:

```javascript
const firebaseConfig = {
  apiKey: "sua-api-key-aqui",
  authDomain: "seu-projeto.firebaseapp.com", 
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "sua-app-id-aqui"
}
```

### 3. Configurar regras do Firestore

No console do Firebase, vá em **Firestore Database > Rules** e configure:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir leitura e escrita na coleção de resultados
    match /resultados-teste-dons/{document} {
      allow read, write: if true;
    }
  }
}
```

**⚠️ Importante:** Esta regra permite acesso público. Para produção, implemente autenticação adequada.

## 🚀 Executar localmente

```bash
pnpm run dev
```

A aplicação estará disponível em `http://localhost:5173`

## 📦 Build para produção

```bash
pnpm run build
```

## 🌐 Deploy

### Vercel (Recomendado)

1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente se necessário
3. Deploy automático a cada push

### Netlify

1. Conecte seu repositório ao Netlify
2. Configure build command: `pnpm run build`
3. Configure publish directory: `dist`

## 📊 Estrutura dos Dados

### Firestore Collection: `resultados-teste-dons`

```javascript
{
  nome: "João Silva",
  igreja: "Igreja Batista Central", 
  respostas: {
    1: 40,  // pergunta 1 = 40 pontos
    2: 30,  // pergunta 2 = 30 pontos
    // ... todas as 91 respostas
  },
  resultados: [
    {
      nome: "Administração",
      pontuacao: 240,
      percentual: 86
    },
    // ... todos os 13 dons ordenados por pontuação
  ],
  dataRealizacao: "2024-01-15T10:30:00Z",
  timestamp: 1705312200000
}
```

## 🎯 Como Usar

1. **Início**: Preencha nome e igreja
2. **Seções 1-6**: Responda as perguntas com sinceridade
3. **Aviso**: Chame alguém próximo para responder a seção 7
4. **Seção 7**: A pessoa próxima responde sobre você
5. **Resultados**: Veja seus dons principais e baixe o PDF

## 🔒 Segurança

- Configure regras adequadas no Firestore para produção
- Considere implementar autenticação se necessário
- Valide dados no frontend e backend

## 📈 Análises

A aplicação salva todos os resultados no Firebase, permitindo:

- Análise de dons mais comuns na comunidade
- Estatísticas por igreja
- Relatórios de uso da ferramenta

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para detalhes.

## 📞 Suporte

Para dúvidas ou problemas:

1. Abra uma issue no GitHub
2. Verifique a documentação do Firebase
3. Consulte a documentação do React/Vite

---

**Baseado no livro "O Teste dos Dons" de Christian A. Schwarz (1999)**
