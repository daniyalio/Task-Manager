# Task Manager Developer Guide

This guide explains the JavaScript changes made for voice commands. It focuses only on the code changed or added for the voice-enabled task manager.

The CSS files are intentionally not explained here:

- `frontend/src/App.css`
- `frontend/src/index.css`

## Recommended reading order

Read the files in this order:

1. `frontend/src/voiceCommand.js` — converts spoken sentences into simple commands.
2. `backend/server.js` — receives the frontend requests and changes the database.
3. `frontend/src/App.jsx` — connects the microphone, command parser, user interface, and backend.

The data flow is:

```text
User speaks
    -> App.jsx receives speech text
    -> voiceCommand.js identifies the action and title
    -> App.jsx calls the correct API endpoint
    -> server.js changes PostgreSQL
    -> App.jsx updates the visible task list
```

## 1. `frontend/src/voiceCommand.js`

This file has no React code and does not call the backend. Its only job is to convert speech into this shape:

```js
{
  action: "add" | "complete" | "delete",
  title: "the task title"
}
```

### Lines 1–8: cleaning speech

- **Line 1:** A comment explains that speech will be made consistent before it is checked.
- **Line 2:** Exports the `cleanSpeech` function so `App.jsx` can use it indirectly through the parser.
- **Line 3:** Starts returning a changed version of the supplied text.
- **Line 4:** Converts uppercase letters to lowercase. This means `Exercise` and `exercise` can be compared equally.
- **Line 5:** Removes punctuation that is not a letter, number, space, apostrophe, or hyphen. This prevents a period or question mark from breaking command matching.
- **Line 6:** Replaces several spaces with one space. Speech recognition can sometimes return extra spaces.
- **Line 7:** Removes spaces at the beginning and end of the sentence.
- **Line 8:** Closes the `cleanSpeech` function.

### Lines 10–13: starting the parser

- **Lines 10–11:** Comments explain that the parser returns a command object or `null`.
- **Line 12:** Exports the `parseVoiceCommand` function. `App.jsx` calls this function after speech recognition returns text.
- **Line 13:** Cleans the original speech and stores the result in `text`.

### Lines 15–21: adding tasks

- **Line 15:** Checks whether the sentence begins with `add `.
- **Line 16:** Returns an add command. `substring(4)` removes the four characters in `add ` and keeps the task title.
- **Line 17:** Closes the first condition.
- **Line 19:** Checks for the longer phrase `create task `.
- **Line 20:** Returns the same `add` action and removes the first twelve characters to keep only the title.
- **Line 21:** Closes the second condition.

Examples:

```text
add exercise             -> { action: "add", title: "exercise" }
create task buy groceries -> { action: "add", title: "buy groceries" }
```

### Lines 23–34: completing tasks

- **Line 23:** Checks for the phrase `complete `.
- **Line 24:** Returns a `complete` command and removes the word `complete` from the title.
- **Line 25:** Closes the condition.
- **Line 27:** Checks for the alternative phrase `finish `.
- **Line 28:** Returns a `complete` command for that alternative wording.
- **Line 29:** Closes the condition.
- **Line 31:** Checks for commands that begin with `mark ` and end with ` as done`.
- **Line 32:** Removes `mark ` from the beginning and ` as done` from the end.
- **Line 33:** Returns the extracted title as a `complete` command.
- **Line 34:** Closes the condition.

Examples:

```text
complete exercise       -> { action: "complete", title: "exercise" }
finish exercise         -> { action: "complete", title: "exercise" }
mark exercise as done   -> { action: "complete", title: "exercise" }
```

### Lines 36–44: deleting tasks and rejecting unknown speech

- **Line 36:** Checks for the command `delete `.
- **Line 37:** Returns a `delete` command with the remaining words as the title.
- **Line 38:** Closes the condition.
- **Line 40:** Checks for the alternative word `remove `.
- **Line 41:** Returns the same `delete` action for that alternative.
- **Line 42:** Closes the condition.
- **Line 44:** Returns `null` when no supported command matched. The app then displays an instruction instead of changing data.
- **Line 45:** Closes the parser function.

## 2. `backend/server.js`

This file is the Express API. The database table is still called `tasks`, and the existing endpoints remain available.

### Lines 1–6: importing packages and configuring the server

- **Line 1:** Loads Express, which creates the web server.
- **Line 2:** Loads CORS, which allows the frontend on port 5173 to call this backend.
- **Line 3:** Loads PostgreSQL's connection pool.
- **Line 5:** Creates the Express application.
- **Line 6:** Stores the backend port in a named variable instead of repeating the number.

### Lines 8–18: middleware and database connection

