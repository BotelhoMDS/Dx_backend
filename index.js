const express = require("express");
const { Client } = require('pg');
const cors = require("cors");
const bodyparser = require("body-parser");
const config = require("./config");


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

app.post("/usuarios", (req, res) => {
    try {
        console.log("Alguém enviou um post com os dados:", req.body);
        const { nome, email, cpf, senha, dashboard, servicos  } = req.body;
        client.query(
            "INSERT INTO clientes (nome, email, cpf, senha, dashboard, servicos) VALUES ($1, $2, $3, $4, $5, $6) RETURNING * ", [nome, email, cpf, senha, dashboard, servicos],
            (err, result) => {
                if (err) {
                    return console.error("Erro ao executar a qry de INSERT", err);
                }
                const { id } = result.rows[0];
                res.setHeader("id", `${id}`);
                res.status(201).json(result.rows[0]);
                console.log(result);
            }
        );
    } catch (erro) {
        console.error(erro);
    }
});
app.post("/login", (req, res) => {
    const { nome, senha } = req.body;
    client.query(
        "SELECT * FROM clientes WHERE nome = $1 AND senha = $2", [nome, senha],
        (err, result) => {
            if (err) {
                return res.status(500).send("Erro ao executar a qry de SELECT");
            }
            if (result.rows.length > 0) {
                res.status(200).json(result.rows[0]);
            } else {
                res.status(401).send("Login ou senha incorretos");
            }
        }
    );
});

app.listen(config.port, () =>
    console.log("Servidor funcionando na porta " + config.port)
);