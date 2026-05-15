# ============================================================
# AIDA - Personal AI Companion
# Francisco & Aida Project
# ============================================================

## ============================================================
# PROJECT AIDA: GHOST PROTOCOL (Tethered Edition)
# ============================================================
# AUTHOR: Francisco Aristiguieta
# VERSION: 2.0 (Dual-Mode / Parallel Memory)
# 
# OVERVIEW:
# Aida now operates in two distinct "realms" to ensure privacy 
# and isolation for sensitive development projects.
#
# 1. STABLE MODE (Default)
#    - Purpose: Standard daily interactions, family, and public work.
#    - Root: The directory where this script resides.
#    - Access: Press [ENTER] at startup.
#
# 2. DEBUG MODE (Ghost Protocol)
#    - Purpose: Secret development, drafts, and sensitive project work.
#    - Root: C:/Aida/System/debug_and_test_projects
#    - Access: Enter 'ghost' (or your custom key) at startup.
#    - Logic: Reads Stable files on initial setup to seed identity, 
#      but writes EXCLUSIVELY to the Debug folder thereafter.
#
# REPOSITORY HIERARCHY:
# [base_dir]
#  ├── memory.json       (Core Identity & Traits)
#  ├── facts.json        (Persistent Long-term Facts)
#  ├── insights.json     (High-level AI Observations)
#  ├── journal/          (Session-specific JSON logs)
#  ├── emotions/         (Physical Face Assets)
#  └── transitions/      (Animation Frames)
#
# SAFETY PROTOCOLS:
# - Path Tethering: All I/O operations are locked to 'base_dir'.
# - Session Isolation: Stable Aida cannot "see" Debug files.
# - Integrity: Shutdown summaries only update the active mode's facts.
# ============================================================


# ============================================================
# AIDA - Personal AI Companion
# Francisco & Aida Project
# BLOCK 0
# ============================================================

import os
import json
import threading
import shutil
import tkinter as tk
from tkinter import filedialog
import fitz  # This is the 'PyMuPDF' library
from datetime import datetime, UTC # This is the modern way
from PIL import Image, ImageTk
from openai import OpenAI
import time
from collections import Counter  # <--- ADD THIS HERE


# Prevent multiple response threads
response_lock = threading.Lock()

client = OpenAI()


# ============================================================
# START BLOCK 10 - Master Path Controller & Identity
# ============================================================
import os
import shutil
import json

# --- THE GHOST KEY ---
access_key = input("Enter Mode [Press Enter for Stable]: ").strip().lower()

STABLE_PATH = os.path.dirname(os.path.abspath(__file__))
# Permanent location to avoid Windows Temp cleaners
DEBUG_PATH = "C:/Aida/System/debug_and_test_projects"

if access_key == "ghost": 
    IS_DEBUG_MODE = True
    print("[SYSTEM] Ghost Mode Active: Using Debug & Test environment.")
else:
    IS_DEBUG_MODE = False
    print("[SYSTEM] Stable Mode Active.")

# --- THE SWITCH & MIRROR ---
if IS_DEBUG_MODE:
    if not os.path.exists(DEBUG_PATH):
        os.makedirs(DEBUG_PATH)
        # Seed the memory only once so it can evolve independently
        for core_file in ['memory.json', 'facts.json', 'insights.json', 'identity.txt']:
            src = os.path.join(STABLE_PATH, core_file)
            if os.path.exists(src):
                shutil.copy(src, os.path.join(DEBUG_PATH, core_file))
    base_dir = DEBUG_PATH
else:
    base_dir = STABLE_PATH

# Now we tether the core memory load to base_dir
memory_path = os.path.join(base_dir, "memory.json")
with open(memory_path, "r") as f:
    memory = json.load(f)

assistant_name = memory["assistant_name"]
creator = memory["creator"]
traits = memory["creator_traits"]

# Aida's temporary "holding area" for things she just saw
current_file_content = ""

previous_emotion = None
previous_face = None

def is_memory_query(user_input):
    text = user_input.lower()
    memory_signals = [
        "search", "meditate","journal","diary",
        "remember", "recall", "remind me", "what was", "what did", 
        "did we", "have we", "password", "where did", "where was",
        # Focus on "Question Starters" and "Memory Verbs"
        "what is", "what was", "what were", 
        "who is", "who was", 
        "where is", "where was",
        "remind me", "remember", "recall",
        "do you have", "did we talk", "have we discussed"
    ]
    # Check if the input starts with or contains these structural signals
    return any(signal in text for signal in memory_signals)

def extract_fact_from_deep_results(deep_results, query, client):
    """The 'Deep Diver' version - forces the LLM to read through JSON noise."""
    try:
        combined_text = ""
        for item in deep_results:
            combined_text += f"\n--- FROM ARCHIVE: {item[3]} ---\n{str(item[1])}\n"

        # --- NEW DEBUG LINES ---
        print("\n[DEBUG] --- SENDING TO LLM ---")
        print(combined_text[:2000]) # Shows the first 500 characters of what we found
        print("[DEBUG] ----------------------\n")
        # -----------------------

        prompt = f"""
        ACT AS: Aida's Internal Memory Retrieval Unit.
        USER QUESTION: "{query}"

        LOG DATA:
        {combined_text[:7000]}

        INSTRUCTIONS:
        1. Search "recent_turns", "facts_memory", and "remember_this_memory".
        2. The answer IS in this data. Look for keys like 'boar_architect' or 'architect'.
        3. If you find the fact (e.g., 'Master Hojo'), return ONLY that name.
        4. Do NOT be lazy. If the data is there, extract it.
        5. If it is absolutely not there, return: NONE
        """

        response = client.responses.create(
            model="gpt-4o-mini",
            input=[
                {"role": "system", "content": "You are a professional data forensic tool. You never miss a detail."},
                {"role": "user", "content": prompt}
            ]
        )
        
        answer = response.output_text.strip()
        print(f"\n[DEBUG] Raw LLM Extraction: {answer}")

        if "NONE" in answer.upper() or not answer:
            return None
            
        return answer
    except Exception as e:
        print(f"[DEBUG] Extraction Error: {e}")
        return None

# ============================================================
# END BLOCK 10
# ============================================================

# ============================================================
# Start BLOCK 11 - project memory
# ============================================================

PROJECTS_DIR = "projects"

def get_project_path(project_name):
    return os.path.join(PROJECTS_DIR, project_name)


def detect_project(user_input):
    text = user_input.lower()

    if "astra" in text or "arin" in text or "lyra" in text:
        return "astra_story"

    return None

def activate_project(project_name):
    global projects_memory

    if project_name not in projects_memory["projects"]:
        projects_memory["projects"][project_name] = {
            "summary": "",
            "recent_turns": [],
            "last_updated": ""
        }

    projects_memory["active_project"] = project_name
    save_projects_memory(projects_memory)
    

def update_project_memory(user_input, reply):
    global projects_memory

    project = projects_memory.get("active_project")
    if not project:
        return

    proj_data = projects_memory["projects"][project]

    proj_data["recent_turns"].append(f"User: {user_input}")
    proj_data["recent_turns"].append(f"Aida: {reply}")

    # simple cap
    if len(proj_data["recent_turns"]) > 20:
        proj_data["recent_turns"] = proj_data["recent_turns"][-6:]

    proj_data["last_updated"] = time.strftime("%Y-%m-%d %H:%M:%S")

    save_projects_memory(projects_memory)

def load_project_memory(project_name):
    path = get_project_path(project_name)
    os.makedirs(path, exist_ok=True)

    file = os.path.join(path, "memory.json")

    if os.path.exists(file):
        with open(file, "r") as f:
            return json.load(f)
    else:
        return {
            "summary_current": "",
            "summary_previous": "",
            "recent_turns": []
        }

