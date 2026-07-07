import asyncio
import os
from core.protocol import Message
from plugins.providers.ollama_cloud import OllamaCloud
from plugins.tools.web_search import WebSearchTool

async def main():
    provider = OllamaCloud()
    messages = [Message(role="user", content="qual a cotação do dólar hoje")]
    tools = [WebSearchTool()]
    
    print("Testing stream_with_tools...")
    async for chunk in provider.stream_with_tools(messages, tools):
        print(chunk, end="", flush=True)
    print("\nDone.")

if __name__ == "__main__":
    asyncio.run(main())
