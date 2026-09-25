import { useState } from "react";

function App() {
  const [task, setTask] = useState("");
  const [tasks, setTasks] = useState([]);

  function addTask() {
    if (task.trim() === "") {
      return;
    }

    const newTask = {
      title: task,
      completed: false
    };

    setTasks((currentTasks) => [...currentTasks, newTask]);
    setTask("");
  }

  function toggleTask(index) {
    setTasks((currentTasks) =>
      currentTasks.map((task, i) =>
        i === index
          ? { ...task, completed: !task.completed }
          : task
      )
    );
  }

  function deleteTask(index) {
    setTasks((currentTasks) =>
      currentTasks.filter((_, i) => i !== index)
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
        {tasks.map((task, index) => (
          <li key={index}>
            <span onClick={() => toggleTask(index)}>
              {task.completed ? "☑" : "☐"} {task.title}
            </span>

            <button onClick={() => deleteTask(index)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;