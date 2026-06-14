import json
import os
from collections import defaultdict
from datetime import datetime

from openai import OpenAI
from dotenv import load_dotenv

from backend.database import get_promociones as db_get_promociones, DATA_DIR
from backend.services.finanzas import obtener_valor_uf, calcular_limite_uf
from backend.services.web_utils import buscar_en_web

load_dotenv()

TOKEN_USAGE_PATH = os.path.join(DATA_DIR, "token_usage.json")
CONFIG_PATH = os.path.join(DATA_DIR, "config.json")
TOKEN_LIMITS = {
    "groq": {
        "super": 1_000_000,
        "nano": 5_000_000,
    },
    "openrouter": {
        "super": 500_000,
        "nano": 2_000_000,
    },
    "gemini": {
        "super": 1_500_000,
        "nano": 1_500_000,
    },
    "aurelius": {
        "super": 99_000_000,
        "nano": 99_000_000,
    },
}

RESET_HOUR_UTC = {
    "groq": 0,
    "openrouter": 0,
    "gemini": 7,
    "aurelius": 0,
}

PROVIDERS = {
    "openrouter": {
        "name": "OpenRouter (Nemotron 3)",
        "base_url": "https://openrouter.ai/api/v1",
        "api_key_env": "OPENROUTER_API_KEY",
        "models": {
            "nano": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
            "super": "nvidia/nemotron-3-super-120b-a12b:free",
        },
        "headers": {
            "HTTP-Referer": "https://consultor-inmobiliario.app",
            "X-Title": "RyR Consultor Inmobiliario",
        },
    },
    "groq": {
        "name": "Groq (LLaMA 3)",
        "base_url": "https://api.groq.com/openai/v1",
        "api_key_env": "GROQ_API_KEY",
        "models": {
            "nano": "llama-3.1-8b-instant",
            "super": "llama-3.3-70b-versatile",
        },
        "headers": {},
    },
    "gemini": {
        "name": "Gemini (Google)",
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "api_key_env": "GEMINI_API_KEY",
        "models": {
            "nano": "gemini-2.5-flash",
            "super": "gemini-2.5-flash",
        },
        "headers": {},
    },
    "aurelius": {
        "name": "Aurelius (OpenClaw)",
        "base_url": os.getenv("OPENCLAW_BASE_URL", "http://127.0.0.1:18789/v1"),
        "api_key_env": "OPENCLAW_AUTH_TOKEN",
        "models": {
            "nano": "openclaw:aurelius",
            "super": "openclaw:aurelius",
        },
        "headers": {},
    },
}

BACKUP_LOG_FILE = os.path.join(DATA_DIR, "backup_log.txt")


def _load_json(path, default):
    try:
        with open(path, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def _save_json(path, data):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, ensure_ascii=False)


# ========== TOKEN USAGE ==========

def _load_token_usage():
    return _load_json(TOKEN_USAGE_PATH, {"prompt": 0, "completion": 0, "total": 0})


def _save_token_usage(usage):
    _save_json(TOKEN_USAGE_PATH, usage)


def _acumular_usage(response):
    if hasattr(response, 'usage') and response.usage:
        usage = _load_token_usage()
        usage["prompt"] += response.usage.prompt_tokens or 0
        usage["completion"] += response.usage.completion_tokens or 0
        usage["total"] += response.usage.total_tokens or 0
        _save_token_usage(usage)


def get_token_usage():
    return _load_token_usage()


def get_token_limits():
    return TOKEN_LIMITS


def get_token_limit_for(provider=None, tier=None):
    provider = provider or get_active_provider()
    tier = tier or get_active_tier()
    limits = TOKEN_LIMITS.get(provider, TOKEN_LIMITS["groq"])
    return limits.get(tier, limits.get("super", 1_000_000))


def get_next_reset_utc(provider=None):
    provider = provider or get_active_provider()
    reset_hour = RESET_HOUR_UTC.get(provider, 0)
    now = datetime.utcnow()
    next_reset = now.replace(hour=reset_hour, minute=0, second=0, microsecond=0)
    if now >= next_reset:
        next_reset = next_reset.replace(day=next_reset.day + 1)
    return next_reset.isoformat()


def reset_token_usage():
    _save_token_usage({"prompt": 0, "completion": 0, "total": 0})


# ========== CONFIGURACIÓN DINÁMICA ==========

def _get_config():
    return _load_json(CONFIG_PATH, {"provider": "groq", "tier": "super"})


