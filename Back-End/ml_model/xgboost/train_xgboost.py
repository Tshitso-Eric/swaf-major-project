import pandas as pd
import numpy as np
import joblib
import os
import time
import matplotlib.pyplot as plt
from xgboost import XGBClassifier
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    classification_report, accuracy_score, precision_score, 
    recall_score, f1_score, roc_auc_score, confusion_matrix
)

# Configuration
TRAIN_DATA = 'Back-End/data/public_datasets/UNSW_NB15_training-set.csv'
TEST_DATA = 'Back-End/data/public_datasets/UNSW_NB15_testing-set.csv'
MODEL_DIR = 'Back-End/ml_model/xgboost'
os.makedirs(MODEL_DIR, exist_ok=True)

def train_model():
    print("Step 1: Get the data ready")
    # Step 2: Initial data inspection
    print("Step 2: Initial data inspection")
    train_df = pd.read_csv(TRAIN_DATA)
    test_df = pd.read_csv(TEST_DATA)
    
    print(f"Training shape: {train_df.shape}")
    print(f"Testing shape: {test_df.shape}")
    
    train_balance = train_df['label'].value_counts(normalize=True)
    print(f"Training Class Balance:\n{train_balance}")
    
    if train_df.isnull().sum().sum() > 0:
        print(f"Missing values found: {train_df.isnull().sum().sum()}")
        train_df.fillna(0, inplace=True)
        test_df.fillna(0, inplace=True)

    # Step 3: Drop leaking/irrelevant columns
    print("Step 3: Drop leaking/irrelevant columns")
    # We drop 'id', 'attack_cat' as requested. 'srcip' and 'dstip' are not in this dataset version.
    cols_to_drop = ['id', 'attack_cat']
    
    # Step 4: Split features vs target
    print("Step 4: Split features vs target")
    X_train = train_df.drop(columns=cols_to_drop + ['label'])
    y_train = train_df['label']
    
    X_test = test_df.drop(columns=cols_to_drop + ['label'])
    y_test = test_df['label']

    # Step 5: Handle categorical features
    print("Step 5: Handle categorical features")
    categorical_features = ['proto', 'service', 'state']
    numerical_features = [col for col in X_train.columns if col not in categorical_features]
    
    # We'll use a ColumnTransformer for one-hot encoding
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', 'passthrough', numerical_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ])

    # Step 6: Check class imbalance
    print("Step 6: Check class imbalance")
    counts = y_train.value_counts()
    ratio = counts[0] / counts[1]
    print(f"Normal: {counts[0]}, Attack: {counts[1]}, Ratio: {ratio:.2f}")

    # Step 7: Configure XGBoost hyperparameters
    print("Step 7: Configure XGBoost hyperparameters")
    xgb_model = XGBClassifier(
        n_estimators=1000,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=ratio,
        random_state=42,
        use_label_encoder=False,
        eval_metric='logloss',
        early_stopping_rounds=20
    )

    # Build Pipeline
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('model', xgb_model)
    ])

    # Step 8: Train the model with early stopping
    print("Step 8: Train the model with early stopping")
    
    # Pre-transform for eval_set because XGBoost model needs numeric data
    X_train_transformed = preprocessor.fit_transform(X_train)
    X_test_transformed = preprocessor.transform(X_test)
    
    start_train = time.time()
    xgb_model.fit(
        X_train_transformed, y_train,
        eval_set=[(X_test_transformed, y_test)],
        verbose=False
    )
    end_train = time.time()
    print(f"Training completed in {end_train - start_train:.2f}s")

    # Re-wrap in pipeline for easy deployment (including preprocessor)
    # We update the model inside the pipeline with the trained one
    pipeline.named_steps['model'] = xgb_model

    # Step 9: Evaluate on test set
    print("Step 9: Evaluate on test set")
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]
    
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)
    cm = confusion_matrix(y_test, y_pred)
    
    print(f"Accuracy: {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall: {rec:.4f} (CRITICAL)")
    print(f"F1-Score: {f1:.4f}")
    print(f"AUC-ROC: {auc:.4f}")
    print(f"Confusion Matrix:\n{cm}")

    # Step 10: Analyze feature importance
    print("Step 10: Analyze feature importance")
    # Get feature names after one-hot encoding
    ohe = preprocessor.named_transformers_['cat']
    cat_features_transformed = ohe.get_feature_names_out(categorical_features)
    feature_names = numerical_features + list(cat_features_transformed)
    
    importances = xgb_model.feature_importances_
    feat_imp = pd.Series(importances, index=feature_names).sort_values(ascending=False)
    
    plt.figure(figsize=(10, 6))
    feat_imp.head(20).plot(kind='bar')
    plt.title("Top 20 Features")
    plt.tight_layout()
    plt.savefig(os.path.join(MODEL_DIR, 'feature_importance.png'))
    print("Feature importance plot saved.")

    # Step 11: Tune threshold (Analysis)
    print("Step 11: Analyze threshold impact (0.3, 0.5, 0.7)")
    for t in [0.3, 0.5, 0.7]:
        y_pred_t = (y_prob >= t).astype(int)
        print(f"Threshold {t}: Recall={recall_score(y_test, y_pred_t):.4f}, Precision={precision_score(y_test, y_pred_t):.4f}")

    # Step 12: Test prediction speed
    print("Step 12: Test prediction speed")
    sample_size = 1000
    samples = X_test.iloc[:sample_size]
    start_speed = time.time()
    _ = pipeline.predict(samples)
    end_speed = time.time()
    speed_per_req = (end_speed - start_speed) / sample_size * 1000 # ms
    print(f"Speed: {speed_per_req:.4f}ms per request")

    # Step 13: Save the model
    print("Step 13: Save the model")
    joblib.dump(pipeline, os.path.join(MODEL_DIR, 'xgboost_pipeline.pkl'))
    
    metrics = {
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1_score": f1,
        "auc_roc": auc,
        "inference_speed_ms": speed_per_req,
        "top_features": feat_imp.head(5).to_dict(),
        "confusion_matrix": cm.tolist(),
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    joblib.dump(metrics, os.path.join(MODEL_DIR, 'metrics.pkl'))
    print("Model and metrics saved.")

if __name__ == "__main__":
    train_model()
