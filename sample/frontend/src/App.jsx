import { useState } from "react";

function App() {
  const [task, setTask] = useState("");

  async function addTask() {
    const response = await fetch("http://localhost:5000/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: task
      })
    })

    const newTask = await response.json();
    console.log(newTask);
    setTask("");
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
    </div>
  );
}

export default App;