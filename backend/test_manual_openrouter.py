import asyncio
import os
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent))

from core.protocol import Message
from plugins.providers.openrouter import OpenRouterProvider
from plugins.tools.web_search import WebSearchTool

async def main():
    provider = OpenRouterProvider()
    messages = [Message(role="user", content="qual a cotação do dólar hoje? me diga brevemente.")]
    tools = [WebSearchTool()]
    
    for i in range(2):
        print(f"\n--- TESTE {i+1} ---")
        try:
            async for chunk in provider.stream_with_tools(messages, tools):
                print(chunk, end="", flush=True)
        except Exception as e:
            print(f"\nError: {e}")
    print("\n--- FIM ---")

if __name__ == "__main__":
    asyncio.run(main())
