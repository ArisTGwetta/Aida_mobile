# 1. Load realm
realm_engine = RealmEngine(realm_config)
realm_ctx = realm_engine.get_resolved_realm()


from realm_engine import RealmEngine

rpg_config = load_json("realm_rpg.json")
realm_engine = RealmEngine(rpg_config)
realm_ctx = realm_engine.get_resolved_realm()
tone_mods = realm_engine.get_tone_modifiers()
constraints = realm_engine.get_constraints()





# 2. Load identity
identity_engine = IdentityEngine(core_identity, realm_ctx, role_ctx)
identity_ctx = identity_engine.get_resolved_identity()


from identity_engine import IdentityEngine

engine = IdentityEngine(core_identity, realm_config, role_config)
identity_ctx = engine.get_resolved_identity()
tone = engine.get_tone()
safety = engine.get_safety_rules()
role = engine.get_active_role()






triad = assemble_triad(
    core_identity=core_identity_json,
    realm_config=realm_json,
    role_config=role_json
)
