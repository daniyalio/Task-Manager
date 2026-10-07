// Convert speech into a predictable form before checking the command.
export function cleanSpeech(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Return an object that tells the app what the user wants to do.
// Return null when the sentence is not one of the commands we support.
export function parseVoiceCommand(speech) {
  const text = cleanSpeech(speech);

  if (text.startsWith("add ")) {
    return { action: "add", title: text.substring(4).trim() };
  }

  if (text.startsWith("create task ")) {
    return { action: "add", title: text.substring(12).trim() };
  }

  if (text.startsWith("complete ")) {
    return { action: "complete", title: text.substring(9).trim() };
  }

  if (text.startsWith("finish ")) {
    return { action: "complete", title: text.substring(7).trim() };
  }

  if (text.startsWith("mark ") && text.endsWith(" as done")) {
    const title = text.substring(5, text.length - 8).trim();
    return { action: "complete", title };
  }

  if (text.startsWith("delete ")) {
    return { action: "delete", title: text.substring(7).trim() };
  }

  if (text.startsWith("remove ")) {
    return { action: "delete", title: text.substring(7).trim() };
  }

  return null;
}
