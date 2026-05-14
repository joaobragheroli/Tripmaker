// server.js - Mantém TUDO e adiciona modo substituição
require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const path = require("path");
const OpenAI = require("openai");
const PDFDocument = require('pdfkit');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Conexão MySQL — credenciais via variáveis de ambiente (.env)
const dbPromise = mysql.createConnection({
    host:     process.env.DB_HOST     || "localhost",
    user:     process.env.DB_USER     || "root",
    password: process.env.DB_PASS     || "",
    database: process.env.DB_NAME     || "turismo"
});

// Função para formatar moeda
const formatCurrency = n => `R$ ${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// Função cleanJSON (mantém a mesma)
const cleanJSON = (str) => {
    console.log("📝 Tentando limpar JSON do GPT");

    if (!str || typeof str !== 'string') {
        console.log("❌ String vazia ou inválida");
        return null;
    }

    // 1. PRIMEIRO: Encontra o JSON usando uma abordagem mais flexível
    let jsonStr = str;

    // Remove markdown code blocks se existirem
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

    // Encontra o array JSON (abordagem mais tolerante)
    const match = jsonStr.match(/\[[\s\S]*\]/);
    if (!match) {
        console.log("❌ Não encontrou JSON array na resposta");
        return null;
    }

    jsonStr = match[0];

    // 2. SEGUNDO: Limpeza GRADUAL e conservadora
    let tentativas = [
        // Tentativa 1: Limpeza mínima
        () => {
            let temp = jsonStr
                .replace(/[\r\n]/g, ' ')  // Apenas quebras de linha básicas
                .replace(/\s+/g, ' ')     // Espaços múltiplos para simples
                .replace(/,\s*]/g, ']')   // Vírgulas extras no final do array
                .replace(/,\s*}/g, '}')   // Vírgulas extras no final do objeto
                .replace(/"/g, '"').replace(/"/g, '"'); // Aspas curvas

            console.log("🔄 Tentativa 1 - Limpeza mínima");
            return JSON.parse(temp);
        },

        // Tentativa 2: Correção de quebras dentro de strings
        () => {
            let temp = jsonStr;
            // Encontra e corrige strings quebradas
            temp = temp.replace(/"([^"]*?)[\r\n]+([^"]*?)"/g, '"$1 $2"');
            temp = temp.replace(/[\r\n]/g, ' ');
            temp = temp.replace(/\s+/g, ' ');

            console.log("🔄 Tentativa 2 - Correção de strings quebradas");
            return JSON.parse(temp);
        },

        // Tentativa 3: Limpeza mais agressiva mas preservando estrutura
        () => {
            let temp = jsonStr;
            // Remove TODAS as quebras preservando o conteúdo
            temp = temp.replace(/[\r\n]/g, ' ');
            // Normaliza espaços mas mantém a estrutura
            temp = temp.replace(/\s*,\s*/g, ',')
                .replace(/\s*:\s*/g, ':')
                .replace(/\s*}\s*/g, '}')
                .replace(/\s*{\s*/g, '{')
                .replace(/\s*\[\s*/g, '[')
                .replace(/\s*\]\s*/g, ']');

            console.log("🔄 Tentativa 3 - Normalização de espaços");
            return JSON.parse(temp);
        },

        // Tentativa 4: Último recurso - reconstrução manual
        () => {
            console.log("🔄 Tentativa 4 - Reconstrução manual");
            // Extrai objetos individuais
            const objetos = jsonStr.match(/\{[^{}]*\}/g) || [];
            const objetosValidos = [];

            for (let objStr of objetos) {
                try {
                    // Limpeza conservadora do objeto
                    let objLimpo = objStr
                        .replace(/[\r\n]/g, ' ')
                        .replace(/\s+/g, ' ')
                        .replace(/,\s*}/g, '}')
                        .replace(/"\s*:/g, '":')
                        .replace(/:\s*"/g, ':"');

                    const obj = JSON.parse(objLimpo);
                    // Verifica se tem campos mínimos
                    if (obj.nome && obj.categoria) {
                        objetosValidos.push(obj);
                    }
                } catch (e) {
                    // Pula objetos problemáticos
                    continue;
                }
            }

            if (objetosValidos.length > 0) {
                return objetosValidos;
            }
            throw new Error("Nenhum objeto válido encontrado");
        }
    ];

    // Executa as tentativas em ordem
    for (let i = 0; i < tentativas.length; i++) {
        try {
            const resultado = tentativas[i]();
            console.log(`✅ JSON parseado com sucesso na tentativa ${i + 1}`);
            return resultado;
        } catch (e) {
            console.log(`❌ Tentativa ${i + 1} falhou: ${e.message}`);
            if (i === tentativas.length - 1) {
                console.log("💥 Todas as tentativas falharam");
                return null;
            }
        }
    }

    return null;
};

// Rota principal
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

// ROTA /roteiro - MANTÉM TUDO E ADICIONA MODO SUBSTITUIÇÃO
app.post("/roteiro", async (req, res) => {
    console.log("🚀 Rota /roteiro chamada");
    console.log("📦 Body recebido:", req.body);

    // ADICIONA substituicao mas mantém compatibilidade
    let { cidade, categoria, valor, quantidade, substituicao } = req.body;
    cidade = cidade?.trim();
    categoria = categoria?.trim();
    valor = valor ? parseFloat(String(valor).replace(/\./g, "").replace(",", ".")) : null;
    quantidade = quantidade || 5;
    substituicao = substituicao || false; // ← NOVO: modo substituição

    console.log("🎯 Parâmetros processados:", { cidade, categoria, valor, quantidade, substituicao });

    try {
        const db = await dbPromise;

        // 🔥 MODO SUBSTITUIÇÃO: Não consulta banco, apenas GPT
        let pontosBanco = [];
        if (!substituicao) {
            // CONSULTA BANCO APENAS NO MODO NORMAL
            let query = `
                SELECT 
                    cardsSelecionados,
                    idAmbiente,
                    valorImovel,
                    descricao,
                    cidade
                FROM pontos_turisticos 
                WHERE 1=1
            `;
            const params = [];

            if (cidade) {
                params.push(`%${cidade}%`);
                query += " AND cidade LIKE ?";
            }
            if (categoria) {
                params.push(`%${categoria}%`);
                query += " AND idAmbiente LIKE ?";
            }

            console.log("🔍 Query SQL:", query);
            console.log("📊 Parâmetros SQL:", params);

            const [rows] = await db.execute(query, params);
            console.log("📦 Dados do banco:", rows);

            // Padroniza pontos do banco - usando CIDADE como nome
            const padronizaPonto = p => {
                const preco = p.valorImovel ? Number(p.valorImovel) : 0;
                const pontoFormatado = {
                    nome: p.cidade || "Ponto Turístico", // Usa cidade como nome
                    categoria: p.idAmbiente || "Geral",
                    descricao: p.descricao || `Local em ${p.cidade}`,
                    valor: preco > 0 ? formatCurrency(preco) : "sem custo",
                    preco: preco
                };
                console.log("🔄 Ponto formatado:", pontoFormatado);
                return pontoFormatado;
            };

            pontosBanco = rows.map(padronizaPonto);
        }

        let totalBanco = pontosBanco.reduce((s, p) => s + (p.preco || 0), 0);
        let pontos = [...pontosBanco];

        // 🔥 LÓGICA DIFERENTE PARA MODO SUBSTITUIÇÃO
        let prompt = "";
        let precisaGPT = false;

        if (substituicao) {
            // 🎯 MODO SUBSTITUIÇÃO: Busca APENAS 1 card NOVO e DIFERENTE
            console.log("🔄 MODO SUBSTITUIÇÃO: Buscando 1 card novo do ChatGPT");
            precisaGPT = true;
            
            if (cidade && categoria) {
                prompt = `Sugira APENAS UM ponto turístico DIFERENTE e pouco conhecido na cidade ${cidade} da categoria ${categoria}. Evite repetir opções comuns.`;
            } else if (cidade) {
                prompt = `Sugira APENAS UM ponto turístico DIFERENTE e pouco conhecido na cidade ${cidade}. Seja criativo e evite lugares óbvios.`;
            } else if (categoria) {
                prompt = `Sugira APENAS UM ponto turístico DIFERENTE da categoria ${categoria} em qualquer cidade do Brasil. Inove nas sugestões.`;
            } else if (valor) {
                prompt = `Sugira APENAS UM ponto turístico com custo aproximado de R$ ${valor}. Seja original na sugestão.`;
            } else {
                prompt = `Sugira APENAS UM ponto turístico único e interessante no Brasil que poucos conhecem.`;
            }
            
            prompt += ` Responda em JSON válido no formato: [ { "nome": "Nome REAL e diferente", "categoria": "Tipo específico", "descricao": "Descrição detalhada e única", "valor": "R$ XX,XX" } ] - APENAS UM ITEM NO ARRAY`;
            
        } else {
            // ✅ MODO NORMAL: Mantém TUDO como estava
            if (cidade && categoria) {
                console.log("🏙️🎯 Tem cidade E categoria, chamando GPT para completar");
                precisaGPT = true;
                prompt = `Liste pontos turísticos reais e famosos na cidade ${cidade} da categoria ${categoria}. Inclua opções variadas.`;

            } else if (cidade) {
                console.log("🏙️ Tem cidade específica, chamando GPT para completar pontos");
                precisaGPT = true;
                prompt = `Liste pontos turísticos reais e famosos na cidade ${cidade}. Inclua atrações, restaurantes, parques, museus e locais culturais.`;

            } else if (categoria) {
                console.log("🎯 Tem categoria específica, chamando GPT para completar");
                precisaGPT = true;
                prompt = `Liste pontos turísticos da categoria ${categoria} em diferentes cidades do Brasil. Inclua opções variadas.`;

            } else if (pontosBanco.length === 0) {
                console.log("📭 Banco retornou 0 resultados, chamando GPT");
                precisaGPT = true;
                prompt = "Liste pontos turísticos gerais no Brasil.";
            } else if (valor && valor > totalBanco) {
                console.log("💵 Valor solicitado maior que total do banco, chamando GPT");
                precisaGPT = true;
                let restante = valor - totalBanco;
                prompt = `Complete com pontos turísticos adicionais até R$ ${restante.toFixed(2)}.`;
            }

            // Se precisa do GPT, monta o prompt completo (MODO NORMAL)
            if (precisaGPT && prompt) {
                prompt += ` Responda em JSON válido no formato: [ { "nome": "Nome real do lugar", "categoria": "Tipo (ex: restaurante, parque, museu)", "descricao": "Descrição detalhada", "valor": "R$ 50,00" } ]`;
            }
        }

        console.log("🤖 Precisa chamar GPT?", precisaGPT);
        console.log("📝 Prompt para GPT:", prompt);

        // Chamada GPT (mantém igual para ambos os modos)
        let pontosGPT = [];
        if (precisaGPT && prompt) {
            try {
                console.log("🔄 Chamando API do OpenAI...");
                const resposta = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: "Você é um guia turístico especializado em Brasil. Retorne APENAS JSON válido sem texto adicional."
                        },
                        { role: "user", content: prompt }
                    ],
                    temperature: substituicao ? 0.9 : 0.7, // ← Mais criativo para substituição
                    max_tokens: substituicao ? 800 : 2000
                });

                const conteudoGPT = resposta.choices[0].message.content;
                console.log("📨 Resposta bruta do GPT:", conteudoGPT);

                const conteudoLimpinho = conteudoGPT.replace(/```json|```/g, "").trim();
                console.log("🧹 Resposta limpa do GPT:", conteudoLimpinho);

                const jsonExtraido = cleanJSON(conteudoLimpinho);

                if (jsonExtraido && Array.isArray(jsonExtraido)) {
                    pontosGPT = jsonExtraido.map(p => {
                        let preco = 0;
                        if (p.valor && p.valor !== "sem custo") {
                            const num = parseFloat(p.valor.replace(/[^\d.,-]/g, "").replace(",", "."));
                            preco = isNaN(num) ? 0 : Math.abs(num);
                        }
                        const pontoGPT = {
                            nome: p.nome || "Ponto GPT",
                            categoria: p.categoria || "Geral",
                            descricao: p.descricao || "Descrição do ponto turístico",
                            valor: preco > 0 ? formatCurrency(preco) : "sem custo",
                            preco: preco
                        };
                        console.log("🤖 Ponto GPT processado:", pontoGPT);
                        return pontoGPT;
                    });
                    console.log("🎉 Pontos GPT processados:", pontosGPT);
                } else {
                    console.warn("❌ GPT não retornou JSON válido ou array vazio");
                }
            } catch (error) {
                console.error("❌ Erro na chamada do GPT:", error);
            }
        }

        // 🔥 LÓGICA DIFERENTE PARA ADICIONAR PONTOS GPT
        if (substituicao) {
            // MODO SUBSTITUIÇÃO: Apenas adiciona os pontos GPT (1 card novo)
            pontos.push(...pontosGPT);
            console.log("✅ Modo substituição: Card GPT adicionado");
        } else {
            // ✅ MODO NORMAL: Mantém a lógica original com filtro por valor
            if (pontosGPT.length > 0) {
                console.log("➕ Adicionando pontos GPT com quantidade dinâmica");

                // Define quantidade de cards baseada no valor
                let quantidadeCardsGPT = 5; // padrão quando não tem valor

                if (valor) {
                    console.log(`💰 Valor estabelecido: R$ ${valor}`);

                    if (valor >= 5000) {
                        quantidadeCardsGPT = 10;
                        console.log("🎯 Valor ≥ R$ 5.000: 10 cards do GPT");
                    } else if (valor >= 2000) {
                        quantidadeCardsGPT = 7;
                        console.log("🎯 Valor ≥ R$ 2.000: 7 cards do GPT");
                    } else if (valor >= 1000) {
                        quantidadeCardsGPT = 5;
                        console.log("🎯 Valor ≥ R$ 1.000: 5 cards do GPT");
                    } else if (valor >= 500) {
                        quantidadeCardsGPT = 3;
                        console.log("🎯 Valor ≥ R$ 500: 3 cards do GPT");
                    } else {
                        quantidadeCardsGPT = 1;
                        console.log("🎯 Valor < R$ 500: 1 card do GPT");
                    }

                    console.log(`💰 Filtrando até ${quantidadeCardsGPT} pontos GPT pelo valor máximo: R$ ${valor}`);
                    let totalAtual = pontos.reduce((s, p) => s + (p.preco || 0), 0);
                    let pontosAdicionados = 0;

                    for (const pontoGPT of pontosGPT) {
                        // Para se já atingiu a quantidade máxima
                        if (pontosAdicionados >= quantidadeCardsGPT) {
                            console.log(`⏹️  Limite de ${quantidadeCardsGPT} pontos GPT atingido`);
                            break;
                        }

                        // Verifica se adicionar este ponto não ultrapassa o valor
                        if ((totalAtual + pontoGPT.preco) <= valor) {
                            pontos.push(pontoGPT);
                            totalAtual += pontoGPT.preco;
                            pontosAdicionados++;
                            console.log(`✅ Adicionado ponto GPT (${pontosAdicionados}/${quantidadeCardsGPT}): ${pontoGPT.nome} - R$ ${pontoGPT.preco} (Total: R$ ${totalAtual})`);
                        } else {
                            console.log(`⏹️  Pulando ponto GPT: ${pontoGPT.nome} - R$ ${pontoGPT.preco} (ultrapassaria o valor)`);
                        }
                    }

                    console.log(`🎯 Total de pontos GPT adicionados: ${pontosAdicionados}`);
                } else {
                    // Se não tem valor específico, adiciona 5 cards do GPT (padrão)
                    console.log("💸 Sem valor específico, adicionando 5 pontos GPT (padrão)");
                    const pontosParaAdicionar = pontosGPT.slice(0, quantidadeCardsGPT);
                    pontos.push(...pontosParaAdicionar);
                    console.log(`✅ Adicionados ${pontosParaAdicionar.length} pontos do GPT`);
                }
            }
        }

        console.log("🎊 PONTOS FINAIS (antes do limite):", pontos);

        // ✅ APLICA O LIMITE DE QUANTIDADE DO FRONTEND
        const pontosLimitados = pontos.slice(0, quantidade);
        console.log(`🎯 Aplicando limite de ${quantidade} cards:`, pontosLimitados);

        // Garantir que todos os pontos tenham os campos necessários
        const pontosFinais = pontosLimitados.map(p => ({
            nome: p.nome || "Não informado",
            categoria: p.categoria || "Geral",
            descricao: p.descricao || "Descrição não disponível",
            valor: p.valor || "sem custo"
        }));

        const respostaFinal = {
            pontos: pontosFinais,
            total: pontosLimitados.reduce((s, p) => s + (p.preco || 0), 0)
        };

        console.log("📤 Enviando resposta final:", respostaFinal);
        res.json(respostaFinal);

    } catch (err) {
        console.error("💥 Erro geral no /roteiro:", err);
        res.status(500).json({
            erro: err.message,
            detalhes: "Verifique os logs do servidor"
        });
    }
});

// Rota PDF
app.post("/gerar-pdf", async (req, res) => {
    console.log("📄 Rota /gerar-pdf chamada");
    console.log("📦 Dados recebidos:", req.body);

    try {
        const { roteiro, pontos } = req.body;

        if (!roteiro || !pontos || !Array.isArray(pontos)) {
            return res.status(400).json({ erro: "Dados do roteiro inválidos" });
        }

        const doc = new PDFDocument({ margin: 50 });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="roteiro-viagem-${Date.now()}.pdf"`);
        
        doc.pipe(res);

        doc.fontSize(20)
           .font('Helvetica-Bold')
           .fillColor('#1e3a8a')
           .text('🗺️ Roteiro de Viagem - TripMaker', { align: 'center' });
        
        doc.moveDown(0.5);
        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#000000')
           .text(`Data de criação: ${roteiro.data || new Date().toLocaleString('pt-BR')}`)
           .text(`Total do roteiro: ${roteiro.total || 'R$ 0,00'}`)
           .text(`Quantidade de pontos: ${pontos.length}`);

        doc.moveDown(0.5);
        doc.moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .strokeColor('#1e3a8a')
           .lineWidth(1)
           .stroke();

        doc.moveDown(1);

        doc.font('Helvetica-Bold')
           .fillColor('#ffffff')
           .rect(50, doc.y, 500, 25)
           .fill('#1e3a8a');
        
        doc.text('#', 60, doc.y - 15);
        doc.text('Nome', 80, doc.y - 15);
        doc.text('Categoria', 250, doc.y - 15);
        doc.text('Valor', 450, doc.y - 15);

        doc.moveDown(2);

        pontos.forEach((ponto, index) => {
            if (doc.y > 700) {
                doc.addPage();
            }

            if (index % 2 === 0) {
                doc.rect(50, doc.y - 10, 500, 25)
                   .fill('#f8fafc');
            }

            doc.font('Helvetica')
               .fillColor('#000000')
               .text((index + 1).toString(), 60, doc.y);
            
            doc.text(ponto.nome || 'Não informado', 80, doc.y, { width: 150 });
            doc.text(ponto.categoria || 'Geral', 250, doc.y, { width: 150 });
            doc.text(ponto.valor || 'sem custo', 450, doc.y, { width: 80 });

            doc.moveDown(0.3);
            doc.font('Helvetica-Oblique')
               .fontSize(10)
               .fillColor('#4b5563')
               .text(ponto.descricao || 'Descrição não disponível', 80, doc.y, { width: 420 });
            
            doc.font('Helvetica')
               .fontSize(12)
               .fillColor('#000000');

            doc.moveDown(1.2);

            if (index < pontos.length - 1) {
                doc.moveTo(50, doc.y - 5)
                   .lineTo(550, doc.y - 5)
                   .strokeColor('#e5e7eb')
                   .lineWidth(0.5)
                   .stroke();
                doc.moveDown(0.5);
            }
        });

        const totalPages = doc.bufferedPageRange().count;
        for (let i = 0; i < totalPages; i++) {
            doc.switchToPage(i);
            
            doc.fontSize(10)
               .fillColor('#6b7280')
               .text(
                   `Página ${i + 1} de ${totalPages} - Gerado por TripMaker`, 
                   50, 
                   800, 
                   { align: 'center', width: 500 }
               );
        }

        doc.end();
        console.log("✅ PDF gerado com sucesso");

    } catch (err) {
        console.error("❌ Erro ao gerar PDF:", err);
        if (!res.headersSent) {
            res.status(500).json({ 
                erro: "Falha ao gerar PDF",
                detalhes: err.message 
            });
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando em http://localhost:${PORT}`));
