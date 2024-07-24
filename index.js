const express = require("express");
const { Client } = require('pg');
const cors = require("cors");
const bodyparser = require("body-parser");
const config = require("./config");
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt'); // Importa bcrypt

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyparser.json());


var conString = config.urlConnection;
var client = new Client(conString);
client.connect(function (err) {
    if (err) {
        return console.error('Não foi possível conectar ao banco.', err);
    }
    client.query('SELECT NOW()', function (err, result) {
        if (err) {
            return console.error('Erro ao executar a query.', err);
        }
        console.log(result.rows[0]);
    });
});


app.get("/", (req, res) => {
    console.log("Response ok.");
    res.send("Ok – Servidor disponível.");
});

app.get("/usuarios", (req, res) => {
    try {
        client.query("SELECT * FROM clientes", function
            (err, result) {
            if (err) {
                return console.error("Erro ao executar a qry de SELECT", err);
            }
            res.send(result.rows);
            console.log("Rota: get clientes");
        });
    } catch (error) {
        console.log(error);
    }
});

app.get("/usuarios/:id", (req, res) => {
    try {
        console.log("Rota: usuarios/" + req.params.id);
        client.query(
            "SELECT * FROM clientes WHERE id = $1", [req.params.id],
            (err, result) => {
                if (err) {
                    return console.error("Erro ao executar a qry de SELECT id", err);
                }
                res.send(result.rows);
                //console.log(result);
            }
        );
    } catch (error) {
        console.log(error);
    }
});

app.post(
    "/usuarios",
    // Validação e sanitização
    body('nome').isString().trim().escape().notEmpty().withMessage('Nome é obrigatório'),
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('cpf').isLength({ min: 11, max: 11 }).withMessage('CPF deve ter 11 caracteres').isNumeric().withMessage('CPF deve conter apenas números'),
    body('senha').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),


    async (req, res) => {
        try {
            // Verifica erros de validação
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            // Coleta e sanitiza dados
            const { nome, email, cpf, senha } = req.body;

            // Hash da senha
            const hashedPassword = await bcrypt.hash(senha, 10);

            // Inserção no banco de dados
            client.query(
                "INSERT INTO clientes (nome, email, cpf, senha, dashboard, servicos) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
                [nome, email, cpf, hashedPassword, false, false],
                (err, result) => {
                    if (err) {
                        console.error("Erro ao executar a query de INSERT", err);
                        return res.status(500).json({ error: 'Erro ao salvar os dados no banco de dados' });
                    }
                    const { id } = result.rows[0];
                    res.setHeader("id", `${id}`);
                    res.status(201).json(result.rows[0]);
                    console.log(result);
                }
            );
        } catch (erro) {
            console.error(erro);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
);
app.post("/login", (req, res) => {
    const { nome, senha } = req.body;

    // Verifica se o nome e a senha foram fornecidos
    if (!nome || !senha) {
        return res.status(400).send("Nome e senha são obrigatórios");
    }

    // Busca o usuário no banco de dados
    client.query(
        "SELECT * FROM clientes WHERE nome = $1",
        [nome],
        async (err, result) => {
            if (err) {
                console.error("Erro ao executar a query de SELECT", err);
                return res.status(500).send("Erro ao executar a query de SELECT");
            }

            if (result.rows.length === 0) {
                return res.status(401).send("Nome ou senha incorretos");
            }

            const user = result.rows[0];
            const senhaHashada = user.senha;

            // Verifica a senha fornecida com a senha hashada
            try {
                const senhaCorreta = await bcrypt.compare(senha, senhaHashada);

                if (senhaCorreta) {
                    res.status(200).json(user);
                } else {
                    res.status(401).send("Nome ou senha incorretos");
                }
            } catch (error) {
                console.error("Erro ao comparar a senha", error);
                res.status(500).send("Erro interno do servidor");
            }
        }
    );
});

app.listen(config.port, () =>
    console.log("Servidor funcionando na porta " + config.port)
);

module.exports = app;