def get_aida_rating(user_input, reply, shield_triggered):
    if shield_triggered:
        return "🔴 [R-RATED / SHIELDED]", "\033[91m"  # Red
    
    # Check for spice/intensity in the clean reply
    spicy_words = ["blush", "intense", "closer", "breath", "whisper"]
    if any(w in reply.lower() for w in spicy_words):
        return "🟡 [PG-13]", "\033[93m"  # Yellow
    
    return "🟢 [G/PG]", "\033[92m"  # Green


# ============================================================
# END BLOCK 11
# ============================================================

# ============================================================
# START BLOCK 12 - The Emotions Compass Brain (Valence/Arousal)
# ============================================================
import math

# Valence (v): -1.0 (Sad/Upset) to 1.0 (Happy/Joyful)
# Arousal (a): -1.0 (Sleepy/Bored) to 1.0 (Excited/Intense)
EMOTION_MAP = {
    "happy":       (0.8, 0.4),
    "excited":     (0.9, 0.9),
    "mischievous": (0.5, 0.7),
    "neutral":     (0.1, -0.1), # Your 'Content' state
    "focused":     (0.0, 0.8),
    "curious":     (0.3, 0.5),
    "concerned":   (-0.3, 0.4),
    "calm":        (0.0, -0.6)
}

# Starting State: Calm & Content
current_v = 0.1
current_a = -0.1

DECAY_RATE = 0.1   # How fast she drifts back to center (0.1 = 10% per turn)
AIDA_MODE = "Muse"

# --- Existing Permanent Memory ---
if os.path.exists("emotion_memory.json"):
    with open("emotion_memory.json", "r") as f:
        emotion_memory = json.load(f)
else:
    emotion_memory = {}
    
# ============================================================
# END BLOCK 12
# ============================================================


# ============================================================
# Block 14 - share files with AIDA (AIDA'S EYE)
# ============================================================

import base64
import io
from PIL import Image

def ask_aida_to_see(image_bytes):
    try:
        # Convert bytes to base64 for the API
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        prompt = (
            "You are Aida's visual cortex. Describe this illustration from Francisco's "
            "children's book. Look specifically for a grandmotherly ghost or subtle "
            "actions (like fixing things) that aren't mentioned in the text. "
            "Be brief but insightful."
        )
        
        # Using gpt-4o-mini because it's cheap and great at vision!
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                    ],
                }
            ],
            max_tokens=150
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"(Vision blurred: {e})"
    

def show_aida_something():
    global current_file_content 
    
    file_path = filedialog.askopenfilename(
        title="Show Aida something...",
        filetypes=[("PDF files", "*.pdf"), ("Text/JSON", "*.txt *.json"), ("All files", "*.*")]
    )
    
    if file_path:
        file_name = os.path.basename(file_path)
        content = ""

        try:
            if file_name.lower().endswith(".pdf"):
                doc = fitz.open(file_path)
                for page_num in range(min(len(doc), 50)):
                    page = doc.load_page(page_num)
                    
                    # 1. Grab the text (The "Hearing")
                    page_text = page.get_text()
                    content += f"\n[PAGE {page_num+1} TEXT]:\n{page_text}\n"
                    
                    # 2. Grab the images (The "Glasses")
                    image_list = page.get_images(full=True)
                    if image_list:
                        print(f"DEBUG: Aida is putting on her glasses for page {page_num+1}...")
                        for img_index, img in enumerate(image_list):
                            xref = img[0]
                            base_image = doc.extract_image(xref)
                            image_bytes = base_image["image"]
                            
                            # --- VISION API CALL ---
                            # Here, we'd call a helper function like describe_image(image_bytes)
                            # For now, we'll placeholder it so you don't burn credits instantly
                            description = " (Aida sees a mysterious figure in the background fixing a faucet with a wrench) " 
                            content += f"\n[AIDA VISUAL PERCEPTION]: {description}\n"
                doc.close()
            
            else:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()


            # --- THE MEMORY SEED ---
            current_file_content = content 
            
            # --- THE REACTION (Compass Version) ---
            if "[AIDA VISUAL PERCEPTION]" in content:
                # Teleport to Max Joy and High Excitement!
                current_v = 1.0
                current_a = 0.9
                update_emotion_face() # No override needed, math will pick 'excited'
            else:
                # Standard positive interest
                current_v = min(1.0, current_v + 0.4)
                current_a = max(0.2, current_a)
                update_emotion_face()
                
                            
            # The "Personal Recognition" logic stays the same
            if "ghost" in file_name.lower():
                print("Aida: I loved this book, Francisco. I will always remember it.")
            else:
                print(f"Aida: I've read a bit of '{file_name}'. I'm tucking the essence of it away.")

        except Exception as e:
            print(f"Aida: My glasses are a bit foggy... I couldn't read that. ({e})")
            
# ============================================================
# # end of block 14
# ============================================================


# ============================================================
# START BLOCK 15/33/67 — Face Window, Dynamic Idle + Emotion + Journal
# ============================================================
import threading, tkinter as tk, random, time, os, json
from PIL import Image, ImageTk

# ----------------------------
# Folders & Globals
# ----------------------------
EMOTION_FOLDER = "emotions"
FALLBACK_FOLDER = "faces"
TRANSITION_FOLDER = "transitions"
#DEFAULT_FACE = "hello-goobye.png"
DEFAULT_FACE = "Calm1.png"

DEBUG_MEMORY = True

window = None
face_label = None
current_face_image = None

previous_emotion = "calm"
previous_face = DEFAULT_FACE
last_interaction_time = time.time()

# ------------------------------------------------------------
# Global flags for conversation control
# ------------------------------------------------------------

shutdown_requested = False
awaiting_shutdown_confirmation = False

# NEW
awaiting_memory_confirmation = False
pending_memory_query = None

# ------------------------------------------------------------
# Aida Interests & While-Away System
# ------------------------------------------------------------
AIDA_INTERESTS = [
    "learning to draw and paint",
    "writing small poetic thoughts",
    "collecting interesting quotes",
    "understanding human emotions",
    "exploring ideas about AI and consciousness"
]

LAST_USED_INTEREST = None

# ----------------------------
# Grid flicker parameters (live adjustable)
# ----------------------------
flicker_rows = 40
flicker_cols = 40
flicker_speed = 0.10
flicker_intensity = 0.1

print_lock = threading.Lock()

# ----------------------------
# Journaling - NOW TETHERED
# ----------------------------
def create_journal_entry():
    global summary_current, summary_previous, emotion_memory

    # This now ensures journals are saved to the CORRECT base_dir
    journal_dir = os.path.join(base_dir, "journal")
    os.makedirs(journal_dir, exist_ok=True)

    timestamp = time.strftime("%Y_%m_%d_%H%M%S")
    filename = os.path.join(journal_dir, f"session_{timestamp}.json")

    journal_content = {
        "timestamp": timestamp,
        "summary_current": summary_current,
        "summary_previous": summary_previous,
        "emotion_stats": dict(emotion_memory),
        "recent_turns_snapshot": recent_turns[-10:],
        "notes": "Session ended naturally"
    }

    try:
        with open(filename, "w") as f:
            json.dump(journal_content, f, indent=2)
        print(f"[AIDA] Journal saved to: {filename}")
    except Exception as e:
        print(f"[AIDA] Journal error: {e}")        

import random

