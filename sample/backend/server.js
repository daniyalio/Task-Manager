const { Pool } = require("pg");
const express = require('express');
const cors = require("cors")

const app = express();

const pool = new Pool(
    {
        user: "postgres",
        host: "localhost",
        database: "tm",
        password: "danpostgre",
        port: 5432
    }
)

pool.query("SELECT 1").then(result => {
    console.log(result.rows);
})
    .catch(error => {
        console.log(error);
    });

app.use(cors());
app.use(express.json())

app.get("/", (req, res) => {
    res.send("Task Manager api is working");
})

app.post("/tasks", async (req, res) => {
    const { title } = req.body;

    const result = await pool.query(
        "INSERT INTO tasks (title) VALUES ($1) RETURNING *",
        [title]
    )

    res.json(result.rows[0]);
   /* .then(result => {
        res.json(result.rows[0]);
    })
    */
});

app.listen(5000, () => {
    console.log("Server is running on the port 5000");

})