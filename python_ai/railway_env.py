# railway_env.py
import gymnasium as gym
from gymnasium import spaces
import numpy as np

class RailwayEnv(gym.Env):
    """A custom environment for the train traffic control problem."""
    def __init__(self, num_trains=20):
        super(RailwayEnv, self).__init__()
        
        self.num_trains = num_trains
        
        # ACTION SPACE: For each train -> 0:Normal, 1:Speed Boost, 2:Slow Down, 3:Use Loop, 4:Emergency Stop
        self.action_space = spaces.MultiDiscrete([5] * self.num_trains)
        
        # OBSERVATION SPACE: [pos, speed, type(0-1), is_stuck, is_emergency, track_ahead_clear]
        self.observation_space = spaces.Box(low=0, high=1, shape=(self.num_trains, 6), dtype=np.float32)

    def reset(self, seed=None, options=None):
        # This is simplified for training. The server will use the live state from JS.
        self.train_states = np.random.rand(self.num_trains, 6)
        # Ensure emergency flag is off at the start
        self.train_states[:, 4] = 0 
        return self.train_states, {}

    def step(self, action):
        # This function is used by the AI during training to learn the consequences of its actions.
        reward = 0
        
        for i in range(self.num_trains):
            is_emergency = self.train_states[i][4] == 1.0
            
            # RULE: Handle Emergency Stop logic
            if is_emergency:
                if action[i] == 3: # AI chooses 'Use Loop' to clear the track
                    reward += 200 # Massive reward for correct emergency procedure
                else:
                    reward -= 200 # Massive penalty for doing anything else
                continue # No other rules apply in an emergency

            # RULE: Reward speeding up on a clear track, penalize doing so unsafely
            is_stuck = self.train_states[i][3] == 1.0
            track_ahead_clear = self.train_states[i][5] == 1.0
            if action[i] == 1 and track_ahead_clear:
                reward += 10 
            elif action[i] == 1 and not track_ahead_clear:
                 reward -= 10

            # RULE: Reward using a loop to solve a traffic jam
            if action[i] == 3 and is_stuck:
                reward += 25 
            
            # RULE: Penalize slowing down high-priority trains unnecessarily
            is_express = self.train_states[i][2] > 0.6
            if is_express and (action[i] == 0 or action[i] == 2):
                reward -= 5
                
        terminated = False # In this setup, training runs for a fixed number of steps
        truncated = False
        info = {}
        return self.train_states, reward, terminated, truncated, info