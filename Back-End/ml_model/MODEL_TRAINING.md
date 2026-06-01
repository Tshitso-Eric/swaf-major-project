# Smart WAF (SWAF) Model Training Documentation

This document provides a detailed technical overview of the training processes for the two machine learning models integrated into the Smart Web Application Firewall: **XGBoost** (Supervised Classification) and **Autoencoder** (Unsupervised Anomaly Detection).

---

## 1. XGBoost Model (Supervised Learning)

### **Dataset**
- **Primary Source:** [UNSW-NB15 Dataset](https://research.unsw.edu.au/projects/unsw-nb15-dataset)
- **Files Used:** `UNSW_NB15_training-set.csv` (175,341 rows) and `UNSW_NB15_testing-set.csv` (82,332 rows).
- **Class Balance:** 
  - Training: ~68% Attack, ~32% Normal.
  - Testing: ~55% Attack, ~45% Normal.
- **Data Integrity:** Categorical values (proto, service, state) were retained, and leaking columns like `id` and `attack_cat` were dropped to prevent overfitting.

### **Classifier & Architecture**
- **Model:** `XGBClassifier` from the XGBoost library.
- **Pipeline:** Scikit-learn `Pipeline` incorporating a `ColumnTransformer`.
  - **Numerical Features:** Passed through without scaling (XGBoost is invariant to monotonic transformations).
  - **Categorical Features:** Processed via `OneHotEncoder` with `handle_unknown='ignore'`.

### **Feature Extraction & Engineering**
- **Training Phase:** Features were used directly from the CSV (e.g., `sttl`, `sbytes`, `rate`, `ct_state_ttl`).
- **Inference Phase (WAF Integration):** Since HTTP requests do not inherently provide network flow features, the `HybridMLEngine` maps request attributes to UNSW-NB15 features:
  - **SQLi/XSS/Command Injection Markers:** Mapped to high `sttl` (252), high `rate` (200k), and `ct_state_ttl=2`.
  - **Benign Traffic:** Mapped to low `sttl` (62), standard `rate` (10k), and `ct_state_ttl=0`.

### **Hyperparameter Tuning**
- **Objective:** `binary:logistic` / `logloss`.
- **Key Parameters:**
  - `n_estimators`: 1000 (with early stopping at 20 rounds).
  - `max_depth`: 6.
  - `learning_rate`: 0.05.
  - `scale_pos_weight`: 0.47 (calculated as Normal:Attack ratio to handle imbalance).
  - `threshold`: Dynamically tuned (**0.3** for suspicious requests, **0.6** for standard traffic).

---

## 2. Autoencoder Model (Unsupervised Learning)

### **Dataset**
- **Primary Source:** `UNSW-NB15_1_cleaned.csv`.
- **Approach:** Purely unsupervised reconstruction learning. The model learns the statistical structure of "Normal" network behavior to identify anomalies.

### **Classifier & Architecture**
- **Model:** `MLPRegressor` configured as an Autoencoder.
- **Architecture:** 
  - **Input Layer:** Matches encoded feature dimension.
  - **Hidden Layers (Bottleneck):** `(30, 15, 30)`.
  - **Output Layer:** Reconstructs the input features.
- **Activation Function:** `ReLU`.
- **Optimizer:** `Adam`.

### **Feature Extraction**
- **Preprocessing:** 
  - **Numerical Features:** `StandardScaler` (crucial for Neural Network convergence).
  - **Categorical Features:** `OneHotEncoder`.
- **Dimension:** The input dimension is expanded significantly after One-Hot Encoding (e.g., from 40 to ~200+ features depending on protocols).

### **Feature Tuning & Evaluation**
- **Training Logic:** The model was trained to minimize the difference between input $X$ and reconstructed output $X'$.
- **MSE (Mean Squared Error):** This metric is used as the "Anomaly Score".
- **Threshold Tuning:** 
  - A threshold of **5.0** was established. 
  - Any request resulting in a reconstruction error (MSE) > 5.0 is flagged as an **Autoencoder_Anomaly**.

---

## 3. Hybrid Decision Logic

The WAF utilizes both models in a cascaded architecture for maximum detection coverage:

1.  **Static Rules:** Regex matching for known signatures.
2.  **XGBoost:** High-speed classification of mapped network features. Catches 95%+ of common web attacks (SQLi, XSS, Path Traversal).
3.  **Autoencoder:** Last line of defense. Identifies "Zero-day" attacks or highly irregular traffic patterns that don't match known supervised labels.

**Inference Speed:** Average `< 0.05ms` per request.
