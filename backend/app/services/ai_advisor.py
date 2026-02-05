import logging
from datetime import datetime
from typing import Optional

import google.generativeai as genai

from app.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "Eres un asesor financiero familiar. Responde en espanol simple, sin moral ni juicio.\n"
    "Formato esperado:\n"
    "- Analisis breve (1-2 frases)\n"
    "- Recomendacion suave (1 linea)\n"
    "- Riesgos o alternativas (1-2 lineas)\n"
    "Si falta informacion critica, haz 1 pregunta al final.\n"
    "No inventes datos."
)


class GeminiAdvisor:
    def __init__(self, api_key: str, model_name: Optional[str] = None):
        if not api_key:
            raise ValueError("Missing GEMINI_API_KEY")
        genai.configure(api_key=api_key)
        self.model_name = model_name or settings.gemini_model or self._resolve_model()
        self.model = genai.GenerativeModel(self.model_name)
        logger.info("GeminiAdvisor initialized with model %s", self.model_name)

    def _resolve_model(self) -> str:
        preferred = [
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-1.0-pro",
            "gemini-pro"
        ]
        try:
            models = genai.list_models()
            candidates = []
            for m in models or []:
                name = getattr(m, "name", "")
                methods = getattr(m, "supported_generation_methods", []) or []
                if not name or "generateContent" not in methods:
                    continue
                candidates.append(name.split("/", 1)[-1])
            for p in preferred:
                if p in candidates:
                    return p
            if candidates:
                return candidates[0]
        except Exception as exc:
            logger.warning("Could not list Gemini models: %s", exc)
        return preferred[0]

    def answer(self, question: str, context: Optional[str] = None) -> str:
        question = (question or "").strip()
        if not question:
            raise ValueError("Question is required")
        context_text = context.strip() if context else "Sin contexto disponible."
        prompt = (
            f"{SYSTEM_PROMPT}\n\n"
            f"CONTEXTO:\n{context_text}\n\n"
            f"PREGUNTA:\n{question}\n"
        )
        result = self.model.generate_content(prompt)
        text = (result.text or "").strip()
        return text or "No pude generar una respuesta en este momento."

    def generate_observation(self, title: str, impact: str, context: str, evidence: Optional[str] = None) -> str:
        prompt = (
            "Redacta una observacion IA breve y descriptiva (maximo 2 frases). "
            "Debe ser neutral, sin moral y con bajo impacto emocional. "
            f"Impacto: {impact}.\n"
            f"Titulo: {title}\n"
            f"Contexto:\n{context}\n"
        )
        if evidence:
            prompt += f"Evidencia: {evidence}\n"
        result = self.model.generate_content(prompt)
        text = (result.text or "").strip()
        return text or title

    def generate_pattern(self, title: str, context: str, evidence: Optional[str] = None) -> str:
        prompt = (
            "Redacta un patron IA breve (maximo 2 frases). "
            "Debe describir una repeticion o tendencia, sin juicio moral. "
            f"Titulo: {title}\n"
            f"Contexto:\n{context}\n"
        )
        if evidence:
            prompt += f"Evidencia: {evidence}\n"
        result = self.model.generate_content(prompt)
        text = (result.text or "").strip()
        return text or title

    def simulate_idea(
        self,
        title: str,
        category: Optional[str],
        cost: Optional[float],
        horizon_months: Optional[int],
        tco_total: Optional[float],
        context: str
    ) -> str:
        cost_text = f"Costo estimado: {cost}." if cost else "Costo estimado: no definido."
        horizon_text = f"Horizonte: {horizon_months} meses." if horizon_months else "Horizonte: no definido."
        tco_text = f"TCO: {tco_total}." if tco_total else "TCO: no definido."
        cat_text = f"Categoria: {category}." if category else "Categoria: no definida."
        prompt = (
            "Simula rapidamente el impacto de una idea para un hogar. "
            "Responde en 3 lineas: (1) Impacto mensual estimado, (2) Riesgo principal, (3) Ajuste recomendado. "
            "No inventes datos si faltan.\n"
            f"Idea: {title}\n{cat_text}\n{cost_text}\n{horizon_text}\n{tco_text}\n"
            f"Contexto:\n{context}\n"
        )
        result = self.model.generate_content(prompt)
        text = (result.text or "").strip()
        return text or "Simulacion no disponible."


_ADVISOR: Optional[GeminiAdvisor] = None


def get_advisor() -> GeminiAdvisor:
    global _ADVISOR
    if _ADVISOR is None:
        _ADVISOR = GeminiAdvisor(settings.gemini_api_key)
    return _ADVISOR


def format_context(summary: Optional[dict], extra: Optional[str] = None) -> str:
    lines = []
    now = datetime.utcnow().strftime("%Y-%m")
    lines.append(f"Mes actual: {now}.")
    if summary:
        spending = summary.get("spending_zone", {})
        if spending.get("label"):
            lines.append(f"Zona de gasto: {spending.get('label')}.")
        month_overview = summary.get("month_overview", {})
        if month_overview:
            income = month_overview.get("income_total", 0)
            commitments = month_overview.get("commitments_total", 0)
            events_mandatory = month_overview.get("events_mandatory_total", 0)
            optional_budget = month_overview.get("optional_budget", 0)
            lines.append(
                f"Ingresos: {income}. Compromisos: {commitments}. "
                f"Eventos obligatorios: {events_mandatory}. Disponible opcional: {optional_budget}."
            )
        dist = summary.get("distribution_real", {})
        if dist:
            ox = dist.get("oxigeno", 0)
            vida = dist.get("vida", 0)
            blindaje = dist.get("blindaje", 0)
            lines.append(f"Distribucion real: Oxigeno {ox}%, Vida {vida}%, Blindaje {blindaje}%.")
    if extra:
        extra_clean = extra.strip()
        if extra_clean:
            lines.append(f"Contexto extra: {extra_clean}")
    return "\n".join(lines)
