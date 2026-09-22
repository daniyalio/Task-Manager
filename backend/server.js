const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "task_manager",
  password: "danpostgre",
  port: 5432
});

app.get("/", (req, res) => {
  res.send("Task Manager Backend is working!");
});

app.get("/tasks", async (req, res) => {
  const result = await pool.query("SELECT * FROM tasks ORDER BY id");

  res.json(result.rows);
});

app.post("/tasks", async (req, res) => {
  const result = await pool.query(
    "INSERT INTO tasks (title) VALUES ($1) RETURNING *",
    [req.body.title]
  );

  res.json(result.rows[0]);
});

app.patch("/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);

  const result = await pool.query(
    "UPDATE tasks SET completed = NOT completed WHERE id = $1 RETURNING *",
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).send("Task not found");
  }

  res.json(result.rows[0]);
});

app.delete("/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);

  const result = await pool.query(
    "DELETE FROM tasks WHERE id = $1 RETURNING *",
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).send("Task not found");
  }

  res.json(result.rows[0]);
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});





/*
const express = require("express");
const cors = require("cors"); // Allow the frontend development server to call this API.

const app = express();

app.use(cors({ origin: "http://localhost:5173" })); // Permit requests from the Vite frontend.
app.use(express.json());

const tasks = [
  {
    id: 1,
    title: "Learn React",
    completed: false
  },
  {
    id: 2,
    title: "Learn Express",
    completed: true
  }
];

app.get("/", (req, res) => {
  res.send("Task Manager Backend is working!");
});

app.get("/tasks", (req, res) => {
  res.json(tasks);
});

app.post("/tasks", (req, res) => {
  const newTask = {
    id: tasks.length + 1,
    title: req.body.title,
    completed: false
  };

  tasks.push(newTask);

  res.json(newTask);
});

app.patch("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);

  const task = tasks.find((task) => task.id === id);

  if (!task) {
    return res.status(404).send("Task not found");
  }

  task.completed = !task.completed;

  res.json(task);
});

app.delete("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);

  const taskIndex = tasks.findIndex((task) => task.id === id);

  if (taskIndex === -1) {
    return res.status(404).send("Task not found");
  }

  const deletedTask = tasks.splice(taskIndex, 1);

  res.json(deletedTask);
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
*/