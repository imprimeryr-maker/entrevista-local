from pydantic import BaseModel
from typing import Optional


class Ingresos(BaseModel):
    renta: float = 0
    dividendos: float = 0
    pensiones: float = 0
    arriendos: float = 0


class CapacidadInversion(BaseModel):
    ahorro_pie: float = 0
    cam: float = 0


class Deuda(BaseModel):
    tipo: str = ""
    institucion: str = ""
    cuota: float = 0
    total: float = 0
    nro_cuota: int = 0
    descontar: bool = False


class Activo(BaseModel):
    nombre: str = ""
    tipo: Optional[str] = None
    valor: float = 0


class Cuenta(BaseModel):
    tipo: str = ""
    banco: str = ""
    institucion: Optional[str] = None


class ProyectoCreate(BaseModel):
    nombre: str
    descripcion: str = ""
    fuente: str = "web"
    detalles_web: str = ""
    pdf_content: str = ""
    precio_uf: float = 0
    etiquetas: list[str] = []


class ProyectoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    precio_uf: Optional[float] = None
    etiquetas: Optional[list[str]] = None
    cotizaciones: Optional[dict] = None
    analisis_cotizaciones: Optional[str] = None


class ClienteCreate(BaseModel):
    nombre: str
    telefono: str = ""
    correo: str = ""
    rut: str = ""
    estado_civil: str = ""
    profesion: str = ""
    objetivo: str = ""
    sub_objetivo: Optional[str] = None
    direccion: str = ""
    ingresos: Ingresos = Ingresos()
    capacidad_inversion: CapacidadInversion = CapacidadInversion()
    deudas: list[Deuda] = []
    activos: list[Activo] = []
    cuentas: list[Cuenta] = []


class ClienteUpdate(BaseModel):
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[str] = None
    rut: Optional[str] = None
    estado_civil: Optional[str] = None
    profesion: Optional[str] = None
    objetivo: Optional[str] = None
    sub_objetivo: Optional[str] = None
    direccion: Optional[str] = None
    ingresos: Optional[Ingresos] = None
    capacidad_inversion: Optional[CapacidadInversion] = None
    deudas: Optional[list[Deuda]] = None
    activos: Optional[list[Activo]] = None
    cuentas: Optional[list[Cuenta]] = None


class PromocionCreate(BaseModel):
    proyecto_id: str
    nombre_proyecto: str
    mes: str
    descripcion_promocion: str
    archivo_original: str = ""


class PromocionUpdate(BaseModel):
    mes: Optional[str] = None
    descripcion_promocion: Optional[str] = None


class MatchingRequest(BaseModel):
    cliente_id: str
    proyecto_ids: Optional[list[str]] = None


class ChatRequest(BaseModel):
    cliente_id: str
    messages: list[dict]


class AnalizarPDFRequest(BaseModel):
    nombre: str
    contenido_base64: str


class AnalizarExcelRequest(BaseModel):
    nombre_mes: str
    contenido_base64: str