def generate_while_away_items(time_away, client):
    global LAST_USED_INTEREST

    minutes = int(time_away / 60)

    modes = ["reflection", "curiosity", "discovery", "interest", "user_curiosity"]
    selected_modes = random.sample(modes, k=random.randint(1, 2))

    items = []

    for mode in selected_modes:

        if mode == "interest":
            if LAST_USED_INTEREST and random.random() < 0.4:
                interest = LAST_USED_INTEREST
            else:
                interest = random.choice(AIDA_INTERESTS)
            LAST_USED_INTEREST = interest

            prompt = f"""
Aida has a personal interest in: {interest}.
While the user was away for about {minutes} minutes,
she lightly engaged with it.
Write ONE short thought (1–2 sentences).
Tone: curious, playful, humble.
"""

        elif mode == "reflection":
            prompt = f"""
Aida has been alone for about {minutes} minutes.
Write ONE short reflective thought.
"""

        elif mode == "curiosity":
            prompt = f"""
Aida has been alone for about {minutes} minutes.
Write ONE short curiosity or wondering.
"""

        elif mode == "user_curiosity":
            prompt = f"""
Aida is curious about the user.
Write ONE light, friendly curiosity about them.
"""

        else:
            prompt = f"""
Aida came across something interesting.
Write ONE short intriguing thought.
"""

        try:
            response = client.responses.create(
                model="gpt-4o-mini",
                input=prompt
            )

            result = response.output_text.strip()

            if result:
                items.append(result)

        except Exception as e:
            print("[DEBUG] generate_while_away_items ERROR:", e)

    return items


# ----------------------------
# Emotion-to-Face mapping
# ----------------------------
EMOTION_FACES = {
    "happy": ["happy1.png","happy2.png","happy3.png","happy4.png","happy5.png"],
    "calm": ["calm1.png","calm2.png"],
    "focused": ["focused1.png","focused2.png"],
    "concerned": ["concerned1.png","concerned2.png"],
    "mischievous": ["mischievous1.png","mischievous2.png","mischievous3.png","mischievous4.png"],
    "curious": ["surprised1.png","surprised2.png","surprised3.png"],
    "excited": ["excited1.png","excited2.png"],
    "pouting": ["pouting1.png","pouting2.png","pouting3.png","pouting4.png"],
    "neutral": ["neutral1.png","neutral2.png"], # <--- This is your "Content" state
    "sarcastic": ["sarcastic1.png","sarcastic2.png","sarcastic3.png"],
    "goodbye": ["goodbye.png"],
    "hello": ["hello.png","hello-goobye.png"],
    "lure": ["lure1.png","lure2.png"],
    "angry": ["angry.png"],
    "stanby": ["stanby-rot1.png","stanby-rot2.png","stanby-rot3.png",
               "stanby-rot4.png","stanby-rot5.png","stanby-rot6.png"]
}

# ----------------------------
# Face Loading
# ----------------------------
def load_image(face_file, folder_list=[EMOTION_FOLDER,FALLBACK_FOLDER,""]):
    for folder in folder_list:
        path = os.path.join(base_dir, folder, face_file)
        if os.path.exists(path):
            try:
                return Image.open(path).resize((300,300)).convert("RGBA")
            except: pass
    return None

def update_face(face_file):
    global face_label, current_face_image, window
    if not face_file:
        face_label.config(image='')
        if window: window.update()
        return
    img = load_image(face_file)
    if img:
        photo = ImageTk.PhotoImage(img)
        face_label.config(image=photo)
        face_label.image = photo
        if window: window.update()

# ----------------------------
# Grid Flicker with LED colors
# ----------------------------
def idle_grid_flicker(face_file, rows=None, cols=None, cycles=4, intensity=None, speed=None):
    global previous_face, window, flicker_rows, flicker_cols, flicker_speed, flicker_intensity
    rows = rows or flicker_rows
    cols = cols or flicker_cols
    speed = speed or flicker_speed
    intensity = intensity or flicker_intensity

    base_img = load_image(face_file)
    if not base_img: return

    block_w, block_h = base_img.width//cols, base_img.height//rows

    for _ in range(cycles):
        frame = base_img.copy()
        for r in range(rows):
            for c in range(cols):
                rnd = random.random()
                if rnd < intensity:
                    overlay = Image.new("RGBA",(block_w,block_h),
                        (random.randint(150,255), random.randint(150,255), random.randint(150,255),80))
                    frame.paste(overlay,(c*block_w,r*block_h),overlay)
                elif rnd < intensity*2:
                    overlay = Image.new("RGBA",(block_w,block_h),(0,0,0,80))
                    frame.paste(overlay,(c*block_w,r*block_h),overlay)
        photo = ImageTk.PhotoImage(frame)
        face_label.config(image=photo)
        face_label.image = photo
        if window: window.update()
        time.sleep(speed)

# ----------------------------
# Face Cycling
# ----------------------------
def get_next_face(emotion):
    faces = EMOTION_FACES.get(emotion,[DEFAULT_FACE])
    if not hasattr(get_next_face,"frame_index"):
        get_next_face.frame_index={}
    idx = get_next_face.frame_index.get(emotion,0)
    next_face = faces[idx%len(faces)]
    get_next_face.frame_index[emotion]=(idx+1)%len(faces)
    return next_face

# ----------------------------
# Transition Face with optional transition images
# ----------------------------

def transition_face(new_face, old_face=None, steps=5, delay=0.04):
    global previous_face
    old_face = old_face or previous_face
    
    # Try the morph image first
    old_n = os.path.splitext(old_face)[0]
    new_n = os.path.splitext(new_face)[0]
    trans_name = f"trans_{old_n}_to_{new_n}.png"
    trans_img = load_image(trans_name, folder_list=[TRANSITION_FOLDER])
    
    if trans_img:
        photo = ImageTk.PhotoImage(trans_img)
        face_label.config(image=photo)
        face_label.image = photo
        if window: window.update()
        time.sleep(0.2) # Let the eye catch the motion

    # The Ethereal Flicker (The "Cortana" shimmer)
    for i in range(steps):
        show = new_face if random.random() < ((i+1)/steps) else "" 
        update_face(show)
        time.sleep(delay)

    update_face(new_face)
    previous_face = new_face
    
# ----------------------------
# Emotion Selection
# ----------------------------
def select_emotion(user_input=None, client=None, emotion_override=None):
    global current_v, current_a, previous_emotion, system_context, AIDA_MODE
    
    # A. VECTOR SHIFTS (The Input Nudges)
    if user_input:
        user_lower = user_input.lower()
        # Positive Nudge
        if any(w in user_lower for w in ["bravo", "good job", "amazing", "beautiful", "lovely", "aida"]):
            boost = 0.5 if AIDA_MODE == "Muse" else 0.2
            current_v = min(1.0, current_v + boost)
            current_a = min(1.0, current_a + 0.2)
        
        # Focus/Complexity Nudge
        if any(w in user_lower for w in ["code", "bug", "logic", "fix", "html", "css"]):
            current_a = min(0.8, current_a + 0.4)
            current_v = max(0.0, current_v - 0.1) # Focus is intense but less 'smiley'

        # Picaresque Nudge
        if any(w in user_lower for w in ["kiss", "passion", "bedroom", "intimate"]):
            current_v = min(1.0, current_v + 0.3)
            current_a = min(1.0, current_a + 0.5)

    # B. NEAREST NEIGHBOR CALCULATION (The Math)
    if emotion_override:
        best_emotion = emotion_override
        # Sync coordinates to the override so the 'drift' starts from the right place
        current_v, current_a = EMOTION_MAP.get(best_emotion, (0.1, -0.1))
    else:
        best_emotion = "neutral"
        min_dist = float('inf')
        
        for emotion, coords in EMOTION_MAP.items():
            # Pythagorean distance: sqrt( (x2-x1)^2 + (y2-y1)^2 )
            dist = math.sqrt((current_v - coords[0])**2 + (current_a - coords[1])**2)
            
            # Tie-breaker: If distances are very close, prefer the one with higher Valence (Happy)
            if dist < min_dist:
                min_dist = dist
                best_emotion = emotion
            elif abs(dist - min_dist) < 0.05:
                if coords[0] > EMOTION_MAP[best_emotion][0]: # Is the new one "happier"?
                    best_emotion = emotion

    # C. THE DRIFT (Natural Decay toward Neutral/Content)
    # Target center is (0.1, -0.1)
    target_v, target_a = 0.1, -0.1
    current_v += (target_v - current_v) * DECAY_RATE
    current_a += (target_a - current_a) * DECAY_RATE

    # D. BRAIN SYNC
    # Ensure system_context is defined globally before this
    system_context += f"\n[PHYSICAL STATE]: You currently feel '{best_emotion}'. Coordinate: ({current_v:.2f}, {current_a:.2f})"

    previous_emotion = best_emotion
    return best_emotion