def _set_config(cfg):
    _save_json(CONFIG_PATH, cfg)


def get_active_provider():
    return _get_config().get("provider", "groq")


def get_active_tier():
    return _get_config().get("tier", "super")


def set_active_config(provider=None, tier=None):
    cfg = _get_config()
    if provider:
        cfg["provider"] = provider
    if tier:
        cfg["tier"] = tier
    _set_config(cfg)


def get_available_providers():
    result = {}
    for key, val in PROVIDERS.items():
        if key == "aurelius":
            token = os.getenv("OPENCLAW_AUTH_TOKEN", "")
            configured = bool(token) and token != "tu_api_key_aqui"
        else:
            api_key = os.getenv(val["api_key_env"], "")
            configured = bool(api_key) and api_key != "tu_api_key_aqui"
        result[key] = {
            "name": val["name"],
            "configured": configured,
        }
    return result


# ========== PROVIDER HELPERS ==========

def get_provider_config(provider=None):
    provider = provider or get_active_provider()
    return PROVIDERS.get(provider, PROVIDERS["groq"])


def get_model_for_provider(tier="super", provider=None):
    provider = provider or get_active_provider()
    tier = tier or get_active_tier()
    config = get_provider_config(provider)
    return config["models"].get(tier, config["models"]["super"])


def _get_api_key(provider=None):
    provider = provider or get_active_provider()
    config = get_provider_config(provider)
    return os.getenv(config["api_key_env"], "")


def get_ai_client(provider=None):
    provider = provider or get_active_provider()
    config = get_provider_config(provider)
    api_key = _get_api_key(provider)
    if not api_key or api_key == "tu_api_key_aqui":
        return None
    kwargs = {
        "base_url": config["base_url"],
        "api_key": api_key,
    }
    if config.get("headers"):
        kwargs["default_headers"] = config["headers"]
    return OpenAI(**kwargs)


def verificar_api_key(provider=None):
    provider = provider or get_active_provider()
    if provider == "aurelius":
        token = os.getenv("OPENCLAW_AUTH_TOKEN", "")
        return bool(token) and token != "tu_api_key_aqui"
    api_key = _get_api_key(provider)
    return bool(api_key) and api_key != "tu_api_key_aqui"


# ========== BACKUP / GITHUB ==========

def _guardar_log_backup(mensaje, error=""):
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(BACKUP_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"[{timestamp}] {mensaje}\n")
            if error:
                f.write(f"[{timestamp}] ERROR: {error}\n")
            f.write("-" * 60 + "\n")
    except Exception:
        pass


def _obtener_token_github():
    token = os.getenv("GITHUB_TOKEN")
    if token:
        return token
    return ""


def backup_github(mensaje=None):
    _guardar_log_backup("Iniciando backup vía API...")
    token = _obtener_token_github()
    if not token:
        _guardar_log_backup("Error: GITHUB_TOKEN no configurado")
        return False, "GITHUB_TOKEN no configurado. Agrégala como variable de entorno en Railway."
    repo_url = os.getenv("GITHUB_REPO", "https://github.com/imprimeryr-maker/entrevista-2.0.git")
    parts = repo_url.replace("https://", "").replace("http://", "").replace(".git", "").split("/")
    if len(parts) < 3:
        return False, "No se pudo determinar owner/repo"
    owner, repo = parts[1], parts[2]
    api_base = f"https://api.github.com/repos/{owner}/{repo}/contents"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    import base64, requests
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
    if not os.path.isdir(data_dir):
        _guardar_log_backup("data/ no encontrado")
        return True, "No hay carpeta data/ todavía"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    msg = mensaje or f"Backup automático {timestamp}"
    subidos = 0
    errores = []
    for fname in os.listdir(data_dir):
        fpath = os.path.join(data_dir, fname)
        if not os.path.isfile(fpath):
            continue
        with open(fpath, "rb") as f:
            content_b64 = base64.b64encode(f.read()).decode()
        gh_path = f"data/{fname}"
        try:
            r_get = requests.get(f"{api_base}/{gh_path}", headers=headers)
            sha = ""
            if r_get.status_code == 200:
                sha = r_get.json().get("sha", "")
            body = {"message": msg, "content": content_b64}
            if sha:
                body["sha"] = sha
            r_put = requests.put(f"{api_base}/{gh_path}", headers=headers, json=body)
            if r_put.status_code in (200, 201):
                subidos += 1
            else:
                detalle = r_put.text[:300]
                errores.append(f"{fname}: HTTP {r_put.status_code} - {detalle}")
        except Exception as e:
            errores.append(f"{fname}: {str(e)}")
    resumen = f"Backup completado: {subidos} archivo(s) subido(s)"
    if errores:
        resumen += f", {len(errores)} error(es): {'; '.join(errores)}"
    _guardar_log_backup(resumen)
    if errores and subidos == 0:
        return False, f"Error en backup: {'; '.join(errores)}"
    return True, resumen


