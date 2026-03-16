# /python_ai/train_model.py (for Google Colab)

# 1. Install libraries in the Colab notebook
# !pip install stable-baselines3[extra] gymnasium

# 2. Upload your 'railway_env.py' to the Colab session files

# 3. Import modules
from stable_baselines3 import PPO
from railway_env import RailwayEnv 

# 4. Create the environment
env = RailwayEnv()

# 5. Instantiate and train the PPO model with optimized parameters
model = PPO("MlpPolicy", env, verbose=1, n_steps=2048, batch_size=64, n_epochs=10, gamma=0.99)

print("--- Starting AI Model Training ---")
# Train for a significant number of steps to get good results
model.learn(total_timesteps=1_000_000)
print("--- Training Complete ---")

# 6. Save the trained model
model_path = "ppo_railway_model.zip"
model.save(model_path)
print(f"Model saved to {model_path}")

# 7. Download the model file
# from google.colab import files
# files.download(model_path)