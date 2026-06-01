import pandas as pd
import numpy as np
import joblib
import os
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.neural_network import MLPRegressor
from sklearn.model_selection import train_test_split

# 1. Configuration
DATA_PATH = 'Back-End/data/public_datasets/UNSW-NB15_1_cleaned.csv'
MODEL_DIR = 'Back-End/ml_model/autoencoders'
os.makedirs(MODEL_DIR, exist_ok=True)

print("Loading cleaned data...")
df = pd.read_csv(DATA_PATH, low_memory=False)

# Identify features
# Drop labels if they exist to ensure purely unsupervised training
cols_to_drop = ['srcip', 'dstip', 'attack_cat', 'Label']
df = df.drop(columns=[col for col in cols_to_drop if col in df.columns])

# Robust Port Conversion Helper
def convert_port(port):
    try:
        if isinstance(port, str):
            if port.startswith('0x'):
                return int(port, 16)
            return int(port)
        return int(port)
    except:
        return 0 # Default for non-numeric/unknown ports

print("Converting port columns to numeric...")
df['sport'] = df['sport'].apply(convert_port)
df['dsport'] = df['dsport'].apply(convert_port)

categorical_features = ['proto', 'state', 'service']
numerical_features = [col for col in df.columns if col not in categorical_features]

# 2. Preprocessing Pipeline
preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), numerical_features),
        ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_features)
    ])

# 3. Autoencoder Architecture (using MLPRegressor)
# Input features -> Hidden Layer (Bottleneck) -> Output (Reconstruct Input)
# We set the hidden layer sizes to create a bottleneck (e.g., 30, 15, 30)
autoencoder = MLPRegressor(
    hidden_layer_sizes=(30, 15, 30),
    activation='relu',
    solver='adam',
    max_iter=50, # Set to a low number for initial setup, can be increased
    random_state=42,
    verbose=True
)

pipeline = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('autoencoder', autoencoder)
])

# 4. Training
print("Preprocessing and fitting Autoencoder...")
# In an Autoencoder, the target (y) is the same as the input (X)
X = df
# For unsupervised training, we usually train on "Normal" data only if available,
# but here we use the provided dataset to learn the baseline.
X_train, X_test = train_test_split(X, test_size=0.2, random_state=42)

# Fit preprocessor first to transform X for the target y
X_train_transformed = preprocessor.fit_transform(X_train)

print(f"Input dimension after encoding: {X_train_transformed.shape[1]}")

# Train the model
pipeline.fit(X_train, X_train_transformed)

# 5. Save Model and Preprocessor
joblib.dump(pipeline, os.path.join(MODEL_DIR, 'autoencoder_pipeline.pkl'))
print(f"Model saved to {MODEL_DIR}/autoencoder_pipeline.pkl")

# 6. Feature Extraction Example
X_test_transformed = preprocessor.transform(X_test)
X_test_reconstructed = autoencoder.predict(X_test_transformed)
mse = np.mean(np.power(X_test_transformed - X_test_reconstructed, 2), axis=1)

metrics = {
    "mean_mse": float(mse.mean()),
    "max_mse": float(mse.max()),
    "threshold": 0.5
}
joblib.dump(metrics, os.path.join(MODEL_DIR, 'metrics.pkl'))

print("\n### Model Statistics ###")
print(f"Mean Reconstruction Error (MSE): {mse.mean():.6f}")
print(f"Max Reconstruction Error: {mse.max():.6f}")
