const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');

// Configuração do Express
const app = express();
const port = 3001; // Altere para 3000, se necessário

// Configuração do MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Coloque seu usuário do MySQL
    password: 'Abdul', // Coloque sua senha do MySQL
    database: 'reprografia'
});

// Conexão com o MySQL e verificação de erros
db.connect(err => {
    if (err) {
        console.error('Erro de conexão com o banco de dados:', err);
        throw err;
    }
    console.log('Conectado ao banco de dados');
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Rota para a página inicial
app.get('/', (req, res) => {
    res.render('index');
});

// Rota para adicionar um novo serviço
app.post('/adicionar', (req, res) => {
    const { tipo_servico, designacao, quantidade, preco_unitario, data } = req.body;

    if (!tipo_servico || !designacao || !quantidade || !preco_unitario || !data) {
        return res.status(400).send("Todos os campos são obrigatórios!");
    }

    const preco_total = quantidade * preco_unitario;
    const query = `INSERT INTO ?? (designacao, quantidade, preco_unitario, preco_total, data) VALUES (?, ?, ?, ?, ?)`;

    db.query(query, [tipo_servico, designacao, quantidade, preco_unitario, preco_total, data], (err) => {
        if (err) {
            console.error("Erro ao adicionar serviço:", err);
            return res.status(500).send("Erro ao salvar o serviço no banco de dados.");
        }
        res.redirect('/');
    });
});

// Rota para registrar gastos
app.post('/registrar-gasto', (req, res) => {
    const { tipo_gasto, descricao, valor, data } = req.body;

    if (!tipo_gasto || !descricao || !valor || !data) {
        return res.status(400).send("Todos os campos são obrigatórios!");
    }

    const query = `INSERT INTO gastos_diarios (tipo_gasto, descricao, valor, data) VALUES (?, ?, ?, ?)`;

    db.query(query, [tipo_gasto, descricao, valor, data], (err) => {
        if (err) {
            console.error("Erro ao registrar gasto:", err.message);  // Exibe a mensagem do erro
            return res.status(500).send("Erro ao registrar gasto no banco de dados.");
        }
        res.redirect('/');
    });
});


// Rota para gerar relatório de todos os dados (serviços e gastos)
app.get('/relatorio', (req, res) => {
    const { data_inicio, data_fim } = req.query;

    if (!data_inicio || !data_fim) {
        return res.status(400).send("Por favor, forneça as datas de início e fim.");
    }
    if (new Date(data_inicio) > new Date(data_fim)) {
        return res.status(400).send("A data de início não pode ser posterior à data de fim.");
    }

    const queryServicos = `
        SELECT tipo_servico, SUM(quantidade) AS total_quantidade, SUM(preco_total) AS total_valor
        FROM (
            SELECT 'copias' AS tipo_servico, quantidade, preco_total FROM copias WHERE data BETWEEN ? AND ?
            UNION ALL
            SELECT 'impressoes', quantidade, preco_total FROM impressoes WHERE data BETWEEN ? AND ?
            UNION ALL
            SELECT 'scanner', quantidade, preco_total FROM scanner WHERE data BETWEEN ? AND ?
            UNION ALL
            SELECT 'plastificacao', quantidade, preco_total FROM plastificacao WHERE data BETWEEN ? AND ?
            UNION ALL
            SELECT 'encadeacao', quantidade, preco_total FROM encadeacao WHERE data BETWEEN ? AND ?
            UNION ALL
            SELECT 'digitacao', quantidade, preco_total FROM digitacao WHERE data BETWEEN ? AND ?
            UNION ALL
            SELECT 'vendas', quantidade, preco_total FROM vendas WHERE data BETWEEN ? AND ?
            UNION ALL
            SELECT 'compras', quantidade, preco_total FROM compras WHERE data BETWEEN ? AND ?
        ) AS all_services
        GROUP BY tipo_servico
    `;

    const queryGastos = `
        SELECT descricao, SUM(valor) AS total_gasto
        FROM gastos_diarios
        WHERE data BETWEEN ? AND ?
        GROUP BY descricao
    `;

    const parametrosServicos = Array(16).fill([data_inicio, data_fim]).flat();
    const parametrosGastos = [data_inicio, data_fim];

    // Consultando dados de serviços
    db.query(queryServicos, parametrosServicos, (err, resultsServicos) => {
        if (err) {
            console.error("Erro na consulta SQL (Serviços):", err);
            return res.status(500).send("Erro ao gerar relatório de serviços.");
        }

        // Consultando dados de gastos
        db.query(queryGastos, parametrosGastos, (err, resultsGastos) => {
            if (err) {
                console.error("Erro na consulta SQL (Gastos):", err);
                return res.status(500).send("Erro ao gerar relatório de gastos.");
            }

            // Passando as variáveis corretas para o EJS
            res.render('relatorio', { 
                resultsServicos, 
                resultsGastos,  // Esta variável contém os dados dos gastos diários
                data_inicio, 
                data_fim 
            });
        });
    });
});


// Inicialização do servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
