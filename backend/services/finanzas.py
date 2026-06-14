import time
import requests

VALOR_UF_FALLBACK = 38000
_uf_cache = {"value": VALOR_UF_FALLBACK, "timestamp": 0}


def obtener_valor_uf():
    now = time.time()
    if now - _uf_cache["timestamp"] > 3600:
        try:
            resp = requests.get("https://mindicador.cl/api/uf", timeout=10)
            data = resp.json()
            serie = data.get("serie", [])
            if serie:
                _uf_cache["value"] = serie[0].get("valor", VALOR_UF_FALLBACK)
                _uf_cache["timestamp"] = now
        except Exception:
            pass
    return round(_uf_cache["value"], 0)


def calcular_limite_uf(ingresos_totales):
    return (ingresos_totales / 625) + 200