- **Line 8:** Explains why the CORS setting uses port 5173.
- **Line 9:** Allows requests from the Vite frontend.
- **Line 10:** Tells Express to read JSON request bodies, such as `{ "completed": true }`.
- **Line 12:** Creates a reusable PostgreSQL connection pool.
- **Lines 13–17:** Provide the PostgreSQL username, host, database name, password, and port.
- **Line 18:** Finishes the database configuration.

### Lines 20–22: backend health check

- **Line 20:** Creates a GET endpoint for `/`.
- **Line 21:** Sends a simple message proving that the backend is running.
- **Line 22:** Closes the endpoint.

### Lines 24–27: loading tasks

- **Line 24:** Creates the GET `/tasks` endpoint.
- **Line 25:** Reads every task from PostgreSQL in ID order.
- **Line 26:** Sends the database rows back as JSON.
- **Line 27:** Closes the endpoint.

### Lines 29–42: creating a task

- **Line 29:** Creates the POST `/tasks` endpoint.
- **Line 30:** Reads the title sent by the frontend.
- **Lines 32–34:** Reject an empty or whitespace-only title with HTTP 400.
- **Line 36:** Starts the SQL insert query.
- **Line 37:** Inserts the title and returns the newly created row. `$1` is a safe SQL parameter placeholder.
- **Line 38:** Supplies the trimmed title for `$1`.
- **Line 39:** Finishes the query call.
- **Line 41:** Sends the new task back to the frontend.
- **Line 42:** Closes the endpoint.

### Lines 44–76: changing completion state

- **Line 44:** Creates the PATCH `/tasks/:id` endpoint.
- **Line 45:** Converts the URL ID from text into a number.
- **Line 46:** Reads the optional `completed` value from the request body.
- **Line 48:** Documents the backward-compatible toggle behavior.
- **Line 49:** Checks whether no explicit completion value was supplied.
- **Lines 50–53:** Toggle the current database value using `NOT completed`.
- **Lines 55–57:** Return HTTP 404 when the requested task does not exist.
- **Line 59:** Return the updated task and leave the endpoint early.
- **Line 60:** Closes the old toggle branch.
- **Lines 62–64:** Reject values other than the Boolean values `true` and `false`.
- **Lines 66–69:** Set `completed` to the exact value supplied by the frontend. This is important for voice commands because completing an already completed task must not accidentally uncomplete it.
- **Lines 71–73:** Return HTTP 404 when the task ID was not found.
- **Line 75:** Send the updated task as JSON.
- **Line 76:** Closes the PATCH endpoint.

The explicit voice request looks like this:

```http
PATCH /tasks/12
Content-Type: application/json

{ "completed": true }
```

### Lines 78–90: deleting a task

- **Line 78:** Creates the DELETE `/tasks/:id` endpoint.
- **Line 79:** Converts the URL ID into a number.
- **Lines 80–83:** Deletes that task and returns the deleted database row.
- **Lines 85–87:** Return HTTP 404 when no task has that ID.
- **Line 89:** Sends the deleted task back to the frontend.
- **Line 90:** Closes the endpoint.

### Lines 92–94: starting the server

- **Line 92:** Starts listening on the configured port.
- **Line 93:** Prints the server address in the terminal.
- **Line 94:** Closes the startup code.

## 3. `frontend/src/App.jsx`

This is the main React component. It handles typed tasks, voice recognition, command execution, and screen updates.

### Lines 1–12: imports and small helper functions

- **Line 1:** Imports React hooks. `useState` stores screen data, `useEffect` runs loading and cleanup code, and `useRef` stores values that must survive renders without causing a render.
- **Line 2:** Imports the command parser.
- **Line 3:** Imports the application stylesheet. CSS is not explained in this guide.
- **Line 5:** Stores the backend base URL in one place.
- **Line 7:** Defines a browser compatibility helper.
- **Line 8:** Uses the standard browser name when available, or the WebKit name used by Chrome and Edge.
- **Line 9:** Closes the helper.
- **Line 11:** Starts a helper that compares two task titles.
- **Line 12:** Trims and lowercases both titles before comparing them.
- **Line 13:** Closes the helper.

### Lines 15–28: React state and references

- **Line 15:** Starts the `App` component.
- **Line 16:** Stores the text in the typed task input.
- **Line 17:** Stores all tasks shown in the list.
- **Line 18:** Stores either `push` or `automatic` voice mode.
- **Line 19:** Stores whether voice input is idle, listening, or in an error state.
- **Line 20:** Stores the latest recognized sentence.
- **Line 21:** Stores feedback shown to the user.
- **Line 22:** Stores duplicate-title matches that need a selection.
- **Line 24:** Explains why refs are used for asynchronous speech callbacks.
- **Line 25:** Holds the current browser recognition object.
- **Line 26:** Holds the latest task list for speech callbacks.
- **Line 27:** Tells automatic mode whether it should start another recognition session.
- **Line 28:** Detects whether the current browser supports speech recognition.