def analizar_proyecto_por_nombre(nombre):
    query = f"{nombre} capitalizarme.com"
    resultados = buscar_en_web(query)
    if resultados and len(resultados) > 0 and "error" not in resultados[0]:
        contexto = "Información encontrada en la web:\n\n"
        for i, r in enumerate(resultados, 1):
            contexto += f"{i}. {r['titulo']}\n"
            contexto += f"   {r['snippet']}\n\n"
    else:
        contexto = "No se encontró información en la web sobre este proyecto."
    return contexto, resultados


def generar_descripcion_con_ai(nombre, contexto_web="", tier=None, provider=None):
    client = get_ai_client(provider)
    if not client:
        return None
    tier = tier or get_active_tier()
    system_prompt = (
        "Eres consultor inmobiliario. Genera una ficha breve del proyecto en español, "
        "máximo 3 párrafos: tipo, ubicación, características, precio UF, público objetivo."
    )
    if contexto_web and "No se encontró" not in contexto_web:
        user_prompt = (
            f"Basado en esta búsqueda web, genera una ficha breve del proyecto \"{nombre}\".\n\n"
            f"{contexto_web}\n\nMáximo 3 párrafos."
        )
    else:
        user_prompt = (
            f"Genera una ficha breve y profesional para el proyecto \"{nombre}\". "
            "Indica que la información es preliminar. Máximo 3 párrafos."
        )
    try:
        response = client.chat.completions.create(
            model=get_model_for_provider(tier, provider),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=1500,
        )
        _acumular_usage(response)
        return response.choices[0].message.content
    except Exception as e:
        return f"Error al generar descripción: {str(e)}"


def analizar_pdf_con_ai(nombre, texto_pdf, tier=None, provider=None):
    client = get_ai_client(provider)
    if not client:
        return None
    tier = tier or get_active_tier()
    provider = provider or get_active_provider()
    max_pdf_chars = 6000 if provider == "groq" and tier == "nano" else 10000
    if len(texto_pdf) > max_pdf_chars:
        texto_pdf = texto_pdf[:max_pdf_chars] + "\n\n[... texto truncado por longitud ...]"
    system_prompt = (
        "Eres analista inmobiliario. En español, máximo 3 párrafos: "
        "describe el proyecto, características, precios UF y público objetivo."
    )
    user_prompt = (
        f"Analiza esta presentación del proyecto \"{nombre}\" y genera una ficha breve.\n\n"
        f"--- DOCUMENTO ---\n{texto_pdf}\n--- FIN ---\n\nMáximo 3 párrafos."
    )
    try:
        response = client.chat.completions.create(
            model=get_model_for_provider(tier, provider),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=1000,
        )
        _acumular_usage(response)
        return response.choices[0].message.content
    except Exception as e:
        return f"Error al analizar PDF: {str(e)}"


def analizar_cotizacion_con_ai(nombre_proyecto, cotizaciones, tier=None, provider=None):
    client = get_ai_client(provider)
    if not client:
        return None
    tier = tier or get_active_tier()
    texto_cotizaciones = ""
    for tipo, datos in cotizaciones.items():
        if datos.get('precio', 0) > 0 or datos.get('has_pdf'):
            texto_cotizaciones += f"--- TIPOLOGÍA: {tipo} ---\n"
            if datos.get('precio', 0) > 0:
                texto_cotizaciones += f"Precio base: {datos['precio']} UF\n"
            if datos.get('detalles'):
                texto_cotizaciones += f"Notas: {datos['detalles']}\n"
            if datos.get('has_pdf') and datos.get('pdf_content'):
                pdf_text = datos['pdf_content']
                if len(pdf_text) > 3000:
                    pdf_text = pdf_text[:3000] + "... [truncado]"
                texto_cotizaciones += f"Contenido de la cotización PDF:\n{pdf_text}\n"
            texto_cotizaciones += "\n"
    if not texto_cotizaciones:
        return "No hay cotizaciones suficientes para analizar."
    system_prompt = (
        "Eres analista de inversiones inmobiliarias. En español, máximo 3 párrafos, "
        "compara las tipologías y recomienda la mejor opción."
    )
    user_prompt = (
        f"Analiza estas cotizaciones del proyecto \"{nombre_proyecto}\":\n\n"
        f"{texto_cotizaciones}\n\n"
        "Compara las tipologías y recomienda la mejor inversión. Máximo 3 párrafos."
    )
    try:
        response = client.chat.completions.create(
            model=get_model_for_provider(tier, provider),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=1500,
        )
        _acumular_usage(response)
        return response.choices[0].message.content
    except Exception as e:
        return f"Error al analizar cotizaciones: {str(e)}"


