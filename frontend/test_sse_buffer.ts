function testBuffer() {
  const chunks = [
    "data: Olá,",
    " tudo bem?\n\ndata:  Isso ",
    "é ",
    "um te",
    "ste.\n\ndata: [DONE]\n\n"
  ];
  
  let buffer = "";
  const result: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const isDone = i === chunks.length - 1;
    buffer += chunks[i];
    
    const lines = buffer.split("\n");
    if (!isDone) {
      buffer = lines.pop() || "";
    } else {
      buffer = "";
    }
    
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data.trim() === "[DONE]") {
          result.push("[DONE]");
        } else {
          result.push(data);
        }
      }
    }
  }
  
  console.log("Result:", result.join(""));
}

testBuffer();
