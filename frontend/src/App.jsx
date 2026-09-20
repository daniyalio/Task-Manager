import { useEffect, useState } from "react";

function App() {
  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/tasks")
      .then((response) => response.json())
      .then((data) => setTasks(data));
  }, []);

  return (
    <div>
      <h1>Task Manager</h1>

      <input
        type="text"
        value={task}
        onChange={(e) => setTask(e.target.value)}
      />

      <button>Add</button>

      <ul>
        {tasks.map((task, index) => (
          <li key={index}>
            <span>
              {task.completed ? "☑" : "☐"} {task.title}
            </span>

            <button>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;