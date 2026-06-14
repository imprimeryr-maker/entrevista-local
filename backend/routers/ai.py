import base64
import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

from backend.database import get_cliente, get_proyectos as db_get_proyectos
from backend.models import MatchingRequest, ChatRequest, AnalizarPDFRequest
import os

from backend.services.ai_service import (
    generar_recomendacion_inicial,
    chat_stream_generator,
    analizar_proyecto_por_nombre,
    generar_descripcion_con_ai,
    analizar_pdf_con_ai,
    analizar_cotizacion_con_ai,
    extraer_cotizaciones_de_pdf,
    verificar_api_key,
    get_token_usage,
    get_token_limits,
    get_token_limit_for,
    get_next_reset_utc,
    reset_token_usage,
    get_active_provider,
    get_active_tier,
    set_active_config,
    get_available_providers,
    backup_github,
    BACKUP_LOG_FILE,
)
from backend.services.pdf_utils import extraer_texto_pdf
from backend.services.web_utils import buscar_en_web

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.get("/status")
def status():
    return {"ok": verificar_api_key()}


@router.post("/recomendar")
def recomendar(body: MatchingRequest):
    cliente = get_cliente(body.cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    proyectos = db_get_proyectos()
    if body.proyecto_ids:
        proyectos = [p for p in proyectos if p["id"] in body.proyecto_ids]

    resultado = generar_recomendacion_inicial(cliente, proyectos)
    if not resultado:
        raise HTTPException(status_code=500, detail="Error al conectar con el proveedor AI")
    return {"recomendacion": resultado}


@router.post("/chat-stream")
def chat_stream(body: ChatRequest):
    cliente = get_cliente(body.cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    proyectos = db_get_proyectos()

    from backend.services.finanzas import obtener_valor_uf, calcular_limite_uf

    ingresos = cliente.get("ingresos", {})
    total_ingresos_brutos = sum(ingresos.values())
    deudas = cliente.get("deudas", [])
    total_descuento = sum(d.get("cuota", 0) for d in deudas if d.get("descontar"))
    total_ingresos_netos = max(0, total_ingresos_brutos - total_descuento)
    limite_uf = calcular_limite_uf(total_ingresos_netos)

    contexto = f"""DATOS DEL CLIENTE:
- Nombre: {cliente.get('nombre', 'N/A')}
- Profesión: {cliente.get('profesion', 'N/A')}
- Objetivo: {cliente.get('objetivo', 'N/A')}
- Estrategia: {cliente.get('sub_objetivo', 'N/A')}

INGRESOS: ${total_ingresos_brutos:,}/mes
DESCUENTO DEUDAS: ${total_descuento:,}/mes
INGRESOS NETOS: ${total_ingresos_netos:,}/mes
LÍMITE UF: {limite_uf:,.2f} UF
AHORRO PIE: ${cliente.get('capacidad_inversion', {}).get('ahorro_pie', 0):,}
CAM: ${cliente.get('capacidad_inversion', {}).get('cam', 0):,}

PROYECTOS DISPONIBLES:
"""
    for p in proyectos:
        precio = p.get("precio_uf", 0)
        contexto += f"- {p['nombre']}: {precio:,.2f} UF {'✅' if precio <= limite_uf else '❌'}\n"

    messages = [
        {"role": "system", "content": f"Contexto:\n{contexto}\n\nResponde en español como asesor inmobiliario."},
        *body.messages,
    ]

    return EventSourceResponse(chat_stream_generator(messages))


@router.post("/analizar-pdf")
def analizar_pdf(body: AnalizarPDFRequest):
    try:
        file_bytes = base64.b64decode(body.contenido_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Base64 inválido")

    texto = extraer_texto_pdf(file_bytes)
    if texto.startswith("Error"):
        raise HTTPException(status_code=400, detail=texto)

    descripcion = analizar_pdf_con_ai(body.nombre, texto)
    return {"texto": texto, "descripcion": descripcion}


@router.post("/buscar-proyecto")
def buscar_proyecto(body: dict):
    nombre = body.get("nombre", "")
    if not nombre:
        raise HTTPException(status_code=400, detail="Nombre requerido")

    contexto_web, resultados = analizar_proyecto_por_nombre(nombre)
    descripcion = generar_descripcion_con_ai(nombre, contexto_web or "")
    return {
        "contexto_web": contexto_web,
        "resultados_web": resultados,
        "descripcion": descripcion,
    }


@router.post("/analizar-cotizaciones")
def analizar_cotizaciones(body: dict):
    nombre_proyecto = body.get("nombre_proyecto", "") or "Proyecto"
    cotizaciones = body.get("cotizaciones", {})
    resultado = analizar_cotizacion_con_ai(nombre_proyecto, cotizaciones)
    return {"analisis": resultado}


@router.post("/extraer-cotizaciones-pdf")
def extraer_cotizaciones_pdf(body: dict):
    contenido_base64 = body.get("contenido_base64", "")
    if not contenido_base64:
        raise HTTPException(status_code=400, detail="contenido_base64 requerido")
    try:
        file_bytes = base64.b64decode(contenido_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Base64 inválido")
    texto = extraer_texto_pdf(file_bytes)
    if texto.startswith("Error"):
        raise HTTPException(status_code=400, detail=texto)
    resultado = extraer_cotizaciones_de_pdf(texto)
    return resultado


@router.post("/extraer-cotizacion-de-pdf")
def extraer_cotizacion_de_pdf(body: dict):
    tipo = body.get("tipo", "")
    contenido_base64 = body.get("contenido_base64", "")
    if not contenido_base64:
        raise HTTPException(status_code=400, detail="contenido_base64 requerido")
    try:
        file_bytes = base64.b64decode(contenido_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Base64 inválido")
    texto = extraer_texto_pdf(file_bytes)
    if texto.startswith("Error"):
        raise HTTPException(status_code=400, detail=texto)
    resultado = extraer_cotizaciones_de_pdf(texto)
    cot = (resultado.get("cotizaciones") or {}).get(tipo) or {}
    return {"precio": cot.get("precio", 0), "detalles": cot.get("detalles", ""), "pdf_texto": texto[:3000]}


@router.get("/uf")
def get_uf():
    from backend.services.finanzas import obtener_valor_uf
    return {"valor": obtener_valor_uf()}


@router.get("/token-usage")
def token_usage():
    provider = get_active_provider()
    tier = get_active_tier()
    return {
        "usage": get_token_usage(),
        "limits": get_token_limits(),
        "active_limit": get_token_limit_for(provider, tier),
        "active_provider": provider,
        "active_tier": tier,
        "next_reset_utc": get_next_reset_utc(provider),
    }


@router.post("/token-usage/reset")
def token_usage_reset():
    reset_token_usage()
    return {"ok": True}


@router.get("/config")
def get_config():
    return {
        "provider": get_active_provider(),
        "tier": get_active_tier(),
        "available_providers": get_available_providers(),
    }


@router.post("/config")
def set_config(body: dict):
    provider = body.get("provider")
    tier = body.get("tier")
    if provider and provider not in ("groq", "openrouter", "gemini", "aurelius"):
        raise HTTPException(status_code=400, detail="Proveedor inválido")
    if tier and tier not in ("super", "nano"):
        raise HTTPException(status_code=400, detail="Tier inválido")
    set_active_config(provider=provider, tier=tier)
    return {"ok": True, "provider": get_active_provider(), "tier": get_active_tier()}


@router.post("/config/check-key")
def check_key(body: dict):
    provider = body.get("provider", get_active_provider())
    return {"ok": verificar_api_key(provider)}


@router.post("/backup/github")
def backup_github_endpoint(body: dict = {}):
    mensaje = body.get("mensaje")
    ok, msg = backup_github(mensaje)
    return {"ok": ok, "mensaje": msg}


@router.get("/backup/log")
def backup_log():
    try:
        if os.path.exists(BACKUP_LOG_FILE):
            with open(BACKUP_LOG_FILE, "r", encoding="utf-8") as f:
                return {"log": f.read()}
        return {"log": ""}
    except Exception as e:
        return {"log": "", "error": str(e)}
