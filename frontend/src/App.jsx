import { useState } from "react";

function App() {
  const [task, setTask] = useState("");

  return (
    <div>
      <h1>Task Manager</h1>

      <input
        type="text"
        value={task}
        onChange={(e) => setTask(e.target.value)}
      />

      <button>Add</button>
    </div>
  );
}

export default App;