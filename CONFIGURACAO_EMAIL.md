# Configuração do EmailJS para Envio de Emails

## 🎯 **Funcionalidades de Email Implementadas**

### ✅ **Envio Automático para Secretaria**
- **OBPC Cascavel**: `administrativo@obpccascavel.com.br`
- **OBPC Cafelândia**: `administrativo@obpccafelandia.com.br`

### ✅ **Envio para Usuário (Opcional)**
- Campo de email opcional na página inicial
- Usuário recebe cópia dos resultados se informar email

## 🔧 **Como Configurar o EmailJS**

### **1. Criar Conta no EmailJS**
1. Acesse [emailjs.com](https://www.emailjs.com/)
2. Crie uma conta gratuita
3. Confirme seu email

### **2. Configurar Serviço de Email**
1. No painel, vá em **"Email Services"**
2. Clique em **"Add New Service"**
3. Escolha seu provedor (Gmail, Outlook, etc.)
4. Configure com suas credenciais
5. **Anote o Service ID** (ex: `service_gmail`)

### **3. Criar Template de Email**
1. Vá em **"Email Templates"**
2. Clique em **"Create New Template"**
3. Configure o template:

```html
Assunto: {{subject}}

Olá {{to_name}},

{{message}}

---
Informações do Teste:
Participante: {{participante_nome}}
Igreja: {{participante_igreja}}
Email: {{participante_email}}
Data: {{data_teste}} às {{hora_teste}}

Dom Principal: {{dom_principal}} ({{pontuacao_principal}} pontos)

---
Este email foi enviado automaticamente pelo Sistema Teste dos Dons.
```

4. **Anote o Template ID** (ex: `template_resultado`)

### **4. Obter Public Key**
1. Vá em **"Account"** > **"General"**
2. Copie a **Public Key**

### **5. Atualizar Configurações no Código**

Edite o arquivo `src/lib/emailService.js`:

```javascript
const EMAILJS_CONFIG = {
  serviceId: 'SEU_SERVICE_ID', // Substitua aqui
  templateId: 'SEU_TEMPLATE_ID', // Substitua aqui
  publicKey: 'SUA_PUBLIC_KEY' // Substitua aqui
}
```

## 📧 **Exemplo de Configuração Completa**

```javascript
// src/lib/emailService.js
const EMAILJS_CONFIG = {
  serviceId: 'service_gmail', // Seu Service ID
  templateId: 'template_resultado', // Seu Template ID
  publicKey: 'user_abc123xyz' // Sua Public Key
}
```

## 🧪 **Testar a Configuração**

1. **Faça um teste completo** do formulário
2. **Verifique os logs** no console do navegador
3. **Confirme o recebimento** nos emails de destino

### **Logs Esperados:**
```
Email enviado para secretaria: {status: 200, text: "OK"}
Email enviado para usuário: {status: 200, text: "OK"}
```

## 🚨 **Solução de Problemas**

### **Erro: "EmailJS não configurado"**
- Verifique se as configurações foram atualizadas
- Confirme se os IDs estão corretos

### **Erro: "Service not found"**
- Verifique o Service ID no painel do EmailJS
- Confirme se o serviço está ativo

### **Erro: "Template not found"**
- Verifique o Template ID
- Confirme se o template foi salvo

### **Emails não chegam**
- Verifique a pasta de spam
- Confirme se o serviço de email está configurado corretamente
- Teste com um email diferente

## 📊 **Limites do Plano Gratuito**

- **200 emails/mês** no plano gratuito
- Para mais emails, considere upgrade para plano pago
- Monitore o uso no painel do EmailJS

## 🔒 **Segurança**

- **Public Key** pode ser exposta no frontend
- **Private Keys** nunca devem ser expostas
- EmailJS gerencia a segurança do envio

## 📝 **Template Avançado (Opcional)**

Para um template mais elaborado:

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        .header { background: #3b82f6; color: white; padding: 20px; }
        .content { padding: 20px; }
        .result { background: #f3f4f6; padding: 15px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Teste dos Dons Espirituais</h1>
    </div>
    <div class="content">
        <p>Olá {{to_name}},</p>
        
        <p>Segue o resultado do Teste dos Dons:</p>
        
        <div class="result">
            <h3>Participante: {{participante_nome}}</h3>
            <p><strong>Igreja:</strong> {{participante_igreja}}</p>
            <p><strong>Data:</strong> {{data_teste}} às {{hora_teste}}</p>
            <p><strong>Dom Principal:</strong> {{dom_principal}} ({{pontuacao_principal}} pontos)</p>
        </div>
        
        <div style="white-space: pre-line;">{{message}}</div>
        
        <p>Este email foi enviado automaticamente pelo Sistema Teste dos Dons.</p>
    </div>
</body>
</html>
```

## ✅ **Checklist de Configuração**

- [ ] Conta criada no EmailJS
- [ ] Serviço de email configurado
- [ ] Template criado e testado
- [ ] IDs atualizados no código
- [ ] Teste realizado com sucesso
- [ ] Emails recebidos corretamente

---

**Após a configuração, os emails serão enviados automaticamente a cada teste realizado!**
