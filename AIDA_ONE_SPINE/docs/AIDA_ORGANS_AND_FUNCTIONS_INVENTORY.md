# AIDA Organs And Functions Inventory

Generated orientation map for reviewing the runtime flow. Files are grouped by the part of Aida they appear to serve. `AIDA_ONE_SPINE` is the current live spine; `ONE` and `gem-Js-pacs` are older donor/legacy packs that still matter for memory and behavior debugging.

## Gem/organ donor pack

| File | Lines | Visible functions / exports |
| --- | ---: | --- |
| `gem-Js-pacs/001-buttler_amber.js` | 44 | class Butler, load_json, save_json, now_iso, __init__, run |
| `gem-Js-pacs/002-librarian_green.js` | 58 | class Librarian, load_json, save_json, now_iso, __init__, run |
| `gem-Js-pacs/003-emotion_blue.js` | 72 | class EmotionSelector, __init__, select_emotion |
| `gem-Js-pacs/004-identity_white.js` | 61 | class IdentityEngine, __init__, _resolve_identity, _merge_tone, get_resolved_identity |
| `gem-Js-pacs/005-realm_silver.js` | 42 | class RealmEngine, __init__, _resolve_realm, get_tone_modifiers, get_physics |
| `gem-Js-pacs/006-role_silver.js` | 42 | class RoleEngine, __init__, _resolve_role, get_tone_modifiers, get_role_data |
| `gem-Js-pacs/007-soul_sync_blue.js` | 47 | py_sync_soul |
| `gem-Js-pacs/008-crawler_green.js` | 56 | class Crawler, tokenize, __init__, run, _detect_patterns |
| `gem-Js-pacs/009-tetrad_silver.js` | 49 | assemble_tetrad |
| `gem-Js-pacs/010-chassis_gold.js` | 65 | buildPixelGrid, buildSparks, window.aida_arrive |
| `gem-Js-pacs/011-butler_keys.js` | 42 | pressKey, requestToken |
| `gem-Js-pacs/012-handshake_amber.js` | 40 | class ButlerHandshake, __init__, py_sync_soul |
| `gem-Js-pacs/013-engine_platinum.py` | 154 | class PresentationState, class InteractionState, class AidaChassis, pulse, py_list_briefcases, send_to_butler, clear_rolling_summaries, __init__, _fetch_briefcase_json, py_sync_soul, _tetrad_snapshot, py_get_tetrad_snapshot, py_log_turn, py_register_strike, window.py_sync_soul, window.py_get_tetrad_snapshot, window.py_log_turn, window.py_register_strike, window.py_list_briefcases |
| `gem-Js-pacs/014-manifest_gold.js` | 149 | getTetrad, selectColorProfile, applyUITheme, applyAura, realm, role, realmKey, window.presentation_arrive, window.presentation_depart, window.run_realm_transition |
| `gem-Js-pacs/016-memory_green.py` | 80 | class MemoryOrgan, class FactExtractor, _now_iso, __init__, log_turn, _commit_to_js_bridge, scan, py_process_memory_awake, window.py_process_memory_awake |
| `gem-Js-pacs/020-emotion_green.py` | 86 | class EmotionEngine, _now_iso, _clamp, __init__, apply_impulse, tick, _update, window.emotion_ctx, window.emotion_engine |
| `gem-Js-pacs/020-vitality_gold.js` | 85 | runExpressions, runSync, runUIAccents, window.vitality_stack, window.hologram_sync |
| `gem-Js-pacs/025-vault_gold.js` | 46 | init, setDriveToken, setRefreshToken, setOpenAIKey, driveHeaders, openaiHeaders, window.token_keeper |
| `gem-Js-pacs/026-sync_gold.js` | 86 | apiRequest, window.logistics_hub |
| `gem-Js-pacs/028-manifest_gold.js` | 70 | window.aura_engine |
| `gem-Js-pacs/032-memory_gold.js` | 57 | performDeepTask, window.deep_memory |
| `gem-Js-pacs/033-python_gold.js` | 73 | boot, window.py_engine |
| `gem-Js-pacs/040-mind_palace_gold.js` | 80 | runCycle, window.mind_palace |
| `gem-Js-pacs/042-research_gold.js` | 73 | loadIndex, window.research_hub |
| `gem-Js-pacs/048-llm_engine_v1.js` | 59 | call_llm, window.LLM_ENGINE_PY |
| `gem-Js-pacs/048-llm_engine_v1.py` | 62 | call_llm |
| `gem-Js-pacs/index.html` | 445 | uiLog, pressKey, requestToken, window.onload |
| `gem-Js-pacs/interface.html` | 156 | communicate, window.onload |
| `gem-Js-pacs/ROOT20260510/butler.py` | 391 | class Butler, load_json, save_json, now_iso, __init__, run, _apply_facts_delta, _apply_insights_delta, _apply_user_model_delta, _process_emotions, _propose_emotion_label, _process_projects_and_realms, _new_project_briefcase, _load_system_prompt |
| `gem-Js-pacs/ROOT20260510/crawler.py` | 435 | class Crawler, load_json, save_json, now_iso, tokenize, __init__, run, _load_all_logs, _normalize_entry, _index_entry_keywords, _index_entry_tags, _index_entry_realm, _index_entry_project, _index_entry_emotion, _index_entry_semantic, _cluster_topics, _extract_motifs, _extract_patterns, _build_snippets |
| `gem-Js-pacs/ROOT20260510/emotion_selector-LAUNCH.py` | 19 | No named functions found; likely markup, config, or inline behavior. |
| `gem-Js-pacs/ROOT20260510/emotion_selector.py` | 200 | class EmotionSelector, __init__, _distance, find_closest_emotions, select_emotion, _pick_face |
| `gem-Js-pacs/ROOT20260510/identity_organ.py` | 247 | class IdentityEngine, __init__, from_files, load_json, _validate_core, _resolve_identity, _merge_tone, normalize, _merge_unique_lists, get_resolved_identity, get_tone, get_safety_rules, get_behavior_principles, get_communication_style, get_realm_name, get_active_role, is_element_allowed |
| `gem-Js-pacs/ROOT20260510/index.html` | 7136 | pressKey, requestToken, renderBriefcaseList, closeBriefcaseModal, getActiveTags, buildPixelGrid, buildSparks, fetchTetradSnapshot, selectPresentationProfile, selectColorProfileFromTetrad, applyColorProfile, resolveRealmKeyFromSnapshot, pickRealmTheme, applyUITheme, ensureEnvironmentLayer, runEnvironmentPop, init, maybeFlipFace, breathingGlow, hologramDrift, auraBreathing, update, computeDeltaEmotion, applyReaction, tinyTwinkle, softRipple, warmPulse, cinematicBloom, applyEmotionalTint, updateFace, getTint, applyTint, fast, slow, pick, sleep, start, setDriveToken, setRefreshToken, setOpenAIKey, getDriveToken, getRefreshToken, getOpenAIKey, driveHeaders, openaiHeaders, listFiles, downloadText, downloadJSON, downloadBinary, uploadText, listBriefcases, loadBriefcase, loadGlobalBriefcase, loadRealmConfig, loadProjectBriefcase, switchRealm, updateRealmTag, buildFlickerGrid, generateWakeLine, t... |
| `gem-Js-pacs/ROOT20260510/librarian.py` | 382 | class Librarian, load_json, save_json, now_iso, __init__, run, _analyze_emotional_history, _label_emotional_arc, _analyze_preferences, _analyze_projects, _analyze_realms, _consolidate_insights, _detect_drift |
| `gem-Js-pacs/ROOT20260510/Py/butler.py` | 391 | class Butler, load_json, save_json, now_iso, __init__, run, _apply_facts_delta, _apply_insights_delta, _apply_user_model_delta, _process_emotions, _propose_emotion_label, _process_projects_and_realms, _new_project_briefcase, _load_system_prompt |
| `gem-Js-pacs/ROOT20260510/Py/crawler.py` | 435 | class Crawler, load_json, save_json, now_iso, tokenize, __init__, run, _load_all_logs, _normalize_entry, _index_entry_keywords, _index_entry_tags, _index_entry_realm, _index_entry_project, _index_entry_emotion, _index_entry_semantic, _cluster_topics, _extract_motifs, _extract_patterns, _build_snippets |
| `gem-Js-pacs/ROOT20260510/Py/emotion_selector-LAUNCH.py` | 19 | No named functions found; likely markup, config, or inline behavior. |
| `gem-Js-pacs/ROOT20260510/Py/emotion_selector.py` | 200 | class EmotionSelector, __init__, _distance, find_closest_emotions, select_emotion, _pick_face |
| `gem-Js-pacs/ROOT20260510/Py/identity_organ.py` | 247 | class IdentityEngine, __init__, from_files, load_json, _validate_core, _resolve_identity, _merge_tone, normalize, _merge_unique_lists, get_resolved_identity, get_tone, get_safety_rules, get_behavior_principles, get_communication_style, get_realm_name, get_active_role, is_element_allowed |
| `gem-Js-pacs/ROOT20260510/Py/librarian.py` | 382 | class Librarian, load_json, save_json, now_iso, __init__, run, _analyze_emotional_history, _label_emotional_arc, _analyze_preferences, _analyze_projects, _analyze_realms, _consolidate_insights, _detect_drift |
| `gem-Js-pacs/ROOT20260510/Py/realm_organ.py` | 230 | class RealmEngine, __init__, from_file, _validate, _resolve_realm, _normalize_str_list, _build_tone_modifiers, split_and_add, _flatten_constraints, get_resolved_realm, get_realm_name, get_tone_modifiers, get_constraints, get_allowed_behaviors, get_forbidden_behaviors, is_behavior_allowed, meta_layer_allowed, get_meta_examples, emotion_mirroring_allowed, get_emotional_palette, get_continuity_hooks, get_project_briefcase_pointer |
| `gem-Js-pacs/ROOT20260510/Py/role_organ.py` | 150 | class RoleEngine, __init__, from_file, _validate, _resolve_role, _normalize_str_list, get_resolved_role, get_name, get_tone_modifiers, get_priorities, get_communication_style, get_capabilities, get_constraints, get_flags, has_capability, is_flag_enabled |
| `gem-Js-pacs/ROOT20260510/Py/soul_sync_engine.py` | 37 | _load_json, py_sync_soul |
| `gem-Js-pacs/ROOT20260510/Py/tetrad_chassis.py` | 60 | load_emotion_state, assemble_tetrad |
| `gem-Js-pacs/ROOT20260510/python/butler.py` | 391 | class Butler, load_json, save_json, now_iso, __init__, run, _apply_facts_delta, _apply_insights_delta, _apply_user_model_delta, _process_emotions, _propose_emotion_label, _process_projects_and_realms, _new_project_briefcase, _load_system_prompt |
| `gem-Js-pacs/ROOT20260510/python/crawler.py` | 435 | class Crawler, load_json, save_json, now_iso, tokenize, __init__, run, _load_all_logs, _normalize_entry, _index_entry_keywords, _index_entry_tags, _index_entry_realm, _index_entry_project, _index_entry_emotion, _index_entry_semantic, _cluster_topics, _extract_motifs, _extract_patterns, _build_snippets |
| `gem-Js-pacs/ROOT20260510/python/emotion_selector-LAUNCH.py` | 19 | No named functions found; likely markup, config, or inline behavior. |
| `gem-Js-pacs/ROOT20260510/python/emotion_selector.py` | 200 | class EmotionSelector, __init__, _distance, find_closest_emotions, select_emotion, _pick_face |
| `gem-Js-pacs/ROOT20260510/python/identity_organ.py` | 247 | class IdentityEngine, __init__, from_files, load_json, _validate_core, _resolve_identity, _merge_tone, normalize, _merge_unique_lists, get_resolved_identity, get_tone, get_safety_rules, get_behavior_principles, get_communication_style, get_realm_name, get_active_role, is_element_allowed |
| `gem-Js-pacs/ROOT20260510/python/librarian.py` | 382 | class Librarian, load_json, save_json, now_iso, __init__, run, _analyze_emotional_history, _label_emotional_arc, _analyze_preferences, _analyze_projects, _analyze_realms, _consolidate_insights, _detect_drift |
| `gem-Js-pacs/ROOT20260510/python/realm_organ.py` | 230 | class RealmEngine, __init__, from_file, _validate, _resolve_realm, _normalize_str_list, _build_tone_modifiers, split_and_add, _flatten_constraints, get_resolved_realm, get_realm_name, get_tone_modifiers, get_constraints, get_allowed_behaviors, get_forbidden_behaviors, is_behavior_allowed, meta_layer_allowed, get_meta_examples, emotion_mirroring_allowed, get_emotional_palette, get_continuity_hooks, get_project_briefcase_pointer |
| `gem-Js-pacs/ROOT20260510/python/role_organ.py` | 150 | class RoleEngine, __init__, from_file, _validate, _resolve_role, _normalize_str_list, get_resolved_role, get_name, get_tone_modifiers, get_priorities, get_communication_style, get_capabilities, get_constraints, get_flags, has_capability, is_flag_enabled |
| `gem-Js-pacs/ROOT20260510/python/soul_sync_engine.py` | 37 | _load_json, py_sync_soul |
| `gem-Js-pacs/ROOT20260510/python/tetrad_chassis.py` | 60 | load_emotion_state, assemble_tetrad |
| `gem-Js-pacs/ROOT20260510/realm_organ.py` | 230 | class RealmEngine, __init__, from_file, _validate, _resolve_realm, _normalize_str_list, _build_tone_modifiers, split_and_add, _flatten_constraints, get_resolved_realm, get_realm_name, get_tone_modifiers, get_constraints, get_allowed_behaviors, get_forbidden_behaviors, is_behavior_allowed, meta_layer_allowed, get_meta_examples, emotion_mirroring_allowed, get_emotional_palette, get_continuity_hooks, get_project_briefcase_pointer |
| `gem-Js-pacs/ROOT20260510/role_organ.py` | 150 | class RoleEngine, __init__, from_file, _validate, _resolve_role, _normalize_str_list, get_resolved_role, get_name, get_tone_modifiers, get_priorities, get_communication_style, get_capabilities, get_constraints, get_flags, has_capability, is_flag_enabled |
| `gem-Js-pacs/ROOT20260510/soul_sync_engine.py` | 37 | _load_json, py_sync_soul |
| `gem-Js-pacs/ROOT20260510/tetrad_chassis.py` | 60 | load_emotion_state, assemble_tetrad |
| `gem-Js-pacs/scripts/001-buttler_amber.js` | 44 | class Butler, load_json, save_json, now_iso, __init__, run |
| `gem-Js-pacs/scripts/002-librarian_green.js` | 58 | class Librarian, load_json, save_json, now_iso, __init__, run |
| `gem-Js-pacs/scripts/003-emotion_blue.js` | 72 | class EmotionSelector, __init__, select_emotion |
| `gem-Js-pacs/scripts/004-identity_white.js` | 48 | class IdentityEngine, __init__, _resolve_identity, _merge_tone, get_resolved_identity |
| `gem-Js-pacs/scripts/005-realm_silver.js` | 31 | class RealmEngine, __init__, _resolve_realm, is_behavior_allowed, get_tone_modifiers |
| `gem-Js-pacs/scripts/006-role_silver.js` | 32 | class RoleEngine, __init__, _resolve_role, has_capability, get_name |
| `gem-Js-pacs/scripts/007-soul_sync_blue.js` | 47 | py_sync_soul |
| `gem-Js-pacs/scripts/008-crawler_green.js` | 56 | class Crawler, tokenize, __init__, run, _detect_patterns |
| `gem-Js-pacs/scripts/009-tetrad_silver.js` | 49 | assemble_tetrad |
| `gem-Js-pacs/scripts/010-chassis_gold.js` | 65 | buildPixelGrid, buildSparks, window.aida_arrive |
| `gem-Js-pacs/scripts/011-butler_keys.js` | 37 | pressKey, requestToken |
| `gem-Js-pacs/scripts/012-handshake_amber.js` | 40 | class ButlerHandshake, __init__, py_sync_soul |
| `gem-Js-pacs/scripts/013-engine_platinum.py` | 154 | class PresentationState, class InteractionState, class AidaChassis, pulse, py_list_briefcases, send_to_butler, clear_rolling_summaries, __init__, _fetch_briefcase_json, py_sync_soul, _tetrad_snapshot, py_get_tetrad_snapshot, py_log_turn, py_register_strike, window.py_sync_soul, window.py_get_tetrad_snapshot, window.py_log_turn, window.py_register_strike, window.py_list_briefcases |
| `gem-Js-pacs/scripts/014-manifest_gold.js` | 149 | getTetrad, selectColorProfile, applyUITheme, applyAura, realm, role, realmKey, window.presentation_arrive, window.presentation_depart, window.run_realm_transition |
| `gem-Js-pacs/scripts/016-memory_green.py` | 80 | class MemoryOrgan, class FactExtractor, _now_iso, __init__, log_turn, _commit_to_js_bridge, scan, py_process_memory_awake, window.py_process_memory_awake |
| `gem-Js-pacs/scripts/020-emotion_green.py` | 86 | class EmotionEngine, _now_iso, _clamp, __init__, apply_impulse, tick, _update, window.emotion_ctx, window.emotion_engine |
| `gem-Js-pacs/scripts/020-vitality_gold.js` | 85 | runExpressions, runSync, runUIAccents, window.vitality_stack, window.hologram_sync |
| `gem-Js-pacs/scripts/025-vault_gold.js` | 46 | init, setDriveToken, setRefreshToken, setOpenAIKey, driveHeaders, openaiHeaders, window.token_keeper |
| `gem-Js-pacs/scripts/026-sync_gold.js` | 86 | apiRequest, window.logistics_hub |
| `gem-Js-pacs/scripts/028-manifest_gold.js` | 70 | window.aura_engine |
| `gem-Js-pacs/scripts/032-memory_gold.js` | 57 | performDeepTask, window.deep_memory |
| `gem-Js-pacs/scripts/033-python_gold.js` | 73 | boot, window.py_engine |
| `gem-Js-pacs/scripts/040-mind_palace_gold.js` | 80 | runCycle, window.mind_palace |
| `gem-Js-pacs/scripts/042-research_gold.js` | 73 | loadIndex, window.research_hub |
| `gem-Js-pacs/scripts/048-llm_engine_v1.py` | 60 | call_llm, window.py_call_llm |
| `gem-Js-pacs/scripts/index.html` | 105 | logToScreen, main |

