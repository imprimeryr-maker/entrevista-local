from duckduckgo_search import DDGS


def buscar_en_web(query, max_resultados=5):
    try:
        with DDGS() as ddgs:
            resultados = []
            for r in ddgs.text(query, max_results=max_resultados):
                resultados.append({
                    "titulo": r.get("title", r.get("titulo", "")),
                    "snippet": r.get("body", r.get("snippet", "")),
                    "url": r.get("href", r.get("url", "")),
                })
            return resultados
    except Exception as e:
        return [{"error": f"Error al buscar: {str(e)}"}]