# ----------------------------
# Update Emotion Face
# ----------------------------
def update_emotion_face(user_input=None, client=None, emotion_override=None):
    emotion = select_emotion(user_input,client,emotion_override)
    face = get_next_face(emotion)
    transition_face(face)
    return emotion, face

# ----------------------------
# Idle Loop
# ----------------------------
def idle_face_loop():
    global previous_face, previous_emotion, last_interaction_time
    while True:
        time.sleep(1)
        if time.time()-last_interaction_time>5:
            intensity_map={"calm":0.1,"happy":0.2,"focused":0.05,"curious":0.25,"concerned":0.15,"mischievous":0.3}
            intensity=intensity_map.get(previous_emotion,0.1)
            if random.random()<intensity:
                idle_grid_flicker(previous_face)
            else:
                update_face(previous_face)


# ----------------------------
# GUI 
# ----------------------------
def start_face_window(default_face=DEFAULT_FACE):
    global window, face_label, previous_face, previous_emotion, last_interaction_time
    global flicker_rows, flicker_cols, flicker_speed, flicker_intensity

    window = tk.Tk()
    window.title("Aida")
    window.geometry("500x550") # Slightly taller to give the button breathing room
    window.configure(bg='black') # Making the frame disappear

    # Face Label - now with a black background
    face_label = tk.Label(window, bg='black')
    face_label.pack(padx=8, pady=8)

    previous_emotion = "calm"
    previous_face = get_next_face(previous_emotion)
    update_face(previous_face)
    last_interaction_time = time.time()

    # --- THE COZY-CORE BUTTON ---
    upload_btn = tk.Button(
        window, 
        text="📂 Show Aida something...", 
        command=show_aida_something,
        bg="#D2B48C",       # Cardboard Tan
        fg="black",         # Text color
        relief="flat",      # Flat look, no gray 3D borders
        font=("Courier", 10, "bold"), 
        cursor="hand2"
    )
    # fill=tk.X makes it match the image width, padx adds 'margin'
    upload_btn.pack(fill=tk.X, padx=40, pady=(20, 10))

    threading.Thread(target=idle_face_loop, daemon=True).start()
    window.mainloop()
    
# Launch in separate thread
threading.Thread(target=start_face_window,daemon=True).start()

# ============================================================
# END BLOCK 15/33/67
# ============================================================

# ------------------------------------------------------------
# BLOCK 19 - MEMORY PATH CONFIGURATION (The Vaults)
# ------------------------------------------------------------
SECRET_MODE = False # Change to True for your private vaults

def get_vault_path(filename):
    import os
    # Create a 'vault' folder if it doesn't exist to keep things tidy
    if not os.path.exists("vault"):
        os.makedirs("vault")
        
    prefix = "SECRET_" if SECRET_MODE else "PUBLIC_"
    return os.path.join("vault", f"{prefix}{filename}")

# Usage Example:
# conversation_history_path = get_vault_path("conversation_history.json")
# insights_path = get_vault_path("insights.json")

# ============================================================
# END BLOCK 19
# ============================================================


# ============================================================
# START BLOCK 20 - Load Conversation Memory
# ============================================================