## Legacy ONE donor

| File | Lines | Visible functions / exports |
| --- | ---: | --- |
| `ONE/docs/index.html` | 384 | uiLog, pressKey, requestToken, window.onload |
| `ONE/index-ONE.html` | 2542 | pressKey, requestToken, waitForGIS, initializeOAuthClient, beginOAuthHandshake, handleOAuthResponse, listDriveJsonFiles, fetchDriveJsonFile, fetchAllDriveJson, overlayDriveMind, match, initializeDriveMind, initPyodideAndOrgans, injectMindIntoPython, buildPythonContext, initializePythonMind, discoverProjects, selectActiveProject, loadActiveProject, initializeProjects, selectFaceFromEmotion, updateHologramFace, startEmotionWatcher, initializeEmotionEngine, captureUserInput, handleSend, runMindPass, runLLMPass, deliverOutput, processUserMessage, initializeConversationLoop, updateLastSeenState, hoursBetween, pickTopicFromProfile, generateWhileAwayThought, saveWhileAwayThought, consumeWhileAwayThought, registerTopicReaction, dispatchAidaAction, parseLLMForAction, processLLMOutput, initializeToolsLayer, writeToDrive, runDriveSync, startDriveSyncLoop, loadDriveStateOnBoot, initializeDriveSync, ... |
| `ONE/index.html` | 3971 | populateCockpit, biosLog, showAirlock, bootSequence, next, pressKey, requestToken, waitForGIS, initializeOAuthClient, beginOAuthHandshake, handleOAuthResponse, listDriveItems, fetchDriveJsonFile, fetchFolderJsonFlat, fetchAllDriveJson, overlayDriveMind, matchIn, initializeDriveMind, initPyodideAndOrgans, alias, injectMindIntoPython, buildPythonContext, initializePythonMind, discoverProjects, selectActiveProject, loadActiveProject, initializeProjects, selectFaceFromEmotion, updateHologramFace, startEmotionWatcher, initializeEmotionEngine, captureUserInput, handleSend, runMindPass, runLLMPass, deliverOutput, processUserMessage, initializeConversationLoop, updateLastSeenState, hoursBetween, pickTopicFromProfile, generateWhileAwayThought, saveWhileAwayThought, consumeWhileAwayThought, registerTopicReaction, dispatchAidaAction, parseLLMForAction, processLLMOutput, initializeToolsLayer, writeT... |
| `ONE/js/001-buttler_amber.js` | 44 | class Butler, load_json, save_json, now_iso, __init__, run |
| `ONE/js/002-librarian_green.js` | 58 | class Librarian, load_json, save_json, now_iso, __init__, run |
| `ONE/js/003-emotion_blue.js` | 72 | class EmotionSelector, __init__, select_emotion |
| `ONE/js/004-identity_white.js` | 61 | class IdentityEngine, __init__, _resolve_identity, _merge_tone, get_resolved_identity |
| `ONE/js/005-realm_silver.js` | 42 | class RealmEngine, __init__, _resolve_realm, get_tone_modifiers, get_physics |
| `ONE/js/006-role_silver.js` | 42 | class RoleEngine, __init__, _resolve_role, get_tone_modifiers, get_role_data |
| `ONE/js/007-soul_sync_blue.js` | 47 | py_sync_soul |
| `ONE/js/008-crawler_green.js` | 56 | class Crawler, tokenize, __init__, run, _detect_patterns |
| `ONE/js/009-tetrad_silver.js` | 49 | assemble_tetrad |
| `ONE/js/010-chassis_gold.js` | 65 | buildPixelGrid, buildSparks, window.aida_arrive |
| `ONE/js/011-butler_keys.js` | 42 | pressKey, requestToken |
| `ONE/js/012-handshake_amber.js` | 40 | class ButlerHandshake, __init__, py_sync_soul |
| `ONE/js/014-manifest_gold.js` | 408 | getTetrad, selectColorProfile, applyUITheme, applyAura, realm, role, realmKey, window.AIDA_ACTIVE_PROJECT, window.AIDA_ACTIVE_REALM, window.AIDA_ACTIVE_ROLE, window.AIDA_ROLE_OVERRIDE, window.AIDA_ACTIVE_EMOTION, window.AIDA_ACTIVE_IDENTITY, window.AIDA_ACTIVE_SAFETY, window.AIDA_TETRAD, window.AIDA_LLM_PROMPT, window.setActiveProject, window.setActiveRealm, window.setActiveRole, window.AIDA_PREVIOUS_EMOTION, window.setActiveEmotion, window.runTetradAssembly, window.rebuildTetrad, window.resetToProjectDefaults, window.updateTetradInspector, window.buildLLMPrompt, window.presentation_arrive, window.presentation_depart, window.run_realm_transition |
| `ONE/js/020-vitality_gold.js` | 85 | runExpressions, runSync, runUIAccents, window.vitality_stack, window.hologram_sync |
| `ONE/js/025-vault_gold.js` | 96 | init, setDriveToken, setRefreshToken, setOpenAIKey, driveHeaders, openaiHeaders, check, window.token_keeper |
| `ONE/js/026-sync_gold.js` | 86 | apiRequest, window.logistics_hub |
| `ONE/js/028-aura_gold.js` | 70 | window.aura_engine |
| `ONE/js/032-memory_gold.js` | 57 | performDeepTask, window.deep_memory |
| `ONE/js/033-python_gold.js` | 311 | biosLog, build_butler_state, build_library, select_emotion, window.AIDA_PYODIDE, window.AIDA_PY_READY, window.AIDA_PY_BOOT_PROMISE, window.logistics_hub, window.logistics_hub.get_snapshot, window.py_get_tetrad_snapshot, window.py_engine |
| `ONE/js/040-mind_palace_gold.js` | 80 | runCycle, window.mind_palace |
| `ONE/js/042-research_gold.js` | 73 | loadIndex, window.research_hub |
| `ONE/js/048-llm_engine_v1.js` | 216 | _safe_join, call_llm, window.LLM_ENGINE_PY |
| `ONE/js/050-while_away_gold.js` | 172 | _parse_iso, _compute_gap_bucket, py_get_while_away_script, window.WHILE_AWAY_BOOT, window.WHILE_AWAY_BRIDGE |
| `ONE/py/aida-debug.py` | 2141 | is_memory_query, extract_fact_from_deep_results, get_project_path, detect_project, activate_project, update_project_memory, load_project_memory, get_aida_rating, ask_aida_to_see, show_aida_something, create_journal_entry, generate_while_away_items, load_image, update_face, idle_grid_flicker, get_next_face, transition_face, select_emotion, update_emotion_face, idle_face_loop, start_face_window, get_vault_path, update_master_archive, save_conversation_history, update_conversation_memory, memory_status_debug, save_project_memory, update_project_summary, decay_confidence, needs_validation, generate_validation_prompt, update_fact, get_latest_journal_file, generate_session_summary, call_llm_for_summary, extract_facts_from_summary, save_facts, load_facts, extract_insights_from_facts, save_insights, load_insights, filter_by_privacy, build_privacy_context, simple_score, search_facts, search_summa... |
| `ONE/py/butler.py` | 391 | class Butler, load_json, save_json, now_iso, __init__, run, _apply_facts_delta, _apply_insights_delta, _apply_user_model_delta, _process_emotions, _propose_emotion_label, _process_projects_and_realms, _new_project_briefcase, _load_system_prompt |
| `ONE/py/crawler.py` | 435 | class Crawler, load_json, save_json, now_iso, tokenize, __init__, run, _load_all_logs, _normalize_entry, _index_entry_keywords, _index_entry_tags, _index_entry_realm, _index_entry_project, _index_entry_emotion, _index_entry_semantic, _cluster_topics, _extract_motifs, _extract_patterns, _build_snippets |
| `ONE/py/emotion_selector-LAUNCH.py` | 19 | No named functions found; likely markup, config, or inline behavior. |
| `ONE/py/emotion_selector.py` | 124 | class EmotionSelector, __init__, _load_json, _distance, find_closest_emotions, select_emotion, _pick_face |
| `ONE/py/identity_engine.py` | 247 | class IdentityEngine, __init__, from_files, load_json, _validate_core, _resolve_identity, _merge_tone, normalize, _merge_unique_lists, get_resolved_identity, get_tone, get_safety_rules, get_behavior_principles, get_communication_style, get_realm_name, get_active_role, is_element_allowed |
| `ONE/py/librarian.py` | 382 | class Librarian, load_json, save_json, now_iso, __init__, run, _analyze_emotional_history, _label_emotional_arc, _analyze_preferences, _analyze_projects, _analyze_realms, _consolidate_insights, _detect_drift |
| `ONE/py/realm_engine.py` | 230 | class RealmEngine, __init__, from_file, _validate, _resolve_realm, _normalize_str_list, _build_tone_modifiers, split_and_add, _flatten_constraints, get_resolved_realm, get_realm_name, get_tone_modifiers, get_constraints, get_allowed_behaviors, get_forbidden_behaviors, is_behavior_allowed, meta_layer_allowed, get_meta_examples, emotion_mirroring_allowed, get_emotional_palette, get_continuity_hooks, get_project_briefcase_pointer |
| `ONE/py/role_engine.py` | 150 | class RoleEngine, __init__, from_file, _validate, _resolve_role, _normalize_str_list, get_resolved_role, get_name, get_tone_modifiers, get_priorities, get_communication_style, get_capabilities, get_constraints, get_flags, has_capability, is_flag_enabled |
| `ONE/py/runtime.py` | 41 | No named functions found; likely markup, config, or inline behavior. |
| `ONE/py/triad.py` | 70 | load_emotion_state, assemble_tetrad |
| `ONE/waking-up.html` | 4089 | populateCockpit, biosLog, showAirlock, bootSequence, next, pressKey, requestToken, waitForGIS, initializeOAuthClient, beginOAuthHandshake, handleOAuthResponse, waitForFlag, isLLMReady, runWakeSequence, listDriveItems, fetchDriveJsonFile, fetchFolderJsonFlat, fetchAllDriveJson, overlayDriveMind, matchIn, initializeDriveMind, initPyodideAndOrgans, alias, injectMindIntoPython, buildPythonContext, initializePythonMind, discoverProjects, selectActiveProject, loadActiveProject, initializeProjects, selectFaceFromEmotion, updateHologramFace, startEmotionWatcher, initializeEmotionEngine, captureUserInput, handleSend, runMindPass, runLLMPass, deliverOutput, processUserMessage, initializeConversationLoop, updateLastSeenState, hoursBetween, pickTopicFromProfile, generateWhileAwayThought, saveWhileAwayThought, consumeWhileAwayThought, registerTopicReaction, dispatchAidaAction, parseLLMForAction, proc... |

