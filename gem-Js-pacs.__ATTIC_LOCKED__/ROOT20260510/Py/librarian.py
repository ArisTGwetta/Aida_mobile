# AIDA REVIEW BLOCK 1: File header - gem-Js-pacs\ROOT20260510\Py\librarian.py
# AIDA REVIEW BLOCK 2: Module setup - imports, constants, and shared state used below.
import json
import copy
from pathlib import Path
from datetime import datetime, timezone


BASE_DIR = Path(__file__).parent


# ---- Helpers ---------------------------------------------------------------

# AIDA REVIEW BLOCK 3: Function load_json - callable organ behavior.
def load_json(path: Path, default):
    if not path.exists():
        return copy.deepcopy(default)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# AIDA REVIEW BLOCK 4: Function save_json - callable organ behavior.
def save_json(path: Path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# AIDA REVIEW BLOCK 5: Function now_iso - callable organ behavior.
def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ---- Defaults --------------------------------------------------------------

DEFAULT_FACTS = {}
DEFAULT_INSIGHTS = {}
DEFAULT_USER_MODEL = {}
DEFAULT_REALM_CONFIG = {}
DEFAULT_PROJECT_SUMMARY = {}
DEFAULT_PROJECT_BRIEFCASES = {}
DEFAULT_MEMORY_SUMMARY_HISTORY = {"days": []}
DEFAULT_EMOTIONAL_HISTORY = {"states": []}


# ---- Librarian -------------------------------------------------------------

# AIDA REVIEW BLOCK 6: Class Librarian - grouped organ/service behavior.
class Librarian:
    """
    Long-term, slow-thinking pattern engine.
    Operates on weeks/months of data, not daily noise.
    """

# AIDA REVIEW BLOCK 7: Function __init__ - callable organ behavior.
    def __init__(self, base_dir: Path = BASE_DIR):
        self.base_dir = base_dir

    # -- High-level entry point --

# AIDA REVIEW BLOCK 8: Function run - callable organ behavior.
    def run(self,
            payload_path: Path = None,
            output_path: Path = None) -> dict:
        """
        Full deep-meditation cycle:

        1. Load librarian_payload.json
        2. Load current long-term files (facts, insights, user_model, realms, projects)
        3. Analyze long-term patterns (emotional arcs, preference trends, project arcs)
        4. Update insights, user_model, project briefcases, realm_config
        5. Write librarian_output.json
        """
        if payload_path is None:
            payload_path = self.base_dir / "librarian_payload.json"
        if output_path is None:
            output_path = self.base_dir / "librarian_output.json"

        payload = load_json(payload_path, default={
            "history": {
                "memory_summaries": {"days": []},
                "session_logs": {"entries": []}
            },
            "long_term_memory": {
                "facts": {},
                "insights": {},
                "user_model": {},
                "realm_config": {},
                "project_summary": {},
                "project_briefcases": {}
            },
            "emotional_history": {"states": []},
            "librarian_settings": {}
        })

        history = payload.get("history", {})
        memory_summaries = history.get("memory_summaries", DEFAULT_MEMORY_SUMMARY_HISTORY)
        session_logs = history.get("session_logs", {"entries": []})

        long_term = payload.get("long_term_memory", {})
        facts = long_term.get("facts", DEFAULT_FACTS)
        insights = long_term.get("insights", DEFAULT_INSIGHTS)
        user_model = long_term.get("user_model", DEFAULT_USER_MODEL)
        realm_config = long_term.get("realm_config", DEFAULT_REALM_CONFIG)
        project_summary = long_term.get("project_summary", DEFAULT_PROJECT_SUMMARY)
        project_briefcases = long_term.get("project_briefcases", DEFAULT_PROJECT_BRIEFCASES)

        emotional_history = payload.get("emotional_history", DEFAULT_EMOTIONAL_HISTORY)
        settings = payload.get("librarian_settings", {})

        summary = {
            "long_term_insights_added": [],
            "long_term_insights_updated": [],
            "insights_pruned": [],
            "user_model_updates": [],
            "project_arc_updates": [],
            "realm_evolution": [],
            "emotional_arc_patterns": [],
            "contradictions_detected": [],
            "warnings": []
        }

        meta_patterns = {
            "themes": [],
            "emotional_arcs": [],
            "preference_trends": [],
            "project_arcs": [],
            "realm_usage_patterns": []
        }

        # 1) Emotional arcs
        emo_patterns = self._analyze_emotional_history(emotional_history, memory_summaries)
        summary["emotional_arc_patterns"].extend(emo_patterns)
        meta_patterns["emotional_arcs"].extend(emo_patterns)

        # 2) Preference trends & user model evolution
        pref_trends, user_updates = self._analyze_preferences(memory_summaries, insights, user_model)
        meta_patterns["preference_trends"].extend(pref_trends)
        summary["user_model_updates"].extend(user_updates)

        # 3) Project arcs
        project_arcs, project_updates = self._analyze_projects(project_summary, project_briefcases, memory_summaries)
        meta_patterns["project_arcs"].extend(project_arcs)
        summary["project_arc_updates"].extend(project_updates)

        # 4) Realm usage patterns
        realm_patterns, realm_updates = self._analyze_realms(realm_config, memory_summaries, settings)
        meta_patterns["realm_usage_patterns"].extend(realm_patterns)
        summary["realm_evolution"].extend(realm_updates)

        # 5) Insight consolidation (merge/prune/elevate)
        added, updated, pruned = self._consolidate_insights(insights, memory_summaries)
        summary["long_term_insights_added"].extend(added)
        summary["long_term_insights_updated"].extend(updated)
        summary["insights_pruned"].extend(pruned)

        # 6) Contradiction / drift detection
        contradictions, warnings = self._detect_drift(facts, insights, user_model)
        summary["contradictions_detected"].extend(contradictions)
        summary["warnings"].extend(warnings)

        # 7) Build updated_files block
        updated_files = {
            "facts.json": facts,
            "insights.json": insights,
            "user_model.json": user_model,
            "realm_config.json": realm_config,
            "project_summary.json": project_summary,
            "project_briefcases": project_briefcases,
            "memory_summary_history.json": memory_summaries
        }

        output = {
            "__meta": {
                "description": "Librarian output after deep meditation."
            },
            "timestamp": now_iso(),
            "status": "success",
            "summary": summary,
            "updated_files": updated_files,
            "meta_patterns": meta_patterns,
            "recommendations": {
                "assistant_behavior": [],
                "realm_structure": [],
                "project_structure": [],
                "memory_structure": []
            }
        }

        save_json(output_path, output)
        return output

    # ---- Emotional analysis -------------------------------------------------

# AIDA REVIEW BLOCK 9: Function _analyze_emotional_history - callable organ behavior.
    def _analyze_emotional_history(self, emotional_history, memory_summaries):
        """
        Placeholder emotional arc analysis.
        Looks at emotional_history.states or memory_summaries.days[*].last_emotion_state
        and returns coarse patterns like 'mostly_positive', 'increasing_variability', etc.
        """
        states = emotional_history.get("states", [])
        if not states and memory_summaries.get("days"):
            # derive from memory_summaries if explicit states missing
            for day in memory_summaries["days"]:
                st = day.get("last_emotion_state")
                if st:
                    states.append(st)

        if not states:
            return []

        avg_v = sum(s.get("valence", 0.0) for s in states) / len(states)
        avg_a = sum(s.get("arousal", 0.0) for s in states) / len(states)

        pattern = {
            "average_valence": round(avg_v, 3),
            "average_arousal": round(avg_a, 3),
            "label": self._label_emotional_arc(avg_v, avg_a)
        }
        return [pattern]

# AIDA REVIEW BLOCK 10: Function _label_emotional_arc - callable organ behavior.
    def _label_emotional_arc(self, v, a):
        if v > 0.2 and abs(a) < 0.3:
            return "mostly_calm_positive"
        if v < -0.2 and abs(a) < 0.3:
            return "mostly_calm_negative"
        if abs(a) > 0.5:
            return "high_variability"
        return "mixed_neutral"

    # ---- Preference & user model analysis ----------------------------------

# AIDA REVIEW BLOCK 11: Function _analyze_preferences - callable organ behavior.
    def _analyze_preferences(self, memory_summaries, insights, user_model):
        """
        Placeholder: look for simple counters in insights like 'prefers_mythic_tone_count'
        and convert them into stronger user_model flags if they cross thresholds.
        """
        days = memory_summaries.get("days", [])
        pref_trends = []
        user_updates = []

        # Example: if insights track 'mythic_tone_positive_days'
        mythic_days = insights.get("mythic_tone_positive_days", 0)
        if mythic_days > 10:
            user_model["prefers_mythic_tone"] = "strong"
            pref_trends.append({"preference": "mythic_tone", "trend": "strong_preference"})
            user_updates.append({"key": "prefers_mythic_tone", "value": "strong"})

        # You can add more patterns here later.
        return pref_trends, user_updates

    # ---- Project analysis ---------------------------------------------------

# AIDA REVIEW BLOCK 12: Function _analyze_projects - callable organ behavior.
    def _analyze_projects(self, project_summary, project_briefcases, memory_summaries):
        """
        Placeholder: mark projects as 'active', 'stalled', or 'dormant'
        based on whether they appear in recent memory_summaries.
        """
        days = memory_summaries.get("days", [])
        project_activity = {}

        for day in days:
            active_projects = day.get("active_projects", [])
            for p in active_projects:
                project_activity[p] = project_activity.get(p, 0) + 1

        project_arcs = []
        project_updates = []

        for name, briefcase in project_briefcases.items():
            count = project_activity.get(name, 0)
            if count > 5:
                status = "active"
            elif 1 <= count <= 5:
                status = "occasional"
            else:
                status = "dormant"

            briefcase.setdefault("meta", {})
            briefcase["meta"]["activity_status"] = status
            project_arcs.append({"project": name, "activity": status})
            project_updates.append({"project": name, "status": status})

        return project_arcs, project_updates

    # ---- Realm analysis -----------------------------------------------------

# AIDA REVIEW BLOCK 13: Function _analyze_realms - callable organ behavior.
    def _analyze_realms(self, realm_config, memory_summaries, settings):
        """
        Placeholder: count realm usage and optionally mark rarely used realms.
        """
        days = memory_summaries.get("days", [])
        realm_counts = {}

        for day in days:
            realms = day.get("realms_used", [])
            for r in realms:
                realm_counts[r] = realm_counts.get(r, 0) + 1

        patterns = []
        updates = []

        for realm_name, cfg in realm_config.items():
            count = realm_counts.get(realm_name, 0)
            patterns.append({"realm": realm_name, "usage_count": count})

            # Optional evolution: mark as 'low_usage' if rarely used
            if settings.get("update_realms", False) and count == 0:
                cfg.setdefault("meta", {})
                cfg["meta"]["usage_flag"] = "low_usage"
                updates.append({"realm": realm_name, "flag": "low_usage"})

        return patterns, updates

    # ---- Insight consolidation ---------------------------------------------

# AIDA REVIEW BLOCK 14: Function _consolidate_insights - callable organ behavior.
    def _consolidate_insights(self, insights, memory_summaries):
        """
        Placeholder: treat any insight with a 'confidence' field and:
        - increase confidence if referenced often
        - prune if confidence is very low and old
        """
        added = []
        updated = []
        pruned = []

        # This is intentionally minimal; you can expand later.
        for key, value in list(insights.items()):
            if isinstance(value, dict) and "confidence" in value:
                conf = value.get("confidence", 0.5)
                # naive bump
                if conf < 0.9:
                    value["confidence"] = min(1.0, conf + 0.05)
                    insights[key] = value
                    updated.append(key)

                # naive prune rule
                if conf < 0.2:
                    pruned.append(key)
                    del insights[key]

        return added, updated, pruned

    # ---- Drift / contradiction detection -----------------------------------

# AIDA REVIEW BLOCK 15: Function _detect_drift - callable organ behavior.
    def _detect_drift(self, facts, insights, user_model):
        """
        Placeholder: look for obvious contradictions between user_model and insights.
        """
        contradictions = []
        warnings = []

        # Example: if user_model says 'prefers_mythic_tone' = strong
        # but insights say 'mythic_tone_negative_days' is high.
        mythic_pref = user_model.get("prefers_mythic_tone")
        mythic_negative = insights.get("mythic_tone_negative_days", 0)

        if mythic_pref == "strong" and mythic_negative > 5:
            contradictions.append({
                "type": "tone_preference_conflict",
                "detail": "User marked as strongly preferring mythic tone, but many negative mythic days recorded."
            })
            warnings.append("Check mythic tone usage; user response may be shifting.")

        return contradictions, warnings


# ---- CLI-ish entry ---------------------------------------------------------

# AIDA REVIEW BLOCK 16: Command-line entrypoint - runs this organ when launched directly.
if __name__ == "__main__":
    librarian = Librarian()
    out = librarian.run()
    print("Librarian deep meditation complete.")
    print("Status:", out.get("status"), "at", out.get("timestamp"))
