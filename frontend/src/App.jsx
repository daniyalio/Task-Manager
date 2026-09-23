import { useEffect, useState } from "react";

function App() {
  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/tasks")
      .then((response) => response.json())
      .then((data) => setTasks(data));
  }, []);

  async function addTask() {
    const response = await fetch("http://localhost:5000/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: task
      })
    });

    const newTask = await response.json();

    setTasks((currentTasks) => [...currentTasks, newTask]);
    setTask("");
  }

  async function deleteTask(id) {
    await fetch(`http://localhost:5000/tasks/${id}`, {
      method: "DELETE"
    });

    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== id)
    );
  }

  async function toggleTask(id) {
    const response = await fetch(`http://localhost:5000/tasks/${id}`, {
      method: "PATCH"
    });

    const updatedTask = await response.json();

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === id ? updatedTask : task
      )
    );
  }

  return (
    <div>
      <h1>Task Manager</h1>

      <input
        type="text"
        value={task}
        onChange={(e) => setTask(e.target.value)}
      />

      <button onClick={addTask}>Add</button>

      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            <span onClick={() => toggleTask(task.id)}>
              {task.completed ? "☑" : "☐"} {task.title}
            </span>

            <button onClick={() => deleteTask(task.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;