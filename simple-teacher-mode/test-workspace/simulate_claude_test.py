#!/usr/bin/env python3
"""
Simulate Claude operations to test the hook system.
This creates test events that the hooks would normally capture.
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
        headers={
            'Content-Type': 'application/json',
            'User-Agent': 'Test-Client/1.0'
        }
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(f"✓ Sent {file_type}: {result}")
            return True
    except Exception as e:
        print(f"✗ Failed to send {file_type}: {e}")
        return False

def main():
    # Generate a test session ID
    session_id = f"test-{uuid.uuid4()}"
    print(f"Testing with session ID: {session_id}")
    print("-" * 50)
    
    # Test 1: Initial read of user.json
    print("\n1. Simulating initial read of user.json...")
    initial_user = {
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
    send_event(session_id, 'user.json', json.dumps(initial_user, indent=2))
    time.sleep(1)
    
    # Test 2: Update user.json with profile
    print("\n2. Simulating update to user.json...")
    updated_user = {
        "name": "",
        "profile": {
            "experience_level": "intermediate",
            "learning_style": "conceptual",
            "interests": ["AI foundations", "Turing test", "machine intelligence", "computational theory"]
        },
        "preferences": {
            "concise": True,
            "citations": "paths"
        }
    }
    send_event(session_id, 'user.json', json.dumps(updated_user, indent=2))
    time.sleep(1)
    
    # Test 3: Initial graph.mmd
    print("\n3. Simulating initial graph.mmd...")
    initial_graph = """graph TD
slice_1["Introduction"]
slice_2["COMPUTING MACHINERY AND INTELLIGENCE"]
slice_3["30 digits. Then the number of states is 10"]
slice_1-->slice_2
slice_2-->slice_3"""
    send_event(session_id, 'graph.mmd', initial_graph)
    time.sleep(1)
    
    # Test 4: Enhanced graph with concepts
    print("\n4. Simulating enhanced graph.mmd with Turing concepts...")
    enhanced_graph = """graph TD
    slice_1["Introduction"]
    slice_2["COMPUTING MACHINERY AND INTELLIGENCE"]
    slice_3["30 digits. Then the number of states is 10"]
    
    %% Concept nodes
    concept_imitation["Imitation Game"]
    concept_turing_test["Turing Test"]
    concept_digital_computer["Digital Computer"]
    concept_learning_machines["Learning Machines"]
    concept_objections["Nine Objections"]
    
    %% Slice connections
    slice_1-->slice_2
    slice_2-->slice_3
    
    %% Concept relationships
    slice_2-->concept_imitation
    concept_imitation-->concept_turing_test
    slice_2-->concept_digital_computer
    slice_3-->concept_digital_computer
    slice_2-->concept_learning_machines
    slice_2-->concept_objections
    
    %% Concept interconnections
    concept_turing_test-.->concept_learning_machines
    concept_digital_computer-->concept_learning_machines"""
    
    send_event(session_id, 'graph.mmd', enhanced_graph)
    
    print("\n" + "=" * 50)
    print("Test complete!")
    print(f"\nTo view results:")
    print(f"1. Open http://localhost:3001/teacher.html")
    print(f"2. Look for session: {session_id}")
    print(f"\nAPI check:")
    print(f"curl http://localhost:3001/sessions/{session_id} | jq")

if __name__ == "__main__":
    main()