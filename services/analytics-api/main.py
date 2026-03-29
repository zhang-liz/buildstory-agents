"""
BuildStory Analytics API — FastAPI sidecar for ML-heavy workloads.

Handles persona clustering, conversion modeling, and analytics aggregation
that benefit from Python's ML ecosystem (numpy, scipy, scikit-learn, pandas).

Run:
    pip install -r requirements.txt
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import create_client, Client

app = FastAPI(
    title="BuildStory Analytics API",
    version="0.1.0",
    description="ML-powered analytics sidecar for BuildStory Agents",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "")


def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Missing Supabase env vars")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class PersonaCluster(BaseModel):
    cluster_id: int
    label: str
    size: int
    dominant_traits: list[str]
    conversion_rate: float


class ConversionPrediction(BaseModel):
    story_id: str
    section_key: str
    variant_hash: str
    predicted_conversion_rate: float
    confidence: float
    factors: list[str]


class ExperimentSummary(BaseModel):
    story_id: str
    total_variants: int
    total_trials: int
    best_variant: str
    best_conversion_rate: float
    lift_vs_control: float
    statistical_significance: float


class HealthResponse(BaseModel):
    status: str
    version: str
    supabase_connected: bool


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health", response_model=HealthResponse)
async def health():
    try:
        sb = get_supabase()
        sb.table("stories").select("id").limit(1).execute()
        connected = True
    except Exception:
        connected = False

    return HealthResponse(
        status="healthy" if connected else "degraded",
        version="0.1.0",
        supabase_connected=connected,
    )


@app.get("/api/clusters/{story_id}", response_model=list[PersonaCluster])
async def get_persona_clusters(story_id: str, minutes_back: int = 1440):
    """Cluster visitors by behavior patterns using event data."""
    sb = get_supabase()
    cutoff = (datetime.utcnow() - timedelta(minutes=minutes_back)).isoformat()

    result = sb.table("events").select("*").eq("story_id", story_id).gte("ts", cutoff).execute()
    events = result.data or []

    if len(events) < 5:
        return []

    # Group events by persona
    persona_events: dict[str, list[dict]] = {}
    for e in events:
        p = e.get("persona", "unknown")
        persona_events.setdefault(p, []).append(e)

    clusters: list[PersonaCluster] = []
    for i, (persona, pevents) in enumerate(sorted(persona_events.items(), key=lambda x: -len(x[1]))):
        cta_clicks = sum(1 for e in pevents if e["event"] == "ctaClick")
        views = sum(1 for e in pevents if e["event"] == "view")
        cr = cta_clicks / max(views, 1)

        event_types = set(e["event"] for e in pevents)
        traits = [et for et in ["ctaClick", "dwell", "scrollDepth", "engagement"] if et in event_types]

        clusters.append(
            PersonaCluster(
                cluster_id=i,
                label=persona,
                size=len(pevents),
                dominant_traits=traits[:4],
                conversion_rate=round(cr, 4),
            )
        )

    return clusters[:20]


@app.get("/api/predict/{story_id}/{section_key}", response_model=list[ConversionPrediction])
async def predict_conversions(story_id: str, section_key: str):
    """Predict conversion rates for all variants of a section using bandit state."""
    sb = get_supabase()

    result = (
        sb.table("bandit_state")
        .select("*")
        .eq("story_id", story_id)
        .eq("section_key", section_key)
        .execute()
    )
    states = result.data or []

    if not states:
        raise HTTPException(status_code=404, detail="No bandit states found")

    predictions: list[ConversionPrediction] = []
    for state in states:
        alpha = state["alpha"]
        beta = state["beta"]
        mean = alpha / (alpha + beta)
        variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1))
        trials = alpha + beta - 2

        factors = []
        if trials < 10:
            factors.append("low_sample_size")
        if mean > 0.15:
            factors.append("high_performer")
        if mean < 0.05:
            factors.append("underperformer")
        if variance > 0.01:
            factors.append("high_variance")

        predictions.append(
            ConversionPrediction(
                story_id=story_id,
                section_key=section_key,
                variant_hash=state["variant_hash"],
                predicted_conversion_rate=round(mean, 4),
                confidence=round(1 - (variance ** 0.5) * 2, 4),
                factors=factors,
            )
        )

    return sorted(predictions, key=lambda p: -p.predicted_conversion_rate)


@app.get("/api/experiment-summary/{story_id}", response_model=ExperimentSummary)
async def experiment_summary(story_id: str):
    """Compute aggregate experiment statistics for a story."""
    sb = get_supabase()

    result = sb.table("bandit_state").select("*").eq("story_id", story_id).execute()
    states = result.data or []

    if not states:
        raise HTTPException(status_code=404, detail="No bandit data found")

    total_variants = len(states)
    total_trials = sum(s["alpha"] + s["beta"] - 2 for s in states)

    best = max(states, key=lambda s: s["alpha"] / (s["alpha"] + s["beta"]))
    best_rate = best["alpha"] / (best["alpha"] + best["beta"])

    # Use oldest variant as control
    control = min(states, key=lambda s: s["alpha"] + s["beta"])
    control_rate = control["alpha"] / (control["alpha"] + control["beta"])

    lift = (best_rate - control_rate) / max(control_rate, 0.001) * 100

    # Simple significance estimate from trial counts
    best_trials = best["alpha"] + best["beta"] - 2
    significance = min(0.99, best_trials / 100)

    return ExperimentSummary(
        story_id=story_id,
        total_variants=total_variants,
        total_trials=total_trials,
        best_variant=best["variant_hash"],
        best_conversion_rate=round(best_rate, 4),
        lift_vs_control=round(lift, 2),
        statistical_significance=round(significance, 4),
    )