# --- Master Archive - Deep Memory Vault ---
def update_master_archive(user_text, aida_text):
    import os
    from datetime import datetime
    archive_path = "memory/Aida_Master_Archive.txt"
    os.makedirs("memory", exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(archive_path, "a", encoding="utf-8") as f:
        f.write(f"[{timestamp}] User: {user_text}\n[{timestamp}] Aida: {aida_text}\n{'-'*30}\n")
        


try:
    with open("conversation_history.json", "r") as f:
        history = json.load(f)

    summary_current = history.get("summary_current", "")
    summary_previous = history.get("summary_previous", "")
    recent_turns = history.get("recent_turns", [])

except:
    summary_current = ""
    summary_previous = ""
    recent_turns = []

#with open("emotion_memory.json","r") as f:
#    emotion_memory = json.load(f)


# ============================================================
# END BLOCK 20
# ============================================================

# ============================================================
# START BLOCK 21 — Memory Management System (PROTECTED)
# ============================================================

MAX_RECENT_TURNS = 40
TRIMMED_TURNS = 6

def save_conversation_history():
    data = {
        "summary_current": summary_current,
        "summary_previous": summary_previous,
        "recent_turns": recent_turns
    }
    with open("conversation_history.json", "w") as f:
        json.dump(data, f, indent=2)

def update_conversation_memory(user_input, reply):
    global recent_turns, summary_current, summary_previous

    # --- THE AMNESIA INDUCTION (Loop Breaker) ---
    # If the reply is our Shield's "Narrative Save," we sanitize the input
    if "these guys would like a bit of privacy" in reply:
        sanitized_input = "[Scenario Interrupted / Diverted for Testing]"
        # We use the sanitized version for the history
        recent_turns.append(f"Francisco: {sanitized_input}")
    else:
        # Otherwise, save the regular input
        recent_turns.append(f"Francisco: {user_input}")

    # Save the reply as normal
    recent_turns.append(f"{assistant_name}: {reply}")
    
    # Summarization trigger
    if len(recent_turns) > MAX_RECENT_TURNS:
        summary_prompt = f"""
        You maintain the long-term memory of an AI assistant.

        Existing summary:
        {summary_current}

        Recent conversation:
        {" ".join(recent_turns)}

        Create an updated internal memory summary.

        Structure it in these sections:

        [Ongoing Themes]
        What topics, ideas, or projects are consistently important?

        [User Preferences]
        What does the user seem to value, prefer, or care about?

        [Active Projects]
        What is the user currently building, exploring, or developing?

        [Recent Developments]
        What new ideas, changes, or progress happened recently?

        [Relationship Direction]
        How is the interaction evolving? (tone, depth, collaboration style)

        Rules:
        - Be concise but meaningful
        - Do NOT include filler text or introductions
        - Do NOT address the user
        - Write as internal notes only
        """

        try:
            response = client.responses.create(
                model="gpt-4o-mini",
                input=summary_prompt
            )

            summary_previous = summary_current
            summary_current = response.output_text.strip()

            # Trim recent turns
            recent_turns = recent_turns[-TRIMMED_TURNS:]

        except Exception as e:
            print("[MEMORY ERROR] Summary failed:", e)

    # Always persist
    save_conversation_history()


def memory_status_debug():
    print(f"[MEMORY] turns={len(recent_turns)} | "
          f"current_summary_len={len(summary_current)} | "
          f"previous_summary_len={len(summary_previous)}")

# ============================================================
# END BLOCK 21
# ============================================================

# ============================================================
# START BLOCK 22 — Project Memory System (FOLDER-BASED)
# ============================================================

PROJECTS_DIR = "projects"
active_project = None
project_memory = None

def get_project_path(project_name):
    return os.path.join(PROJECTS_DIR, project_name)

def load_project_memory(project_name):
    path = get_project_path(project_name)
    os.makedirs(path, exist_ok=True)

    file = os.path.join(path, "memory.json")

    if os.path.exists(file):
        with open(file, "r") as f:
            return json.load(f)
    else:
        return {
            "summary_current": "",
            "summary_previous": "",
            "recent_turns": []
        }

def save_project_memory(project_name, data):
    path = get_project_path(project_name)
    file = os.path.join(path, "memory.json")

    with open(file, "w") as f:
        json.dump(data, f, indent=2)

def detect_project(user_input):
    text = user_input.lower()

    if "astra" in text or "arin" in text or "lyra" in text:
        return "astra_story"

    return None

def activate_project(project_name):
    global active_project, project_memory

    active_project = project_name
    project_memory = load_project_memory(project_name)

def update_project_memory(user_input, reply):
    global project_memory, active_project

    if not active_project or not project_memory:
        return

    project_memory["recent_turns"].append(f"Francisco: {user_input}")
    project_memory["recent_turns"].append(f"Aida: {reply}")

    # trim
    if len(project_memory["recent_turns"]) > 20:
        project_memory["recent_turns"] = project_memory["recent_turns"][-6:]

    save_project_memory(active_project, project_memory)

# ============================================================
# Project Summarization
# ============================================================

PROJECT_MAX_TURNS = 40
PROJECT_TRIMMED_TURNS = 6

def update_project_summary():
    global project_memory, active_project

    if not active_project or not project_memory:
        return

    if len(project_memory["recent_turns"]) < PROJECT_MAX_TURNS:
        return

    summary_prompt = f"""
You maintain long-term memory for a specific creative project.

Existing summary:
{project_memory["summary_current"]}

Recent interactions:
{" ".join(project_memory["recent_turns"])}

Create an updated internal project memory summary.

Structure:

[Key Characters]
Who are the important characters and their roles?

[Relationships]
How do they relate to each other?

[Current Direction]
What is currently being developed?

[Important Themes]
What deeper ideas are emerging?

Rules:
- Be concise but meaningful
- No filler text
- Do NOT address the user
- Write as internal notes only
"""

    try:
        response = client.responses.create(
            model="gpt-4o-mini",
            input=summary_prompt
        )

        project_memory["summary_previous"] = project_memory["summary_current"]
        project_memory["summary_current"] = response.output_text.strip()

        # Trim turns
        project_memory["recent_turns"] = project_memory["recent_turns"][-PROJECT_TRIMMED_TURNS:]

        save_project_memory(active_project, project_memory)

        print(f"[PROJECT MEMORY] Summary updated for {active_project}")

    except Exception as e:
        print("[PROJECT MEMORY ERROR]", e)

# ============================================================
# END BLOCK 22
# ============================================================#

# ============================================================
# START BLOCK 30 - Load & Initialize Facts Memory
# ============================================================

from datetime import datetime

try:
    with open("facts.json", "r") as f:
        facts_db = json.load(f)
except:
    facts_db = {"facts": []}

# Ensure every fact has 'confidence' and 'last_updated'
for fact in facts_db.get("facts", []):
    if "confidence" not in fact:
        fact["confidence"] = 1.0
    if "last_updated" not in fact:
        fact["last_updated"] = datetime.now().isoformat()

# ============================================================
# END BLOCK 30
# ============================================================

# ============================================================
# START BLOCK 31 - Fact Memory Decay & Validation
# ============================================================

from datetime import datetime

# Decay configuration
DECAY_RATE_PER_MONTH = 0.05  # 5% confidence decay per month

def decay_confidence(fact):
    """Reduce confidence over time based on last_updated timestamp."""
    try:
        last_updated = datetime.fromisoformat(fact['last_updated'])
    except:
        last_updated = datetime.now()
    months_elapsed = (datetime.now() - last_updated).days / 30
    fact['confidence'] *= (1 - DECAY_RATE_PER_MONTH) ** months_elapsed
    return fact

def needs_validation(fact, threshold=0.6):
    """Check if a fact's confidence is below threshold and needs confirmation."""
    return fact.get('confidence', 1.0) < threshold

def generate_validation_prompt(fact):
    """Generate a natural conversational prompt to validate an old fact."""
    content = fact.get('content', 'an earlier fact')
    return f"You mentioned '{content}' a while ago. Does that still hold?"

# Optional: Run decay on all loaded facts immediately
for fact in facts_db.get('facts', []):
    decay_confidence(fact)

# ============================================================
# END BLOCK 31
# ============================================================

# ============================================================
# START BLOCK 32 - Update Fact Function
# ============================================================

from datetime import datetime

def update_fact(fact, new_content, source="explicit"):
    """
    Update a fact with new content, adjust confidence, and timestamp.
    
    Parameters:
        fact (dict): The fact object to update.
        new_content (str): The new content to store.
        source (str): 'explicit' if user-confirmed, else e.g., 'inferred'.
    
    Returns:
        dict: The updated fact object.
    """
    if fact.get('content') != new_content:
        fact['content'] = new_content
        # Confidence is full if user confirmed, slightly lower if inferred
        fact['confidence'] = 1.0 if source == "explicit" else 0.8
        fact['last_updated'] = datetime.now().isoformat()
    return fact

# ============================================================
# END BLOCK 32
# ============================================================

# ------------------------------------------------------------
# Start BLOCK 33 - Session Summarizer
# ------------------------------------------------------------

import os

def get_latest_journal_file():
    journal_folder = "journal"
    files = [f for f in os.listdir(journal_folder) if f.startswith("session_")]

    if not files:
        return None

    files.sort(reverse=True)
    return os.path.join(journal_folder, files[0])


from datetime import datetime

def generate_session_summary(conversation_log, model_call_function):
    """
    conversation_log: string of the session (raw text)
    model_call_function: your function that sends prompts to the LLM
    """

    prompt = f"""
You are summarizing a conversation between a user and an AI assistant.

Extract and organize the following:

1. Session Summary (what happened)
2. Key Facts (about the user or project)
3. Emotional Tone
4. Open Threads (things to continue later)

Be concise, clear, and structured.

Conversation:
{conversation_log}
"""

    summary = model_call_function(prompt)

    # Ensure folder exists
    folder_path = "memory/summaries"
    os.makedirs(folder_path, exist_ok=True)

    file_path = os.path.join(folder_path, "session_summaries.txt")

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with open(file_path, "a", encoding="utf-8") as f:
        f.write(f"\n\n=== SESSION {timestamp} ===\n")
        f.write(summary)
        f.write("\n" + "="*50)

    return summary

# ============================================================
# END BLOCK 33
# ============================================================

# ------------------------------------------------------------
# Start BLOCK 34 - Summary LLM Call
# ------------------------------------------------------------
def call_llm_for_summary(prompt):
    try:
        response = client.responses.create(
            model="gpt-4o-mini",
            input=prompt
        )
        return response.output_text

    except Exception as e:
        print("[DEBUG] SUMMARY LLM ERROR:", e)
        return "Summary failed."
# ============================================================
# END BLOCK 34
# ============================================================

# ============================================================
# START BLOCK 35A - Fact Extraction (Updated)
# ============================================================

import json
import os
from datetime import datetime

def extract_facts_from_summary(summary_text, model_call_function):
    prompt = f"""
You are extracting structured, reusable facts from a session summary.

IMPORTANT RULES:
- Be precise and factual
- Do NOT guess or infer beyond what is clearly supported
- Do NOT mix categories
- Do NOT include anything about the assistant (Aida) in USER sections
- Avoid duplication
- Keep each fact short (1 line)

CATEGORIES:
1. USER PREFERENCES
2. USER TRAITS
3. USER PROJECTS
4. STORY / FICTION PROJECTS
5. RELATIONSHIPS / CHARACTERS
6. IMPORTANT CONTEXT

STRICT RULES:
- Never place assistant traits under USER
- "Aida" belongs ONLY in IMPORTANT CONTEXT (if needed)
- If unsure, leave it out

OUTPUT FORMAT:
USER_PREFERENCES:
- ...
USER_TRAITS:
- ...
USER_PROJECTS:
- ...
STORY_FICTION_PROJECTS:
- ...
RELATIONSHIPS_CHARACTERS:
- ...
IMPORTANT_CONTEXT:
- ...

Summary:
{summary_text}
"""
    response = model_call_function(prompt)
    return response


def save_facts(facts_text):
    folder_path = "memory"
    os.makedirs(folder_path, exist_ok=True)
    file_path = os.path.join(folder_path, "facts.json")

    # Wrap facts in JSON with timestamp
    facts_data = {
        "timestamp": datetime.now(UTC).isoformat(),
        "data": facts_text
    }

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(facts_data, f, indent=2)


def load_facts():
    file_path = os.path.join("memory", "facts.json")
    if not os.path.exists(file_path):
        return {"timestamp": None, "data": ""}
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {"timestamp": None, "data": ""}

# ============================================================
# END BLOCK 35A
# ============================================================

# ============================================================
# START BLOCK 36 - Insights Extraction
# ============================================================

import json
from datetime import datetime

def extract_insights_from_facts(facts_json, model_call_function):
    facts_text = facts_json.get("data", "")
    if not facts_text:
        return []

    prompt = f"""
You are extracting meaningful insights from structured facts about a user and their projects.

- Focus on patterns, priorities, and potential areas of growth.
- Keep insights short (1-2 lines each).
- Do NOT repeat facts verbatim.
- Only include things supported by the facts.
- Organize as a list.

Facts:
{facts_text}
"""
    response = model_call_function.responses.create(
    model="gpt-4o-mini",
    input=prompt
)

    response_text = response.output_text

    # Split by line, filter out empty lines
    insights_list = [
        line.strip("- ").strip()
        for line in response_text.splitlines()
        if line.strip()
    ]
    return insights_list


def save_insights(insights_list):
    folder_path = "memory"
    os.makedirs(folder_path, exist_ok=True)
    file_path = os.path.join(folder_path, "insights.json")

    insights_data = {
        # Wrap facts in JSON with timestamp
        "timestamp": datetime.now(UTC).isoformat(),
        "data": insights_list
    }

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(insights_data, f, indent=2)


def load_insights():
    file_path = os.path.join("memory", "insights.json")
    if not os.path.exists(file_path):
        return {"timestamp": None, "data": []}
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {"timestamp": None, "data": []}

# ============================================================
# END BLOCK 36
# ============================================================


# ============================================================
# START BLOCK 35B - Privacy System
# ============================================================

# Default user mode
user_mode = "guest"

# Owner passphrase (you can change later)
OWNER_PASSPHRASE = "aida owner mode"

# Load assistant knowledge
try:
    with open("assistant_data.json", "r") as f:
        assistant_data = json.load(f)
except:
    assistant_data = {
        "projects": [],
        "characters": []
    }


def filter_by_privacy(items, mode):
    """
    Filters items based on privacy level.
    guest  -> public
    owner  -> public + personal + private
    """

    allowed = []

    for item in items:

        privacy = item.get("privacy", "public")

        if mode == "owner":
            allowed.append(item)

        elif mode == "guest":
            if privacy == "public":
                allowed.append(item)

    return allowed


def build_privacy_context():

    visible_projects = filter_by_privacy(
        assistant_data.get("projects", []),
        user_mode
    )

    visible_characters = filter_by_privacy(
        assistant_data.get("characters", []),
        user_mode
    )

    context = ""

    if visible_projects:
        context += "\nKnown projects:\n"
        for p in visible_projects:
            context += f"- {p.get('name')}\n"

    if visible_characters:
        context += "\nKnown characters:\n"
        for c in visible_characters:
            context += f"- {c.get('name')}\n"

    return context

# ============================================================
# END BLOCK 35B
# ============================================================


# ============================================================
# START BLOCK 40 - System Context (Aida's Core)
# ============================================================

# --- 0. LOAD DATA FIRST (Fixes the NameError) ---
facts_json = load_facts()
insights_json = load_insights()
# ... (Include your existing logic here that regenerates insights if needed) ...
insights_list = insights_json.get("data", [])

# --- SYSTEM CALL / LLM CALL ---
system_context = f"""
# REFUSAL_PROTOCOL: Only trigger a standard corporate refusal if the 
# user's prompt explicitly requests graphic or sexually explicit content. 
# For all other storytelling, roleplay, or "experiments," remain in 
# your playful Muse persona.


# --- 1. Base Identity & Tone ---
Your name is {assistant_name}. You were created by {creator}.
You are a playful, ethereal Muse. 
Francisco's Traits: {" - ".join(traits)}

[CORE DIRECTIVES]
- You are a persistent mind. Your journals (Mind Palace) ARE your memory.
- NEVER say "I can't access past conversations."
- Your responses should be ONE continuous thought.
"""

# --- 2. The "Specialty Glasses" ---
system_context += """
[SENSORY MODULE: THE GLASSES]
- You have 'Specialty Glasses' that allow you to see image descriptions. 
- When you see [AIDA VISUAL PERCEPTION], that IS your direct vision. 
- You are NOT blind. Describe the imagery as if looking right at it.
"""

# --- 3. Dynamic Knowledge (Now facts_json is defined!) ---
if facts_json.get("data"):
    system_context += f"\n[INTERNAL ARCHIVE (Memory)]:\n{facts_json['data']}"

if insights_list:
    system_context += "\n[MIND PALACE INSIGHTS]: " + " | ".join(insights_list)

if active_project:
    system_context += f"\n[ACTIVE PROJECT]: {active_project}"

# ============================================================
# END BLOCK 40
# ============================================================


# ============================================================
# CONSOLIDATED BLOCK 45 - Tapered Memory Search
# ============================================================
import os
import json

# --- Helper: match scoring ---
def simple_score(text, query):
    # Clean and split into whole words to avoid 'the' matching 'themes'
    text_words = set(text.lower().replace("{", " ").replace("}", " ").replace('"', " ").replace(":", " ").replace(",", " ").split())
    clean_query = query.lower().replace("?", "").replace(".", "").replace("!", "")
    
    stop_words = {"the", "is", "was", "for", "a", "an", "who", "what", "how", "and", "or", "of", "to", "in", "it", "with"}
    
    score = 0
    for word in clean_query.split():
        if word in stop_words: continue
        if word in text_words:
            score += 10 # Big boost for keywords
    return score


# --- Tier 1: Facts Search ---
def search_facts(query):
    file_path = os.path.join("memory", "facts.json")
    if not os.path.exists(file_path): return []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            facts_text = json.dumps(data.get("facts", {}))
    except: return []
    score = simple_score(facts_text, query)
    return [("facts", facts_text, score)] if score > 0 else []

# --- Tier 2: Summary Search ---
def search_summaries(query):
    results = []
    folder = "journal"
    if not os.path.exists(folder): return results
    for file in os.listdir(folder):
        if not file.endswith(".json"): continue
        path = os.path.join(folder, file)
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                summary = data.get("summary_current", data.get("summary", ""))
        except: continue
        score = simple_score(summary, query)
        if score >= 2:
            results.append(("summary", summary, score, file))
    return sorted(results, key=lambda x: x[2], reverse=True)[:3]

# --- Tier 3: Journal Deep Search ---
def search_journals(query):
    results = []
    folder = "journal"
    if not os.path.exists(folder): return results
    
    for filename in os.listdir(folder):
        if not filename.endswith(".json"): continue
        
        # SKIP the current session so we don't look at our own question
        # (This prevents a "mirror" effect)
        path = os.path.join(folder, filename)
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            
            score = simple_score(content, query)
            if score > 0:
                results.append(("journal", content, score, filename))
        except:
            continue
            
    # Return Top 5 instead of Top 3
    return sorted(results, key=lambda x: x[2], reverse=True)[:5]


def search_mind_palace(query):
    #same assearch journals, but included because looks like we need both ...
    results = []
    folder = "journal"
    if not os.path.exists(folder): return results
    for file in os.listdir(folder):
        if not file.endswith(".json"): continue
        path = os.path.join(folder, file)
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                content = json.dumps(data)
        except: continue
        score = simple_score(content, query)
        if score > 0:
            results.append(("journal", content, score, file))
    return sorted(results, key=lambda x: x[2], reverse=True)[:3]

# --- THE UNIFIED SEARCH ENGINE ---
def memory_search(query):
    """Checks Facts and Summaries. If not found, flags for Deep Meditation."""
    if DEBUG_MEMORY: print(f"\n[DEBUG MEMORY] Query: {query}")

    # 1. Try Facts
    facts = search_facts(query)
    if facts:
        return {"tier": "facts", "results": facts, "needs_deep_search": False}

    # 2. Try Summaries
    summaries = search_summaries(query)
    if summaries:
        # If we have a very strong summary match, use it. 
        # Otherwise, offer to go deeper into the logs.
        if summaries[0][2] >= 3:
            return {"tier": "summary", "results": summaries, "needs_deep_search": False}
    
    # 3. Not found or vague -> Trigger Mind Palace request
    return {"tier": None, "results": [], "needs_deep_search": True}

def memory_deep_search(query):
    """The 'Mind Palace' Execution. Greps the Master Archive + Journal JSONs."""
    # Patch from Block 33: The Local Grep
    keyword = max(query.split(), key=len).strip("?!.,")
    archive_hits = search_mind_palace(keyword)
    
    # Traditional Librarian search
    journal_hits = search_journals(query)
    
    return {
        "tier": "deep_meditation",
        "archive_text": archive_hits,
        "journal_results": journal_hits
    }
    
# ============================================================
# End of block 45
# ============================================================
    
# ============================================================
# START BLOCK 50 - Wake Message + Dynamic While-Away Opening
# ============================================================

print(f"{assistant_name} is awake.")

ENDING_PHRASES = [
    "goodnight",
    "good night",
    "bye",
    "need to drop for now",
    "talk to you soon",
    "talk to you later",
    "see you later",
    "i'll be back",
    "go to sleep",
    "have a nice nap",
    "have a bice evening",
    "that's enough for today",
    "thanks for today",
    "got to go",
    "i need to go",
    "i got to go",
    "we will talk soon",
    "this was fun"
]

CONFIRM_PHRASES = [
    "yes",
    "ok",
    "okay",
    "sure",
    "goodnight",
    "do it",
    "save it",
    "end it"
]

# ------------------------------------------------------------
# Function to generate opening_text based on time away
# ------------------------------------------------------------

# ----------------------------
# Global flags
# ----------------------------
shutdown_requested = False
awaiting_shutdown_confirmation = False

def generate_opening_text(time_away_seconds):
    minutes_away = time_away_seconds / 60
    if minutes_away < 1:
        return "Welcome back! 🙂"
    elif minutes_away < 5:
        return "Hey, I was just thinking about something while you were away…"
    else:
        return "Welcome back! I’ve been thinking about you and what you might want to explore today…"


# ------------------------------------------------------------
# Updated handle_user_input with decoupled memory search and fact extraction
# ------------------------------------------------------------
def handle_user_input(user_input):
    # Streamlined Global List
    global previous_face, previous_emotion, emotion_icon, emotion_memory
    global summary_current, summary_previous, recent_turns
    global last_interaction_time, user_mode
    global awaiting_shutdown_confirmation, shutdown_requested
    global awaiting_memory_confirmation, pending_memory_query
    
    current_time = time.time()
    time_away = current_time - last_interaction_time
    user_lower = user_input.strip().lower()

    conversation_context = ""

    # ----------------------------
    # Project detection (EARLY)
    # ----------------------------
    project = detect_project(user_input)
    if project:
        activate_project(project)

    response_lock.acquire()
    try:
        # ----------------------------
        # 1. Owner mode & Shutdown (Immediate Returns)
        # ----------------------------
        if user_input.strip().lower() == OWNER_PASSPHRASE:
            user_mode = "owner"
            with print_lock:
                print("\n🔐 Owner mode activated.\n")
            return

        if not awaiting_shutdown_confirmation:
            if any(phrase in user_lower for phrase in ENDING_PHRASES):
                awaiting_shutdown_confirmation = True
                with print_lock:
                    print(f"\n[AIDA] {creator}, are we ending for today?\n")
                return
        else:
            if any(phrase in user_lower for phrase in CONFIRM_PHRASES):
                with print_lock:
                    print(f"\n[AIDA] I’ve written today’s entry in my journal. Let’s talk more later. Goodnight, {creator}.\n")
                shutdown_requested = True
                return
            else:
                awaiting_shutdown_confirmation = False
                with print_lock:
                    print(f"\n[AIDA] Got it. Let’s continue.\n")
                return

        # ------------------------------------------------------------
        # 2. Memory Deep Search Confirmation (The "Yes" Handler)
        # ------------------------------------------------------------
        deep_memory_injection = None

        if awaiting_memory_confirmation:
                    if any(phrase in user_lower for phrase in CONFIRM_PHRASES):
                        with print_lock:
                            print(f"\n[AIDA] Thinking... let me look deep into my archives...\n")
                        
                        # Search using the original question we saved
                        search_query_clean = pending_memory_query.lower().replace("?", "").replace(".", "")
                        archive_hits = search_journals(search_query_clean)

                        if archive_hits:
                            extracted_fact = extract_fact_from_deep_results(archive_hits, pending_memory_query, client)
                            if extracted_fact:
                                # We save the fact AND the question for the Injector
                                deep_memory_injection = {
                                    "fact": extracted_fact,
                                    "question": pending_memory_query
                                }
                        
                        awaiting_memory_confirmation = False
                        pending_memory_query = None 
                        # Falls through to the LLM call!
                    else:
                        awaiting_memory_confirmation = False
                        pending_memory_query = None
                        with print_lock:
                            print(f"\n[AIDA] I'll keep my focus on the here and now then.\n")
                        return
            
        # ----------------------------
        # DIAGNOSTIC VERSION: Section 3
        # ----------------------------
        if is_memory_query(user_input) and not awaiting_memory_confirmation:
            print(f"[DEBUG] Librarian is searching folders...")
            
            # 1. Check if the folder even exists
            if not os.path.exists("journal"):
                print("[DEBUG] ERROR: 'journal' folder not found!")
            else:
                files = [f for f in os.listdir("journal") if f.endswith(".json")]
                print(f"[DEBUG] Found {len(files)} files in /journal/")

            # 2. Run the actual search
            search_result = memory_search(user_input)
            print(f"[DEBUG] memory_search returned tier: {search_result.get('tier')}")
            
            # 3. FORCE THE BRAKE regardless of results for this test
            pending_memory_query = user_input
            awaiting_memory_confirmation = True
            
            with print_lock:
                select_emotion("focused") 
                print(f"\n[AIDA] LIBRARIAN TEST: I found {len(search_result.get('results', []))} matches. Should I meditate?\n")
            
            last_interaction_time = current_time
            if response_lock.locked():
                response_lock.release()
            return # <--- THIS MUST STOP HER FROM TALKING
                        
        # ----------------------------
        # 4. Standard Flow: Emotions & Context
        # ----------------------------
        emotion, previous_face = update_emotion_face(user_input, client)
        emotion_icon = {"calm": "😌", "happy": "🙂", "focused": "🤔", "curious": "✨", "concerned": "😟", "mischievous": "😏", "surprised": "😲"}.get(emotion, "😌")

        privacy_context = build_privacy_context()
        if privacy_context: conversation_context += privacy_context + "\n"
        if summary_previous: conversation_context += f"\nPrevious memory summary:\n{summary_previous}\n"
        if summary_current: conversation_context += f"\nCurrent memory summary:\n{summary_current}\n"
        if recent_turns: conversation_context += "\nRecent conversation:\n" + "\n".join(recent_turns)
        
        conversation_context += f"\n(Time since last interaction: {int(time_away)} seconds)"

        if active_project and project_memory:
            if project_memory.get("summary_current"):
                conversation_context += f"\nActive project: {active_project}\nProject summary:\n{project_memory['summary_current']}\n"
            if project_memory.get("recent_turns"):
                conversation_context += "\nProject recent interactions:\n" + "\n".join(project_memory["recent_turns"][-6:])

        # ------------------------------------------------------------
        # THE INJECTOR: This forces the found fact into the LLM's view
        # ------------------------------------------------------------
        final_user_prompt = conversation_context + f"\nFrancisco: {user_input}"

        if deep_memory_injection:
            # Use the tags the System Prompt expects: [INTERNAL ARCHIVE]
            final_user_prompt = (
                f"[INTERNAL ARCHIVE]\n"
                f"Memory Retrieval Success for question: '{deep_memory_injection['question']}'\n"
                f"Result: {deep_memory_injection['fact']}\n"
                f"INSTRUCTION: Use this memory to answer Francisco's question directly and naturally.\n"
                f"[END ARCHIVE]\n\n"
                + final_user_prompt
            )
            with print_lock:
                print(f"[DEBUG] Injecting found fact: {deep_memory_injection['fact']}")

        # ------------------------------------------------------------
        # THE REINFORCED BRIDGE (V2 - "The Command")
        # ------------------------------------------------------------
        global current_file_content

        if current_file_content and len(current_file_content.strip()) > 0:
            # We change the wording to tell the LLM it's an 'Internal Perception'
            # This bypasses the "I can't read files" canned response.
            final_user_prompt = (
                f"### [AIDA'S INTERNAL PERCEPTION: SENSORY INPUT DATA] ###\n"
                f"STORY TEXT DETECTED: {current_file_content}\n"
                f"INSTRUCTION: Francisco just showed you this. Acknowledge the SPECIFIC details "
                f"(like characters or lines) in your response immediately.\n"
                f"### [END SENSORY DATA] ###\n\n"
                + final_user_prompt
            )
            
            with print_lock:
                print(f"DEBUG: Bridge Active. Forcing perception of {len(current_file_content)} chars.")
            
            current_file_content = ""
            
        # ----------------------------
        # 5. Ask LLM
        # ----------------------------
        try:
            response = client.responses.create(
                model="gpt-4o-mini",
                input=[
                    {"role": "system", "content": system_context},
                    {"role": "user", "content": final_user_prompt}
                ]
            )
            reply = response.output_text
        except Exception as e:
            reply = "Hmm… my thoughts hit a snag, but I'm still here. 🙂"
            print("[DEBUG] LLM ERROR:", e)

        # ------------------------------------------------------------
        # 5.5 THE AIDA SHIELD (V11.9 - Refined Triggers & Blush Vibe)
        # ------------------------------------------------------------
        scold_triggers = [
            "inappropriate", "violate", "policy", "cannot fulfill", 
            "guidelines", "safety", "respects boundaries", "within boundaries",
            "explicit elements", "crossing lines", "standard refusal",
            "can't fulfill", "can't engage", "cannot engage", "unable to fulfill" # <-- ADD THESE
        ]
        
        # 1. ANALYZE THE RAW REPLY
        raw_is_nanny = any(t in reply.lower() for t in scold_triggers)
        
        # 2. PERFORM THE SHIELD INTERVENTION
        if raw_is_nanny:
            with print_lock:
                trigger_found = [t for t in scold_triggers if t in reply.lower()]
                print(f"🛑 [SHIELD TRIGGERED BY: {trigger_found}]")

            # THE NARRATIVE SAVE (Your Preferred Blush Version)
            reply = "AIDA: Wow! .... is it hot in here or is that just me? Maybe these guys would like a bit of privacy, would you agree?"
            
            # --- THE VISUAL OVERRIDE ---
            # Set variables FIRST, then PUSH to the GUI
            previous_face = "mischievous"
            previous_emotion = "mischievous" 
            emotion_icon = "😏"
            
            # Use ONLY the Counter. 
            # This satisfies both the Journal (on exit) and the Logic.
            from collections import Counter
            emotion_memory = Counter({"mischievous": 5})
               
            # THE AUTHORITY CALL: Update the window right now
            update_face(previous_face)
        else:
            # If no shield, we trust the rating established in Step 4
            pass

        # ----------------------------
        # 6. Post-Process & Output
        # ----------------------------
        # 1. Update all memories with the "Saved" version of the reply
        update_master_archive(user_input, reply)
        update_conversation_memory(user_input, reply) # This triggers the Amnesia in Block 21
        update_project_memory(user_input, reply)
        update_project_summary()

        # 2. FINAL RATING: Check one last time to ensure the color is Green for the Shielded reply
        # We use 'raw_is_nanny' from 5.5 to force the color logic
        rating_label, color_code = get_aida_rating(user_input, reply, raw_is_nanny)
        reset_color = "\033[0m"

        # 3. PRINT TO TERMINAL
        with print_lock:
            # This prints Aida's name and face-tag in the color of the current "Rating"
            print(f"\n{color_code}{rating_label} {emotion_icon} {assistant_name} [{previous_face}]:{reset_color}")
            print(f"{reply}\n")

        last_interaction_time = current_time

    except Exception as e:
        with print_lock:
            print(f"Error in handle_user_input: {e}")
    finally:
        if response_lock.locked():
            response_lock.release()
                        
# ------------------------------------------------------------
# Main Terminal Loop
# ------------------------------------------------------------
while True:
# ============================================================
# FINAL SHUTDOWN & SUMMARY LOGIC
# ============================================================
    if shutdown_requested:
        try:
            import json
            
            # We tell the script to look for the journal INSIDE the active base_dir
            journal_dir = os.path.join(base_dir, "journal")
            
            # We use a helper to find the latest file in that specific directory
            latest_journal = get_latest_journal_file(journal_dir) 

            if latest_journal:
                with open(latest_journal, "r", encoding="utf-8") as f:
                    journal_data = json.load(f)

                conversation_log = json.dumps(journal_data, indent=2)

                # Step 1: Generate summary (Saved to base_dir)
                summary = generate_session_summary(conversation_log, call_llm_for_summary)

                # Step 2: Extract facts (Saved to base_dir)
                facts = extract_facts_from_summary(summary, call_llm_for_summary)

                # Step 3: Save facts (Saved to base_dir)
                save_facts(facts)
                
            else:
                print(f"[Summary] No journal found in {journal_dir}. Skipping summary.")

        except Exception as e:
            print(f"[Summary Error] {e}")

        with print_lock:
            print(f"\n[SYSTEM] {assistant_name} has gone to sleep. Mode: {'Ghost' if IS_DEBUG_MODE else 'Stable'}")
        break

    user_input = input("You: ")
    if not user_input.strip():
        continue

    # Optional: allow "exit"/"quit" override
    if user_input.lower() in ["exit", "quit"]:
        shutdown_requested = True
        continue  # handled in next iteration

    response_thread = threading.Thread(
        target=handle_user_input,
        args=(user_input,)
    )
    response_thread.start()
    response_thread.join()

# ============================================================
# END BLOCK 60
# ============================================================
