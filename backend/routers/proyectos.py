from fastapi import APIRouter, HTTPException
from backend.database import (
    get_proyectos as db_get_proyectos,
    get_proyecto as db_get_proyecto,
    create_proyecto as db_create_proyecto,
    update_proyecto as db_update_proyecto,
    delete_proyecto as db_delete_proyecto,
)
from backend.models import ProyectoCreate, ProyectoUpdate

router = APIRouter(prefix="/api/proyectos", tags=["proyectos"])


@router.get("")
def listar_proyectos():
    return db_get_proyectos()


@router.get("/{proyecto_id}")
def obtener_proyecto(proyecto_id: str):
    p = db_get_proyecto(proyecto_id)
    if not p:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return p


@router.post("")
def crear_proyecto(body: ProyectoCreate):
    return db_create_proyecto(
        nombre=body.nombre,
        descripcion=body.descripcion,
        fuente=body.fuente,
        detalles_web=body.detalles_web,
        pdf_content=body.pdf_content,
        precio_uf=body.precio_uf,
        etiquetas=body.etiquetas,
    )


@router.put("/{proyecto_id}")
def actualizar_proyecto(proyecto_id: str, body: ProyectoUpdate):
    existing = db_get_proyecto(proyecto_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    kwargs = {k: v for k, v in body.model_dump().items() if v is not None}
    if kwargs:
        db_update_proyecto(proyecto_id, **kwargs)
    return db_get_proyecto(proyecto_id)


@router.delete("/{proyecto_id}")
def eliminar_proyecto(proyecto_id: str):
    existing = db_get_proyecto(proyecto_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    db_delete_proyecto(proyecto_id)
    return {"ok": True}