## Live body shell

| File | Lines | Visible functions / exports |
| --- | ---: | --- |
| `AIDA_ONE_SPINE/body/awake.js` | 1430 | $, runtime, setBootPhase, appendBios, summarizeDriveWriteback, runDriveWriteback, ensureSleepCollectedCard, setSleepCardStatus, setSleepActionsBusy, finishSleepScreen, prepareWakeScreen, installSleepActions, showSleepCollected, hideSleepCollected, appendChat, pulse, projectLabel, projectPayload, briefcaseEditStatus, briefcaseHydrationState, openThreadsText, labeledBriefcaseField, renderMeditationResults, runBriefcaseMeditation, renderBriefcaseInspector, renderProjectSelector, buildPixelGrid, buildSparks, buildFaceDataGrid, buildFaceDataGrids, syncCustomTagsFromButtons, installTagEditor, installInputPlaceholders, showBody, createHologramLayer, resetRitualElements, failed, selectEntry, window.aida_arrive, window.aida_depart, window.AIDA_BODY, window.AIDA_BODY_PROJECTS, window.AIDA_BODY_TAGS |

## Live spine organ

| File | Lines | Visible functions / exports |
| --- | ---: | --- |
| `AIDA_ONE_SPINE/spine/airlock.js` | 477 | $, runtime, log, showAirlock, hideAirlock, showBios, returnToBios, getProvider, meaningfulDigits, pressKey, assembleRouteKey, resolveRoute, assembleLlmKey, safeRoutes, safeRouteMetadata, applyRouteToRuntime, inspectRoutes, inspectFromAirlock, requestToken, restoreTokenFromSession, clearSessionCredentials, install, window.AIDA_AIRLOCK |
| `AIDA_ONE_SPINE/spine/bios_console.js` | 84 | $, scrollToLatest, setLatest, show, log, install, window.AIDA_BIOS |
| `AIDA_ONE_SPINE/spine/boot_flow.js` | 189 | $, runtime, log, delay, waitFor, ensureDriveConnected, ensureDriveLoaded, ensureAirlock, buildMessages, arrive, continueWake, wakeAida, resumeAfterAirlock, install, window.AIDA_BOOT_FLOW |
| `AIDA_ONE_SPINE/spine/config.js` | 33 | window.AIDA_CONFIG |
| `AIDA_ONE_SPINE/spine/context_evolution.js` | 437 | runtime, log, ensureState, primarySignature, countChars, summarizeTags, textSnippet, buildChunk, unqueuedGroups, maybeQueueReadyChunks, ingest, draftExists, ledgerDraftExists, buildSummaryDraft, prepareSummaryDrafts, buildProjectLedgerDraft, prepareProjectLedgerDrafts, safeSummary, inspect, window.AIDA_CONTEXT_EVOLUTION |
| `AIDA_ONE_SPINE/spine/context_inspector.js` | 448 | $, runtime, log, valueName, directNameCandidates, legacyValueName, safeShape, countArrayLike, findProjectSummaries, findLikelyCount, emotionSummary, preLlmGate, buildContextSummary, inspectContext, inspectShapes, install, direct, window.AIDA_CONTEXT_SUMMARY, window.AIDA_SHAPE_SUMMARY, window.AIDA_CONTEXT_INSPECTOR |
| `AIDA_ONE_SPINE/spine/crash_buffer.js` | 271 | runtime, log, nowIso, copyJson, storage, ensureState, hasWork, buildSnapshot, checkpoint, readSnapshot, runtimeIsEmpty, restore, clear, inspect, install, window.AIDA_CRASH_BUFFER |
| `AIDA_ONE_SPINE/spine/crawler.js` | 828 | runtime, log, nowIso, copyJson, safeArray, storage, ensureState, cleanText, slug, tokenSet, consoleReport, entry, sessionEntries, driveRecordText, driveRecordList, visit, driveType, skipDriveCandidate, driveFallbackScope, driveEntries, librarianEntries, curatorEntries, upsertEntries, persist, loadPersisted, indexNow, scoreEntry, search, entriesForCurrentLlm, glanceText, freshGlance, remember, safeSummary, inspect, install, window.AIDA_CRAWLER |
| `AIDA_ONE_SPINE/spine/curator.js` | 504 | runtime, log, nowIso, copyJson, safeArray, slug, consoleReport, ensureState, upsertById, isLegacyFallbackCandidate, pruneLegacyFallbackCandidates, projectNameFromDraft, latestProjectDraft, classifyFact, reviewFacts, reviewInsights, buildSensitiveContextWrites, buildSalutationSignalWrites, buildRawLogWrites, buildProcessingBacklogWrites, buildDiaryWrites, buildProjectListingDraft, buildProjectBriefcaseWrites, buildWritePlan, removePacketEntries, keepOnlyPacketEntries, reviewLibrarian, getReviewed, safeSummary, inspect, install, window.AIDA_CURATOR |
| `AIDA_ONE_SPINE/spine/director_stage.js` | 472 | $, runtime, privateCharacters, seranaManifest, hydratePrivateCharacters, driveExpressionFile, cleanKey, contextText, isNarrativeContext, promptContract, extractJson, normalizedBeat, assetFor, setStage, transcriptFor, present, runDemo, inspect, install, window.AIDA_DIRECTOR |
| `AIDA_ONE_SPINE/spine/drive_oauth.js` | 928 | $, runtime, config, log, loadGIS, initTokenClient, handleOAuthResponse, requestDriveToken, listDriveFiles, listJsonFiles, fetchJsonFile, isProjectFile, isRealmFile, isRoleFile, isCoreBootFile, indexDriveFiles, driveFileFromIndex, ensureAssetCache, cachedBlobUrl, ensureAllFilesIndexed, fetchBlobUrlByName, putFile, fetchJsonByName, likelyContextFileNames, findIndexedContextFile, valueName, textFrom, latestSummary, normalizeProjectIndex, findLoadFileForProject, buildProjectLedger, projectContextParts, selectActiveProject, listProjects, mapDriveFilesToMind, smokeListDriveJson, fetchBootDriveJson, fetchAllDriveJson, fetchEveryDriveJson, fetchContextJson, install, direct, candidate, globalActivity, summaries, window.AIDA_DRIVE |
| `AIDA_ONE_SPINE/spine/drive_writeback.js` | 603 | runtime, log, nowIso, safeArray, copyJson, slug, consoleReport, ensureState, token, folderId, fileIndex, targetBriefcaseFile, appendUnique, mergeAppendStore, mergeProjectSummary, mergeBriefcase, buildOperations, preview, ensureIndexed, loadExisting, updateFile, createFile, apply, inspect, install, window.AIDA_DRIVE_WRITEBACK |
| `AIDA_ONE_SPINE/spine/emotion_engine.js` | 567 | $, runtime, log, cleanKey, clamp, round, valueName, fileExists, faceMap, coordinates, emotionState, coordinatePoint, statePoint, flattenFaceEntry, faceCandidates, resolveFace, rankedCoordinates, resolveEmotionTarget, currentLabel, defaultForContext, wishlistName, recordSnap, writeState, apply, applyCurrent, applyContextDefault, conversationTarget, afterExchange, inspect, installAssetIndex, install, history, snaps, wishlist, window.AIDA_EMOTIONS |
| `AIDA_ONE_SPINE/spine/glasses.js` | 197 | $, runtime, log, ensureState, kindForType, readAsDataUrl, renderState, prepare, peek, clear, markSent, inspect, install, window.AIDA_GLASSES |
| `AIDA_ONE_SPINE/spine/intent_router.js` | 312 | runtime, log, cleanText, valueName, recentExchanges, packet, systemPrompt, parseJson, normalizeIntent, infer, composerSystemPrompt, composeToolReply, window.AIDA_INTENT_ROUTER |
| `AIDA_ONE_SPINE/spine/librarian.js` | 551 | runtime, log, nowIso, copyJson, safeArray, cleanBriefcaseText, slug, consoleReport, ensureState, upsertById, isLegacyFallbackCandidate, pruneLegacyFallbackCandidates, projectFromPreferred, realmFromPreferred, packetProjectFile, runtimeProject, buildProjectBriefcaseDraft, removePacketEntries, sourceTurnRange, normalizeDiaryDraft, getStaged, safeSummary, evidenceKind, review, prepareArchive, ingestSleep, inspect, install, window.AIDA_LIBRARIAN |
| `AIDA_ONE_SPINE/spine/llm_messages.js` | 556 | $, runtime, log, valueName, countArrayLike, countLikely, emotionSummary, stableJson, boundedSection, looksLikeMemoryRecall, looksLikeLibrarianReview, looksLikeCrawlerSearch, requestedMemoryScope, needsArchive, buildMemoryRetrieval, resolveContext, buildTetrad, preflightGate, buildSystemContent, buildUserContent, buildMessages, previewMessages, install, direct, window.AIDA_LLM_MESSAGES |
| `AIDA_ONE_SPINE/spine/llm_openai.js` | 959 | $, runtime, config, log, pulse, appendChat, setPendingText, projectCommand, isAdoptHistoryCommand, meditationScopeRequest, isFreshGlanceRequest, isFreshGlanceSourcesRequest, isMemoryOverviewRequest, projectReconciliationRequest, projectSummaryRequest, portfolioRequest, isCommandGuideRequest, webSearchRequest, recentMemoryContext, memorySearchRequest, memorySearchFromRoute, memoryNoteRequest, runWebSearch, runMemorySearch, runMemoryNote, runIntentRoute, runCommandGuide, navigationCommand, asksForLlmIdentity, llmIdentityReply, runLocalReply, runProjectCommand, runAdoptHistoryCommand, runNavigationCommand, runFreshGlance, runMemoryOverview, runProjectReconciliation, runProjectSummary, runPortfolio, runFreshGlanceSources, runReturnContextChoice, runPendingStoryTitle, offerUnnamedStorySuggestion, gate, sendText, sendFromInput, install, sourceText, relationshipLines, spinOffLines, text, window... |
| `AIDA_ONE_SPINE/spine/llm_provider.js` | 292 | runtime, config, normalizeProvider, route, providerDefaults, requiresKey, endpointFor, assertBrowserCanReach, modelFor, currentInfo, extractOutputText, extractWebSources, readiness, callMessages, callWebSearch, window.AIDA_LLM_PROVIDER |
| `AIDA_ONE_SPINE/spine/llm_scope.js` | 178 | runtime, normalize, current, ensureAccess, authorizeOnce, retrievalMode, consumeAccess, clearAccess, from, tag, allows, label, applyVisuals, install, window.AIDA_LLM_SCOPE |
| `AIDA_ONE_SPINE/spine/project_context.js` | 1925 | runtime, safeArray, log, isProjectFile, isRealmFile, valueName, keyName, firstPresent, textFrom, latestSummary, isSupersededProject, normalizeProjectIndex, findLoadFileForProject, buildProjectLedger, buildRealmLedger, resolveRealmEntry, contextParts, roleRefs, defaultRoleRefsFor, cleanCheckpointKey, latestExchange, exchangeBelongsToContext, hasUncheckpointedContextWork, checkpointBeforeContextSwitch, resolveRole, select, createDraft, activeLlmProvider, isGenericRpg, sourceRef, historyRecord, isAdoptableRecord, recentAdoptableHistory, openingHint, adoptHistory, suggestUnnamedStory, consumeUnnamedStoryTitle, needsHydration, selectHydrated, hierarchyNeedsHydration, hydrateHierarchy, list, currentProviderAllows, uniqueValues, projectContentCount, projectSnapshot, portfolioText, portfolioCoreTokens, portfolioTokens, sharedPortfolioTokens, mentionsProject, explicitRelationship, relationshipRec... |
| `AIDA_ONE_SPINE/spine/runtime.js` | 225 | window.AIDA_RUNTIME, window.AIDA_MODULES |
| `AIDA_ONE_SPINE/spine/session_capture.js` | 333 | runtime, log, valueName, emotionSnapshot, cleanTag, cleanCustomTags, ensureSession, contextSnapshot, captureExchange, safeSummary, inspectSession, install, direct, tagTrail, window.AIDA_SESSION_CAPTURE |
| `AIDA_ONE_SPINE/spine/sleep_cycle.js` | 1666 | runtime, log, consoleReport, stageWithLibrarian, nowIso, copyJson, latest, exchangeSummary, cleanText, slug, sourceRef, turnsForRange, timeMs, collectionBoundary, turnsForCollection, draftOverlapsCollection, dominantValue, emotionalShape, buildOpenThreads, extractFactCandidates, buildInsightCandidates, buildRawLogEntries, extractSalutationSignals, buildProcessingBacklog, summarizeTurns, buildDistillationForTurns, extractJsonObject, safeArray, currentLlmScope, stampLlmScope, stampPacketLlmScope, confidence, temporaryFactReason, openThreadFromTemporaryFact, isSensitiveOverreach, normalizeLlmReviewDistillation, validateLlmDistillation, makeEmptyLlmDraft, appendUniqueById, selectDraftShelvesForPass, mergeLlmDrafts, buildLlmDistillationMessages, buildLlmJsonRepairMessages, collectSession, collectEvolution, collectEmotion, collectWhileAway, upsertById, fillProjectLedgerDraft, distillPacket, ll... |
| `AIDA_ONE_SPINE/spine/token_fragments.local.example.js` | 33 | window.AIDA_TOKEN_FRAGMENTS |
| `AIDA_ONE_SPINE/spine/token_fragments.local.js` | 5 | window.AIDA_TOKEN_FRAGMENTS |
| `AIDA_ONE_SPINE/spine/while_away.js` | 976 | runtime, log, valueName, collectStrings, collectScopedStrings, pick, parseIso, firstDate, normalizeGapOverride, computeGap, weightedPick, weightedMode, shortText, humanText, conversationalSummary, isThoughtLike, cleanSeed, topicFromSeed, isVagueTopic, naturalizePerspective, concreteTopic, openingModeForGap, gapTimeHint, reentryText, sourceThoughts, ambientCuriositySeeds, add, seedCandidates, thoughtTemplate, buildReentryScript, protocolBand, projectContinuity, curiosityThread, culturalOrHobbyThread, humanQuestion, buildProtocolGreeting, buildThought, setTestGap, clearTestGap, offerThought, inspect, install, direct, laneMemory, faceWishlist, window.AIDA_WHILE_AWAY |

