#!/usr/bin/env python3
"""
Create multiple test sessions with different scenarios.
"""

import json
import urllib.request
import time
import uuid

def send_event(session_id, file_type, content):
    """Send a file update event to the server."""
    url = 'http://localhost:3001/events'
    data = {
        'session_id': session_id,
        'file_type': file_type,
        'content': content
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            return True
    except:
        return False

def create_beginner_session():
    """Create a session for a beginner student."""
    session_id = f"beginner-{uuid.uuid4()}"
    print(f"Creating beginner session: {session_id}")
    
    user_data = {
        "name": "Alice",
        "profile": {
            "experience_level": "beginner",
            "learning_style": "visual",
            "interests": ["AI basics", "history of computing"]
        },
        "preferences": {
            "concise": False,
            "citations": "paths"
        }
    }
    
    graph_data = """graph TD
    slice_1["Introduction"] --> concept_ai["Artificial Intelligence"]
    slice_2["COMPUTING MACHINERY AND INTELLIGENCE"] --> concept_turing["Alan Turing"]
    concept_turing --> concept_ai"""
    
    send_event(session_id, 'user.json', json.dumps(user_data, indent=2))
    send_event(session_id, 'graph.mmd', graph_data)
    return session_id

def create_advanced_session():
    """Create a session for an advanced researcher."""
    session_id = f"advanced-{uuid.uuid4()}"
    print(f"Creating advanced session: {session_id}")
    
    user_data = {
        "name": "Dr. Bob",
        "profile": {
            "experience_level": "expert",
            "learning_style": "analytical",
            "interests": ["machine learning", "cognitive science", "philosophy of mind", "computational complexity"]
        },
        "preferences": {
            "concise": True,
            "citations": "paths"
        }
    }
    
    graph_data = """graph TD
    %% Slices
    slice_1["Introduction"]
    slice_2["COMPUTING MACHINERY AND INTELLIGENCE"]
    slice_3["30 digits. Then the number of states is 10"]
    
    %% Core Concepts
    concept_imitation["Imitation Game"]
    concept_turing_test["Turing Test"]
    concept_digital["Digital Computer"]
    concept_universal["Universal Machine"]
    concept_learning["Learning Machines"]
    
    %% Objections
    obj_theological["Theological Objection"]
    obj_consciousness["Consciousness Objection"]
    obj_mathematical["Mathematical Objection"]
    obj_lady_lovelace["Lady Lovelace's Objection"]
    
    %% Relationships
    slice_2 --> concept_imitation
    concept_imitation --> concept_turing_test
    slice_2 --> concept_digital
    concept_digital --> concept_universal
    slice_3 --> concept_digital
    
    slice_2 --> obj_theological
    slice_2 --> obj_consciousness
    slice_2 --> obj_mathematical
    slice_2 --> obj_lady_lovelace
    
    concept_universal --> concept_learning
    obj_lady_lovelace -.->|refuted by| concept_learning"""
    
    send_event(session_id, 'user.json', json.dumps(user_data, indent=2))
    send_event(session_id, 'graph.mmd', graph_data)
    return session_id

def create_evolving_session():
    """Create a session showing evolution over time."""
    session_id = f"evolving-{uuid.uuid4()}"
    print(f"Creating evolving session: {session_id}")
    
    # Stage 1: Initial state
    user_v1 = {
        "name": "",
        "profile": {
            "experience_level": "unknown",
            "learning_style": "unknown",
            "interests": []
        },
        "preferences": {
            "concise": True,
            "citations": "paths"
        }
    }
    
    graph_v1 = """graph TD
    slice_1["Introduction"]
    slice_2["COMPUTING MACHINERY AND INTELLIGENCE"]
    slice_1-->slice_2"""
    
    send_event(session_id, 'user.json', json.dumps(user_v1, indent=2))
    send_event(session_id, 'graph.mmd', graph_v1)
    time.sleep(0.5)
    
    # Stage 2: Some understanding
    user_v2 = {
        "name": "",
        "profile": {
            "experience_level": "intermediate",
            "learning_style": "mixed",
            "interests": ["Turing test"]
        },
        "preferences": {
            "concise": True,
            "citations": "paths"
        }
    }
    
    graph_v2 = """graph TD
    slice_1["Introduction"]
    slice_2["COMPUTING MACHINERY AND INTELLIGENCE"]
    concept_test["Turing Test"]
    
    slice_1-->slice_2
    slice_2-->concept_test"""
    
    send_event(session_id, 'user.json', json.dumps(user_v2, indent=2))
    send_event(session_id, 'graph.mmd', graph_v2)
    time.sleep(0.5)
    
    # Stage 3: Deep understanding
    user_v3 = {
        "name": "",
        "profile": {
            "experience_level": "intermediate",
            "learning_style": "conceptual",
            "interests": ["Turing test", "machine intelligence", "philosophy of AI", "computational thinking"]
        },
        "preferences": {
            "concise": True,
            "citations": "paths"
        }
    }
    
    graph_v3 = """graph TD
    slice_1["Introduction"]
    slice_2["COMPUTING MACHINERY AND INTELLIGENCE"]
    slice_3["30 digits. Then the number of states is 10"]
    
    concept_test["Turing Test"]
    concept_imitation["Imitation Game"]
    concept_intelligence["Machine Intelligence"]
    concept_thinking["Can Machines Think?"]
    
    slice_1-->slice_2
    slice_2-->slice_3
    slice_2-->concept_imitation
    concept_imitation-->concept_test
    slice_2-->concept_thinking
    concept_thinking-->concept_intelligence
    concept_test-.->concept_intelligence"""
    
    send_event(session_id, 'user.json', json.dumps(user_v3, indent=2))
    send_event(session_id, 'graph.mmd', graph_v3)
    
    return session_id

def main():
    print("Creating multiple test sessions...")
    print("=" * 50)
    
    sessions = []
    
    # Create different types of sessions
    sessions.append(create_beginner_session())
    time.sleep(1)
    
    sessions.append(create_advanced_session())
    time.sleep(1)
    
    sessions.append(create_evolving_session())
    
    print("\n" + "=" * 50)
    print("Created sessions:")
    for sid in sessions:
        print(f"  - {sid}")
    
    print("\nView at: http://localhost:3001/teacher.html")

if __name__ == "__main__":
    main()