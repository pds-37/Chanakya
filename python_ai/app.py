# /python_ai/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from stable_baselines3 import PPO
from railway_env import RailwayEnv # Must be imported for the model to load

app = Flask(__name__)
CORS(app)

# --- Model Loading ---
try:
    model = PPO.load("ppo_railway_model.zip")
    print("✅ AI Model loaded successfully!")
except Exception as e:
    print(f"❌ Could not load model: {e}")
    model = None

# --- Helper Functions ---

def state_to_observation(state_json):
    """
    Converts the rich JSON state from the JS client into a simple Numpy array with the
    correct (20, 5) shape for the model.
    """
    trains = state_json['trains']
    type_map = {'express': 1.0, 'passenger': 0.5, 'freight': 0.0}
    
    # ✅ FINAL FIX: Shape is now (20, 5) to match the trained model's expectation.
    obs = np.zeros((20, 5), dtype=np.float32)
    
    for i in range(20):
        if i < len(trains):
            train = trains[i]
            
            # Use .get() with default values for safe access
            obs[i, 0] = train.get('position', 0)
            obs[i, 1] = train.get('speedFactor', 1.0)
            obs[i, 2] = type_map.get(train.get('type'), 0.5)
            obs[i, 3] = 1.0 if train.get('stuckBehind') else 0.0
            obs[i, 4] = 1.0 if train.get('status') == 'emergency_stop' else 0.0
            # The 6th feature that caused the shape mismatch has been removed.
            
    return obs

def action_to_recommendation(actions, state_json):
    """Converts the model's numerical action into a JSON recommendation for the JS client."""
    recommendations = []
    trains = state_json['trains']
    for i, act in enumerate(actions):
        if i >= len(trains): break
        
        train = trains[i]
        # These are essential keys; if they're missing, it's a bad request,
        # and the error will be caught by the main handler's try/except block.
        rec = {"trainId": train['id'], "decisionTrack": train['currentTrack']}
        
        if act == 1:
            rec.update({"type": "🚀 AI Speed Boost", "text": f"Path clear for {train['type']} {train['id']}. Recommend speed boost.", "action": "speed_boost"})
            recommendations.append(rec)
        elif act == 2:
            rec.update({"type": "🐌 AI Speed Reduction", "text": f"Congestion ahead of {train['id']}. Recommend reducing speed.", "action": "speed_reduce"})
            recommendations.append(rec)
        elif act == 3:
            is_emergency = train.get('status') == 'emergency_stop'
            
            # Safely create the loop_id
            try:
                loop_id = "LOOP_" + train['currentTrack'].split('_')[0]
            except (IndexError, AttributeError):
                continue # If currentTrack format is wrong, skip this recommendation

            if is_emergency:
                rec.update({"type": "🔴 EMERGENCY ACTION", "text": f"Divert emergency train {train['id']} to {loop_id} to clear main line.", "action": "reroute_loop", "newRouteSegment": [loop_id]})
            else:
                rec.update({"type": "🔄 AI Overtake", "text": f"Use {loop_id} for {train['id']} to overtake.", "action": "reroute_loop", "newRouteSegment": [loop_id]})
            recommendations.append(rec)
            
    return recommendations

# --- API Endpoint ---
@app.route('/get_recommendation', methods=['POST'])
def get_recommendation():
    """Handles the recommendation request with robust error handling and validation."""
    if not model:
        return jsonify({"error": "AI model is not loaded or available."}), 503

    state_json = request.json
    
    if not state_json or 'trains' not in state_json:
        return jsonify({"error": "Invalid or missing 'trains' data in request body."}), 400

    try:
        observation = state_to_observation(state_json)
        action, _ = model.predict(observation, deterministic=True)
        recommendations = action_to_recommendation(action, state_json)
        return jsonify(recommendations)
    
    except KeyError as e:
        return jsonify({"error": f"Request failed due to missing data in a train object: {e}"}), 400
    
    except Exception as e:
        print(f"❌ An unexpected error occurred: {e}")
        return jsonify({"error": "An internal server error occurred."}), 500

# --- Main Execution ---
if __name__ == '__main__':
    app.run(port=5000)