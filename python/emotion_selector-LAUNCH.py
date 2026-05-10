selector = EmotionSelector()

result = selector.select_emotion(
    valence=current_state["valence"],
    arousal=current_state["arousal"]
)

emotion_label = result["label"]
face_filename = result["face"]

if result["gap_candidate"]:
    # Log this for gap detection:
    # - current v,a
    # - between_labels (if any)
    # - maybe increment a counter in emotion_memory.json
    pass

# Then pass `face_filename` to your Drive loader to fetch the blob.
