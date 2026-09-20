const express = require("express");

const app = express();

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
        completed: false,
    }
    tasks.push(newTask);
    res.json(newTask);
});

app.patch("/tasks/:id", (req,res) => {
    const id = Number(req.params.id);
    const task = tasks.find((task) => task.id === id);

    if(!task){
        return res.status(404).send("Task not found");
    }

    task.completed = !task.completed;
    res.json(tasks);
})

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