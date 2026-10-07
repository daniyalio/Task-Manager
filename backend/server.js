const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const port = 5000;

// The frontend runs on port 5173 during development.
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

const database = new Pool({
  user: "postgres",
  host: "localhost",
  database: "task_manager",
  password: "danpostgre",
  port: 5432
});

app.get("/", (request, response) => {
  response.send("Task Manager Backend is working!");
});

app.get("/tasks", async (request, response) => {
  const result = await database.query("SELECT * FROM tasks ORDER BY id");
  response.json(result.rows);
});

app.post("/tasks", async (request, response) => {
  const title = request.body.title;

  if (!title || !title.trim()) {
    return response.status(400).send("A task title is required");
  }

  const result = await database.query(
    "INSERT INTO tasks (title) VALUES ($1) RETURNING *",
    [title.trim()]
  );

  response.json(result.rows[0]);
});

app.patch("/tasks/:id", async (request, response) => {
  const taskId = Number(request.params.id);
  const completed = request.body.completed;

  // When completed is not supplied, keep the old click-to-toggle behavior.
  if (completed === undefined) {
    const result = await database.query(
      "UPDATE tasks SET completed = NOT completed WHERE id = $1 RETURNING *",
      [taskId]
    );

    if (result.rows.length === 0) {
      return response.status(404).send("Task not found");
    }

    return response.json(result.rows[0]);
  }

  if (typeof completed !== "boolean") {
    return response.status(400).send("completed must be true or false");
  }

  const result = await database.query(
    "UPDATE tasks SET completed = $1 WHERE id = $2 RETURNING *",
    [completed, taskId]
  );

  if (result.rows.length === 0) {
    return response.status(404).send("Task not found");
  }

  response.json(result.rows[0]);
});

app.delete("/tasks/:id", async (request, response) => {
  const taskId = Number(request.params.id);
  const result = await database.query(
    "DELETE FROM tasks WHERE id = $1 RETURNING *",
    [taskId]
  );

  if (result.rows.length === 0) {
    return response.status(404).send("Task not found");
  }

  response.json(result.rows[0]);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