### Lines 30–43: keeping task data current and cleanup

- **Lines 30–32:** Copy the latest React task list into `tasksRef` whenever tasks change. This prevents an old speech callback from reading an old task list.
- **Line 34:** Starts an effect that runs once when the component loads.
- **Line 35:** Loads tasks from the backend.
- **Lines 37–42:** Define cleanup code. Automatic mode is disabled and the microphone session is aborted when the component is removed.
- **Line 43:** The empty dependency list means this effect runs once.

### Lines 45–54: loading tasks

- **Line 45:** Starts the asynchronous `loadTasks` function.
- **Line 46:** Starts error handling.
- **Line 47:** Requests all tasks from the backend.
- **Line 48:** Treats a non-success HTTP response as an error.
- **Line 49:** Converts the response body from JSON into JavaScript data.
- **Line 50:** Places the tasks into React state.
- **Lines 51–53:** Show an error message if the backend cannot be reached.
- **Line 54:** Closes the function.

### Lines 56–84: adding tasks

- **Line 56:** Starts the shared task-creation function used by typing and voice.
- **Lines 57–61:** Send the title to POST `/tasks` as JSON.
- **Line 63:** Reject failed API responses.
- **Line 65:** Read the new task returned by the backend.
- **Line 66:** Add the new task to the visible list.
- **Line 67:** Clear the typed input.
- **Line 68:** Show a confirmation message.
- **Line 69:** Closes task creation.
- **Line 71:** Starts the typed-add handler.
- **Line 72:** Removes accidental spaces from the input.
- **Lines 74–77:** Reject an empty typed task.
- **Lines 79–83:** Call the shared create function and show an error if it fails.
- **Line 84:** Closes the typed-add handler.

### Lines 86–128: deleting tasks

- **Line 86:** Starts the handler for the Delete button next to one task.
- **Lines 87–89:** Send DELETE `/tasks/:id`.
- **Lines 91–94:** Show an error and stop if the API fails.
- **Lines 96–97:** Remove the deleted task from the screen and show confirmation.
- **Line 98:** Closes the single-task delete function.
- **Line 100:** Starts the voice delete function.
- **Lines 101–103:** Find every task whose title exactly matches the spoken title, ignoring case and outer spaces.
- **Lines 105–108:** Tell the user when there is no matching task.
- **Line 110:** Explains why deletion is performed one task at a time.
- **Line 111:** Loops over every matching task.
- **Lines 112–114:** Sends a DELETE request for the current matching task.
- **Lines 116–118:** Stop and report an error if any deletion fails.
- **Line 119:** Closes the loop.
- **Line 121:** Creates a simple list of deleted IDs.
- **Lines 122–124:** Remove all deleted tasks from React state.
- **Line 126:** Chooses singular or plural wording.
- **Line 127:** Shows how many tasks were deleted.
- **Line 128:** Closes the voice delete function.

### Lines 130–163: completion behavior

- **Line 130:** Starts a function that sets completion explicitly.
- **Lines 131–135:** Send PATCH `/tasks/:id` with `{ completed: true }` or `{ completed: false }`.
- **Line 137:** Reject failed API responses.
- **Line 139:** Read the updated task.
- **Lines 140–142:** Replace the old task with the updated task in the visible list.
- **Line 143:** Closes the function.
- **Line 145:** Starts the click-to-toggle handler.
- **Line 146:** Find the clicked task.
- **Line 147:** Do nothing if it no longer exists.
- **Lines 149–153:** Reverse the current completion value and handle errors.
- **Line 154:** Closes the toggle handler.
- **Line 156:** Starts the voice completion function.
- **Lines 157–162:** Explicitly mark the selected task as completed and show success or failure.
- **Line 163:** Closes the function.

### Lines 165–201: executing parsed voice commands

- **Line 165:** Starts the command execution function.
- **Line 166:** Passes the recognized sentence to `voiceCommand.js`.
- **Lines 168–171:** Explain unknown commands and stop without changing data.
- **Lines 173–176:** Reject commands that have no task title.
- **Lines 178–181:** Create a task for an add command.
- **Lines 183–187:** Delete all exact title matches for a delete command.
- **Lines 189–191:** Find exact title matches for completion.
- **Lines 193–194:** Report a missing task.
- **Lines 195–196:** Complete the only matching task.
- **Lines 197–200:** Show buttons when multiple tasks have the same title so the user can choose safely.
- **Line 201:** Closes command execution.

### Lines 203–212: stopping voice input

- **Line 203:** Starts the stop function.
- **Line 204:** Prevents automatic mode from starting another session.
- **Lines 206–208:** Stop the active browser recognition session.
- **Line 210:** Update the UI to idle.
- **Line 211:** Closes the function.

### Lines 213–275: one browser recognition session

