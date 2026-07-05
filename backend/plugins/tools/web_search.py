import httpx
from core.tools import register_tool
from app.config import settings

@register_tool("web_search")
class WebSearchTool:
    name: str = "web_search"
    description: str = "Realiza buscas na internet para obter informações atualizadas sobre qualquer assunto."
    parameters: dict = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "O termo ou pergunta a ser pesquisado na web."
            }
        },
        "required": ["query"]
    }

    async def run(self, query: str, **kwargs) -> str:
        if not settings.TAVILY_API_KEY:
            return "Erro: TAVILY_API_KEY não configurada no servidor."

        url = "https://api.tavily.com/search"
        payload = {
            "api_key": settings.TAVILY_API_KEY,
            "query": query,
            "search_depth": "basic",
            "max_results": 5
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()
            except Exception as e:
                return f"Erro ao realizar busca web: {e}"

        results = data.get("results", [])
        if not results:
            return "Nenhum resultado encontrado."

        output = []
        for i, res in enumerate(results, 1):
            title = res.get("title", "Sem título")
            content = res.get("content", "Sem conteúdo")
            url = res.get("url", "#")
            output.append(f"{i}. {title}\n{content}\nFonte: {url}\n")
        
        return "\n".join(output)
