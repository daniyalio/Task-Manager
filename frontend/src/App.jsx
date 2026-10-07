import { useEffect, useRef, useState } from "react";
import { parseVoiceCommand } from "./voiceCommand";
import "./App.css";

const API_URL = "http://localhost:5000";

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function titlesAreEqual(firstTitle, secondTitle) {
  return firstTitle.trim().toLowerCase() === secondTitle.trim().toLowerCase();
}

function App() {
  const [taskText, setTaskText] = useState("");
  const [tasks, setTasks] = useState([]);
  const [voiceMode, setVoiceMode] = useState("push");
  const [voiceState, setVoiceState] = useState("idle");
  const [lastTranscript, setLastTranscript] = useState("");
  const [message, setMessage] = useState("");
  const [duplicateTasks, setDuplicateTasks] = useState([]);

  // Refs let speech callbacks use the latest tasks and recognition object.
  const recognitionRef = useRef(null);
  const tasksRef = useRef([]);
  const automaticModeRef = useRef(false);
  const speechSupported = Boolean(getSpeechRecognition());

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    loadTasks();

    return () => {
      automaticModeRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  async function loadTasks() {
    try {
      const response = await fetch(`${API_URL}/tasks`);
      if (!response.ok) throw new Error();
      const taskList = await response.json();
      setTasks(taskList);
    } catch {
      setMessage("Unable to load tasks.");
    }
  }

  async function createTask(title) {
    const response = await fetch(`${API_URL}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });

    if (!response.ok) throw new Error("Unable to add the task.");

    const newTask = await response.json();
    setTasks((oldTasks) => [...oldTasks, newTask]);
    setTaskText("");
    setMessage(`Added "${title}".`);
  }

  async function addTypedTask() {
    const title = taskText.trim();

    if (!title) {
      setMessage("Enter a task before adding it.");
      return;
    }

    try {
      await createTask(title);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function removeTask(taskId) {
    const response = await fetch(`${API_URL}/tasks/${taskId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      setMessage("Unable to delete the task.");
      return;
    }

    setTasks((oldTasks) => oldTasks.filter((item) => item.id !== taskId));
    setMessage("Task deleted.");
  }

  async function removeTasksWithTitle(title) {
    const matchingTasks = tasksRef.current.filter((item) =>
      titlesAreEqual(item.title, title)
    );

    if (matchingTasks.length === 0) {
      setMessage(`I could not find a task named "${title}".`);
      return;
    }

    // Delete one matching task at a time so the steps are easy to follow.
    for (const item of matchingTasks) {
      const response = await fetch(`${API_URL}/tasks/${item.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Unable to delete one or more tasks.");
      }
    }

    const matchingIds = matchingTasks.map((item) => item.id);
    setTasks((oldTasks) => oldTasks.filter(
      (item) => !matchingIds.includes(item.id)
    ));

    const taskWord = matchingTasks.length === 1 ? "task" : "tasks";
    setMessage(`Deleted ${matchingTasks.length} ${taskWord} named "${title}".`);
  }

  async function setTaskCompleted(taskId, completed) {
    const response = await fetch(`${API_URL}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed })
    });

    if (!response.ok) throw new Error("Unable to update the task.");

    const updatedTask = await response.json();
    setTasks((oldTasks) => oldTasks.map((item) =>
      item.id === taskId ? updatedTask : item
    ));
  }

  async function toggleTask(taskId) {
    const taskToChange = tasks.find((item) => item.id === taskId);
    if (!taskToChange) return;

    try {
      await setTaskCompleted(taskId, !taskToChange.completed);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function completeOneTask(taskToComplete) {
    try {
      await setTaskCompleted(taskToComplete.id, true);
      setMessage(`"${taskToComplete.title}" completed.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function runVoiceCommand(spokenSentence) {
    const command = parseVoiceCommand(spokenSentence);

    if (!command) {
      setMessage("Try: add exercise, complete exercise, or delete exercise.");
      return;
    }

    if (!command.title) {
      setMessage("Please include a task name in the command.");
      return;
    }

    if (command.action === "add") {
      createTask(command.title).catch((error) => setMessage(error.message));
      return;
    }

    if (command.action === "delete") {
      removeTasksWithTitle(command.title)
        .catch((error) => setMessage(error.message));
      return;
    }

    const matchingTasks = tasksRef.current.filter((item) =>
      titlesAreEqual(item.title, command.title)
    );

    if (matchingTasks.length === 0) {
      setMessage(`I could not find a task named "${command.title}".`);
    } else if (matchingTasks.length === 1) {
      completeOneTask(matchingTasks[0]);
    } else {
      setDuplicateTasks(matchingTasks);
      setMessage(`More than one task is named "${command.title}". Choose one.`);
    }
  }

  function stopListening() {
    automaticModeRef.current = false;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setVoiceState("idle");
  }

  function startOneRecognitionSession() {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    // A new object is required after Chrome or Edge ends a session.
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    let hasProcessedResult = false;

    recognition.onstart = () => {
      setVoiceState("listening");
      setMessage(automaticModeRef.current
        ? "Automatic mode is listening..."
        : "Listening...");
    };

    recognition.onresult = (event) => {
      if (hasProcessedResult) return;
      hasProcessedResult = true;

      const sentence = event.results[0][0].transcript;
      setLastTranscript(sentence);
      runVoiceCommand(sentence);
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted") return;

      automaticModeRef.current = false;
      setVoiceState("error");

      if (event.error === "not-allowed") {
        setMessage("Microphone access was denied. Allow it and try again.");
      } else {
        setMessage(`Speech recognition failed (${event.error}).`);
      }
    };

    recognition.onend = () => {
      // Automatic mode starts a completely new session after every phrase.
      if (automaticModeRef.current && recognitionRef.current === recognition) {
        setTimeout(() => {
          if (automaticModeRef.current) {
            startOneRecognitionSession();
          }
        }, 300);
      } else {
        setVoiceState("idle");
      }
    };

    try {
      recognition.start();
    } catch {
      automaticModeRef.current = false;
      setVoiceState("error");
      setMessage("Could not start the microphone. Please try again.");
    }
  }

  function startListening() {
    if (!speechSupported || voiceState === "listening") return;

    automaticModeRef.current = voiceMode === "automatic";
    setLastTranscript("");
    startOneRecognitionSession();
  }

  function toggleListening() {
    if (voiceState === "listening") {
      stopListening();
    } else {
      startListening();
    }
  }

  function changeVoiceMode(event) {
    if (voiceState === "listening") stopListening();
    setVoiceMode(event.target.value);
  }

  return (
    <main className="app-shell">
      <h1>Task Manager</h1>

      <section className="task-controls">
        <input
          type="text"
          value={taskText}
          onChange={(event) => setTaskText(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && addTypedTask()}
          placeholder="Add a task"
          aria-label="Task title"
        />
        <button onClick={addTypedTask}>Add</button>
      </section>

      <section className="voice-controls" aria-label="Voice controls">
        <label htmlFor="voice-mode">Voice mode:</label>
        <select
          id="voice-mode"
          value={voiceMode}
          onChange={changeVoiceMode}
          disabled={voiceState === "listening"}
        >
          <option value="push">Push-to-talk</option>
          <option value="automatic">Automatic</option>
        </select>
        <button
          type="button"
          onClick={toggleListening}
          disabled={!speechSupported}
        >
          {voiceState === "listening" ? "Stop listening" : "Start voice input"}
        </button>
      </section>

      {!speechSupported && (
        <p className="voice-status">Voice input is not supported in this browser.</p>
      )}
      {lastTranscript && (
        <p className="voice-transcript">Heard: "{lastTranscript}"</p>
      )}
      {message && <p className="voice-status" role="status">{message}</p>}

      {duplicateTasks.length > 0 && (
        <div className="match-picker">
          <p>Select the task to complete:</p>
          {duplicateTasks.map((matchingTask) => (
            <button key={matchingTask.id} onClick={() => {
              completeOneTask(matchingTask);
              setDuplicateTasks([]);
            }}>
              {matchingTask.title} (#{matchingTask.id})
            </button>
          ))}
        </div>
      )}

      <ul className="task-list">
        {tasks.map((item) => (
          <li key={item.id}>
            <button className="task-title" onClick={() => toggleTask(item.id)}>
              {item.completed ? "[done]" : "[ ]"} {item.title}
            </button>
            <button onClick={() => removeTask(item.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </main>
  );
}

export default App;