- **Line 213:** Starts a function that creates one recognition session.
- **Line 214:** Gets the browser's speech recognition constructor.
- **Lines 215–216:** Stop safely when speech recognition is unavailable.
- **Line 217:** Documents the important Chrome/Edge fix: use a new object after each session ends.
- **Line 218:** Creates a fresh recognition object.
- **Line 219:** Stores it in the ref.
- **Line 220:** Sets English recognition.
- **Line 221:** Uses one phrase per session. Automatic mode starts a new session afterward.
- **Line 222:** Requests final results instead of interim partial results.
- **Line 224:** Creates a flag for duplicate-result protection.
- **Line 226:** Runs when the microphone session successfully starts.
- **Line 227:** Shows the listening state.
- **Lines 228–230:** Display different feedback for automatic and push-to-talk modes.
- **Line 231:** Closes the start callback.
- **Line 233:** Runs when the browser returns speech text.
- **Line 234:** Ignore later result events for the same session.
- **Line 235:** Mark this session as already processed.
- **Line 237:** Read the recognized sentence.
- **Line 238:** Show the sentence in the interface.
- **Line 239:** Send the sentence to the command parser and executor.
- **Line 240:** Closes the result callback.
- **Line 242:** Runs when the browser reports a recognition error.
- **Line 243:** Ignore the expected error caused by intentionally stopping recognition.
- **Lines 245–246:** Prevent automatic restarting and show an error state for real errors.
- **Lines 248–249:** Give a specific microphone-permission message.
- **Lines 250–252:** Show the browser's actual error code for other failures.
- **Line 253:** Closes the error callback.
- **Line 255:** Runs when the browser ends this session, including after silence.
- **Line 256:** Explains why automatic mode creates another session.
- **Line 257:** Checks that automatic mode is still on and that this is still the active recognition object.
- **Line 258:** Waits briefly before restarting to give Chrome or Edge time to finish cleanup.
- **Line 259:** Checks again in case the user clicked Stop during the delay.
- **Line 260:** Creates a completely new recognition object.
- **Line 261:** Closes the delayed callback.
- **Line 262:** Finishes the short delay.
- **Lines 263–265:** If automatic mode is off, show the idle state.
- **Line 266:** Closes the end callback.
- **Line 268:** Starts error handling around `recognition.start()`.
- **Line 269:** Ask the browser to begin listening.
- **Lines 270–274:** Handle browsers that reject starting the microphone and show a useful message.
- **Line 275:** Closes the session function.

### Lines 277–296: choosing voice mode

- **Line 277:** Starts the public start function used by the button.
- **Line 278:** Do nothing when unsupported or already listening.
- **Line 280:** Remember whether the selected mode is automatic.
- **Line 281:** Clear the previous transcript.
- **Line 282:** Start the first recognition session.
- **Line 283:** Closes the start function.
- **Line 285:** Starts the button toggle handler.
- **Lines 286–290:** Stop if listening; otherwise start listening.
- **Line 291:** Closes the toggle handler.
- **Line 293:** Starts the mode-selector handler.
- **Line 294:** Stop the current session before changing mode.
- **Line 295:** Store the selected mode.
- **Line 296:** Closes the mode handler.

### Lines 298–370: user interface

- **Line 298:** Begins the JSX returned by the component.
- **Lines 299–300:** Create the main page wrapper and heading.
- **Lines 302–312:** Render the typed task input and Add button. Enter also adds the task.
- **Lines 314–332:** Render the voice mode selector and Start/Stop button.
- **Lines 315–319:** Connect the label and selector to the `voiceMode` state.
- **Lines 320–323:** Disable mode changes while the microphone is active and show the two available modes.
- **Lines 325–331:** Start or stop voice input when the button is clicked.
- **Lines 334–340:** Show browser support information, the latest transcript, and status messages.
- **Lines 342–354:** Show task choices when completion matched multiple tasks with the same title.
- **Lines 356–365:** Render every task, allow clicking its title to toggle completion, and provide a Delete button.
- **Lines 367–368:** Close the returned JSX and the `App` component.
- **Line 370:** Export `App` so `main.jsx` can render it.

## Supported voice commands

| Spoken command | Result |
|---|---|
| `add exercise` | Creates `exercise` |
| `create task buy groceries` | Creates `buy groceries` |
| `complete exercise` | Completes the exact matching task |
| `finish exercise` | Completes the exact matching task |
| `mark exercise as done` | Completes the exact matching task |
| `delete exercise` | Deletes every exact matching task |
| `remove exercise` | Deletes every exact matching task |

## How to run the project

Start the backend in one terminal:

```powershell
cd backend
node server.js
```

Start the frontend in another terminal:

```powershell
cd frontend
npm run dev
```

Use Chrome or Edge and open the Vite address shown in the terminal, normally `http://localhost:5173`.