## Live stage

| File | Lines | Visible functions / exports |
| --- | ---: | --- |
| `AIDA_ONE_SPINE/index.html` | 232 | No named functions found; likely markup, config, or inline behavior. |

## Other source

| File | Lines | Visible functions / exports |
| --- | ---: | --- |
| `AIDA_ONE_SPINE/drive_oauth_test.html` | 175 | log, showOriginNote, loadGIS, initOAuth, connectDrive, listJsonFiles, files |
| `Awake/index.html` | 1810 | pressKey, requestToken, renderBriefcaseList, closeBriefcaseModal, getActiveTags, buildPixelGrid, buildSparks, class AidaChassis, pulse, py_list_briefcases, send_to_butler, clear_rolling_summaries, reset_with_briefcase, __init__, get_face_name, spark_layer_fast, spark_layer_slow, add_line, update_face_drive, py_sync_soul, generate_wake_line, try_once, send_message, aida_sleep, restart_engine, window.getActiveTags, window.onload, window.aida_arrive, window.aida_depart, window.py_list_briefcases, window.reset_with_briefcase, window.py_sync_soul |

## Debugging Notes

- Start with `AIDA_ONE_SPINE/index.html`, `spine/runtime.js`, and `spine/boot_flow.js` when the wake sequence itself feels wrong.
- Memory/behavior issues usually cross `spine/project_context.js`, `spine/llm_messages.js`, `spine/session_capture.js`, `spine/context_evolution.js`, `spine/sleep_cycle.js`, and `spine/while_away.js`.
- Drive or private-memory loading problems usually live in `spine/drive_oauth.js`, `spine/drive_writeback.js`, `spine/project_context.js`, and the Drive JSON files they map into `AIDA_RUNTIME.mind`.
- LLM route/key problems usually live in `spine/airlock.js`, `spine/llm_provider.js`, `spine/llm_openai.js`, and `spine/llm_messages.js`.
- Legacy Python organs in `ONE/py` and `gem-Js-pacs/ROOT20260510` are useful comparison points for intended memory, librarian, crawler, butler, role, realm, identity, and emotion behavior.