def extraer_cotizaciones_de_pdf(texto_pdf, tier=None, provider=None):
    client = get_ai_client(provider)
    if not client:
        return None
    tier = tier or get_active_tier()
    provider = provider or get_active_provider()
    max_pdf_chars = 6000 if provider == "groq" and tier == "nano" else 10000
    if len(texto_pdf) > max_pdf_chars:
        texto_pdf = texto_pdf[:max_pdf_chars] + "\n\n[...]"
    system_prompt = (
        "Eres asistente inmobiliario. Extrae del texto los precios por tipología "
        "(Studio, 1D1B, 1.5D1B, 2D1B, 2D2B, 3D2B, 3D3B) en UF. "
        "Responde ÚNICAMENTE un JSON con clave 'cotizaciones', "
        "donde cada clave es la tipología (ej. '1D1B') y el valor es { 'precio': <número>, 'detalles': '<texto>' }."
        "Incluye SOLO tipologías que aparezcan en el texto. Si no hay datos, devuelve {\"cotizaciones\": {}}."
    )
    user_prompt = (
        f"Extrae las cotizaciones del siguiente documento inmobiliario:\n\n"
        f"{texto_pdf}\n\nJSON:"
    )
    try:
        kwargs = dict(
            model=get_model_for_provider(tier, provider),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            max_tokens=500,
        )
        if provider in ("groq", "openrouter"):
            kwargs["response_format"] = {"type": "json_object"}
        response = client.chat.completions.create(**kwargs)
        _acumular_usage(response)
        contenido = response.choices[0].message.content
        import re
        match = re.search(r'\{.*\}', contenido, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return {"cotizaciones": {}}
    except Exception as e:
        return {"error": str(e), "cotizaciones": {}}


def generar_recomendacion_inicial(cliente, proyectos, tier="super", provider=None):
    client = get_ai_client(provider)
    if not client:
        return None

    datos_cliente = f"""
DATOS DEL CLIENTE:
- Nombre: {cliente.get('nombre', 'N/A')}
- RUT: {cliente.get('rut', 'N/A')}
- Estado Civil: {cliente.get('estado_civil', 'N/A')}
- Profesión: {cliente.get('profesion', 'N/A')}
- Objetivo: {cliente.get('objetivo', 'N/A')}
- Estrategia: {cliente.get('sub_objetivo', 'N/A') if cliente.get('sub_objetivo') else 'N/A'}

INGRESOS:
- Renta: ${cliente.get('ingresos', {}).get('renta', 0):,}
- Dividendos: ${cliente.get('ingresos', {}).get('dividendos', 0):,}
- Pensiones: ${cliente.get('ingresos', {}).get('pensiones', 0):,}
- Arriendos: ${cliente.get('ingresos', {}).get('arriendos', 0):,}

DEUDAS VIGENTES:
"""
    total_descuento_deudas = 0
    for d in cliente.get('deudas', []):
        desc_info = ""
        if d.get('descontar'):
            total_descuento_deudas += d.get('cuota', 0)
            desc_info = " (SE DESCUENTA DE INGRESOS)"
        datos_cliente += f"- {d.get('tipo', 'N/A')} | {d.get('institucion', 'N/A')} | Cuota: ${d.get('cuota', 0):,}{desc_info} | Total: ${d.get('total', 0):,} | {d.get('nro_cuota', 0)} cuotas\n"

    datos_cliente += "\nACTIVOS:\n"
    for a in cliente.get('activos', []):
        nombre_a = a.get('nombre') or a.get('tipo', 'N/A')
        datos_cliente += f"- {nombre_a}: ${a.get('valor', 0):,}\n"

    datos_cliente += "\nCUENTAS:\n"
    for c in cliente.get('cuentas', []):
        banco_c = c.get('banco') or c.get('institucion', 'N/A')
        datos_cliente += f"- {c.get('tipo', 'N/A')} en {banco_c}\n"

    ingresos = cliente.get('ingresos', {})
    total_ingresos_brutos = sum(ingresos.values())
    total_ingresos_para_calculo = max(0, total_ingresos_brutos - total_descuento_deudas)
    limite_uf = calcular_limite_uf(total_ingresos_para_calculo)

    datos_cliente += f"\nCAPACIDAD DE INVERSIÓN:\n"
    datos_cliente += f"- Ahorro para pie: ${cliente.get('capacidad_inversion', {}).get('ahorro_pie', 0):,}\n"
    datos_cliente += f"- CAM: ${cliente.get('capacidad_inversion', {}).get('cam', 0):,}\n"
    datos_cliente += f"\nLÍMITE DE COMPRA:\n"
    datos_cliente += f"- Ingresos brutos: ${total_ingresos_brutos:,}\n"
    if total_descuento_deudas > 0:
        datos_cliente += f"- Descuento por deudas: -${total_descuento_deudas:,}\n"
    datos_cliente += f"- Ingresos para cálculo: ${total_ingresos_para_calculo:,}\n"
    datos_cliente += f"- Límite máximo en UF: {limite_uf:,.2f} UF\n"
    datos_cliente += f"- Límite máximo en CLP: ${limite_uf * obtener_valor_uf():,.0f}\n\n"

    proyectos_text = "\nPROYECTOS DISPONIBLES:\n\n"
    for p in proyectos:
        precio = p.get('precio_uf', 0)
        etiquetas = p.get('etiquetas', [])
        proyectos_text += f"--- {p['nombre']} ---"
        if etiquetas:
            proyectos_text += f" [🏷️ {', '.join(etiquetas)}]"
        if precio > 0:
            dentro = " ✅ DENTRO DEL PRESUPUESTO" if precio <= limite_uf else " ❌ SOBRE EL PRESUPUESTO"
            proyectos_text += dentro + "\n"
            proyectos_text += f"   Precio: {precio:,.2f} UF (${precio * obtener_valor_uf():,} CLP aprox)\n"
        else:
            proyectos_text += " (Precio no especificado)\n"
        proyectos_text += f"{p['descripcion'][:1000]}...\n"

        cotizaciones = p.get('cotizaciones', {})
        if cotizaciones:
            proyectos_text += "   COTIZACIONES DISPONIBLES:\n"
            for tipo, datos in cotizaciones.items():
                if datos.get('precio', 0) > 0:
                    proyectos_text += f"   - {tipo}: {datos['precio']} UF ({datos.get('detalles', '')})\n"
            if p.get('analisis_cotizaciones'):
                proyectos_text += f"   ANÁLISIS AI COTIZACIONES: {p['analisis_cotizaciones']}\n"
        proyectos_text += "\n"

    promociones_activas = db_get_promociones()
    proyecto_ids = {p_ctx.get("id", "") for p_ctx in proyectos}
    promos_proyecto = [pr for pr in promociones_activas if pr["proyecto_id"] in proyecto_ids]
    if promos_proyecto:
        proyectos_text += "PROMOCIONES ACTIVAS:\n"
        promos_por_mes = defaultdict(list)
        for promo in promos_proyecto:
            promos_por_mes[promo["mes"]].append(promo)
        for mes, promos in sorted(promos_por_mes.items()):
            proyectos_text += f"  [{mes}]\n"
            for promo in promos:
                proyectos_text += f"    - {promo['nombre_proyecto']}: {promo['descripcion_promocion']}\n"
        proyectos_text += "\n"

    system_prompt = (
        "Eres asesor inmobiliario. Responde en español con el siguiente formato:\n\n"
        "**Opción A: [Nombre proyecto]** — [tipología recomendada, ej: 2D2B]\n"
        "- **Por qué:** [razón basada en perfil financiero, etiquetas, y capacidad de pago]\n"
        "- **Precio:** [XX UF - dentro/sobre presupuesto]\n"
        "- **Promociones:** [si aplica, mencionar beneficio]\n"
        "- **Cotizaciones:** [si aplica, detalle por tipología]\n\n"
        "**Opción B: [Nombre proyecto]** — [tipología recomendada]\n"
        "(misma estructura)\n\n"
        "Solo muestra las 3 mejores opciones: Opción A, Opción B y Opción C. "
        "Sé concreto y basado en los datos financieros del cliente.\n\n"
        "REGLAS DE PRIORIDAD:\n"
        "1. Los proyectos cuyas etiquetas coincidan con la estrategia del cliente deben ir PRIMERO.\n"
        "2. Dentro del mismo nivel, prioriza los que estén dentro del presupuesto.\n"
        "3. Si ningún proyecto coincide con etiquetas, prioriza por ajuste financiero."
    )

    user_prompt = (
        f"Cliente:\n{datos_cliente}\n\n{proyectos_text}\n"
        "Recomiéndame los mejores proyectos en formato punteo "
        "(Opción A, Opción B, etc.) indicando tipología, precio, promociones activas, "
        "cotizaciones disponibles, y el motivo de cada recomendación."
    )

    try:
        response = client.chat.completions.create(
            model=get_model_for_provider(tier, provider),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=2000,
        )
        _acumular_usage(response)
        return response.choices[0].message.content
    except Exception as e:
        return f"Error al generar recomendación: {str(e)}"


def chat_stream_generator(messages, tier="super", provider=None):
    client = get_ai_client(provider)
    if not client:
        yield f"data: {json.dumps({'error': 'API Key no configurada'})}\n\n"
        return

    system_prompt = {
        "role": "system",
        "content": (
            "Eres asesor inmobiliario. Responde en español, máximo 3 párrafos, "
            "sé breve y directo. Ayuda al cliente según su perfil financiero y proyectos disponibles."
        ),
    }
    full_messages = [system_prompt] + messages

    try:
        response = client.chat.completions.create(
            model=get_model_for_provider(tier, provider),
            messages=full_messages,
            temperature=0.7,
            max_tokens=2000,
            stream=True,
            stream_options={"include_usage": True},
        )
        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                yield f"data: {json.dumps({'content': chunk.choices[0].delta.content})}\n\n"
            if hasattr(chunk, 'usage') and chunk.usage:
                usage = _load_token_usage()
                usage["prompt"] += chunk.usage.prompt_tokens or 0
                usage["completion"] += chunk.usage.completion_tokens or 0
                usage["total"] += chunk.usage.total_tokens or 0
                _save_token_usage(usage)
        yield "data: [DONE]\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


def analizar_excel_promociones(texto_excel, nombre_mes, tier=None, provider=None):
    client = get_ai_client(provider)
    if not client:
        return None
    tier = tier or get_active_tier()
    if len(texto_excel) > 25000:
        texto_excel = texto_excel[:25000] + "\n\n[... texto truncado ...]"
    system_prompt = """Eres un experto extractor de datos JSON. Tu única misión es transformar filas de Excel en una lista JSON válida.

DATOS A EXTRAER POR FILA:
1. "nombre_proyecto": El valor de la columna "Proyecto".
2. "promocion": Una síntesis de las columnas "Tipología", "Bono Pie", "UpFront", "A.G", "Otras Promos" y "Reserva a $0".

REGLA: Responde EXCLUSIVAMENTE con el bloque JSON. No incluyas explicaciones.

FORMATO:
[
  {"nombre_proyecto": "Nombre", "promocion": "Tipología: ..., Bono Pie: ..., etc."}
]"""
    user_prompt = f"Convierte los datos de la promoción '{nombre_mes}' a JSON:\n\n{texto_excel}"
    try:
        response = client.chat.completions.create(
            model=get_model_for_provider(tier, provider),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.0,
            max_tokens=3000,
        )
        _acumular_usage(response)
        texto = response.choices[0].message.content.strip()
        texto = re.sub(r'```json\s*|```\s*', '', texto).strip()
        match_array = re.search(r'(\[.*\])', texto, re.DOTALL)
        if match_array:
            try:
                return json.loads(match_array.group(1))
            except json.JSONDecodeError:
                pass
            cleaned = re.sub(r',\s*\]', ']', match_array.group(1))
            cleaned = re.sub(r',\s*}', '}', cleaned)
            try:
                return json.loads(cleaned)
            except json.JSONDecodeError:
                pass
        objs = re.findall(r'(\{[^{}]+\})', texto, re.DOTALL)
        if objs:
            recovered_list = []
            for obj_str in objs:
                try:
                    obj_clean = re.sub(r',\s*}', '}', obj_str)
                    recovered_list.append(json.loads(obj_clean))
                except json.JSONDecodeError:
                    continue
            if recovered_list:
                return recovered_list
        return []
    except Exception as e:
        return []
