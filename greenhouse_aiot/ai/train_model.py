"""
Model training pipeline for greenhouse condition classification.
Trains 4 classifiers, evaluates on a held-out test set, and serialises
all artefacts to ai/models/.

Partition:  Train 70% | Validation 15% | Test 15%   (random_state=42)
Balancing:  SMOTE applied ONLY to the training split
Scaler:     StandardScaler fit ONLY on train, applied to val and test

Usage:
    python train_model.py
"""

import warnings
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report,
)
from imblearn.over_sampling import SMOTE

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

warnings.filterwarnings("ignore")
tf.get_logger().setLevel("ERROR")

BASE_DIR   = Path(__file__).parent
DATA_DIR   = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(exist_ok=True)

FEATURE_COLS = ["temperature", "humidity", "ph", "light_lux", "co2_ppm", "soil_moisture"]
TARGET_COL   = "condition"
RANDOM_STATE = 42
CLASS_ORDER  = ["critical", "optimal", "warning"]   # LabelEncoder alphabetical


# ── Data loading & splitting ──────────────────────────────────────────────────

def load_data() -> tuple[np.ndarray, np.ndarray, LabelEncoder]:
    df = pd.read_csv(DATA_DIR / "greenhouse_dataset.csv")
    X = df[FEATURE_COLS].values

    le = LabelEncoder()
    le.fit(CLASS_ORDER)
    y = le.transform(df[TARGET_COL].values)

    print(f"Dataset loaded: {len(df):,} samples — features: {FEATURE_COLS}")
    print(f"Class mapping:  {dict(zip(le.classes_, le.transform(le.classes_)))}\n")
    return X, y, le


def split_data(
    X: np.ndarray, y: np.ndarray
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    X_train, X_tmp, y_train, y_tmp = train_test_split(
        X, y, test_size=0.30, stratify=y, random_state=RANDOM_STATE
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_tmp, y_tmp, test_size=0.50, stratify=y_tmp, random_state=RANDOM_STATE
    )
    print(f"Split — Train: {len(X_train):,} | Val: {len(X_val):,} | Test: {len(X_test):,}")
    return X_train, X_val, X_test, y_train, y_val, y_test


# ── Balancing & scaling ───────────────────────────────────────────────────────

def apply_smote(
    X_train: np.ndarray, y_train: np.ndarray
) -> tuple[np.ndarray, np.ndarray]:
    unique, counts = np.unique(y_train, return_counts=True)
    print("\nClass distribution BEFORE SMOTE:")
    for cls, cnt in zip(CLASS_ORDER, counts):
        print(f"  {cls:<12}  {cnt:,}")

    smote = SMOTE(random_state=RANDOM_STATE)
    X_res, y_res = smote.fit_resample(X_train, y_train)

    unique_r, counts_r = np.unique(y_res, return_counts=True)
    print("\nClass distribution AFTER SMOTE:")
    for cls, cnt in zip(CLASS_ORDER, counts_r):
        print(f"  {cls:<12}  {cnt:,}")
    print()
    return X_res, y_res


def scale_data(
    X_train: np.ndarray, X_val: np.ndarray, X_test: np.ndarray
) -> tuple[np.ndarray, np.ndarray, np.ndarray, StandardScaler]:
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_val_s   = scaler.transform(X_val)
    X_test_s  = scaler.transform(X_test)
    joblib.dump(scaler, MODELS_DIR / "scaler.pkl")
    print("StandardScaler fitted on train and saved → models/scaler.pkl\n")
    return X_train_s, X_val_s, X_test_s, scaler


# ── Evaluation helper ─────────────────────────────────────────────────────────

def evaluate_model(
    name: str,
    y_test: np.ndarray,
    y_pred: np.ndarray,
    le: LabelEncoder,
    proba: np.ndarray | None = None,
) -> dict:
    acc  = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, average="macro", zero_division=0)
    rec  = recall_score(y_test, y_pred, average="macro", zero_division=0)
    f1   = f1_score(y_test, y_pred, average="macro", zero_division=0)

    print(f"\n{'─'*60}")
    print(f"MODEL: {name}")
    print(f"{'─'*60}")
    print(f"  Accuracy : {acc:.4f}")
    print(f"  Precision: {prec:.4f}  (macro)")
    print(f"  Recall   : {rec:.4f}  (macro)")
    print(f"  F1-macro : {f1:.4f}")
    print()
    print(classification_report(y_test, y_pred, target_names=le.classes_, zero_division=0))

    # Confusion matrix plot
    cm = confusion_matrix(y_test, y_pred)
    fig, ax = plt.subplots(figsize=(6, 5))
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="Blues",
        xticklabels=le.classes_, yticklabels=le.classes_, ax=ax
    )
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title(f"Confusion Matrix — {name}")
    fig.tight_layout()
    safe_name = name.lower().replace(" ", "_")
    fig.savefig(DATA_DIR / f"confusion_matrix_{safe_name}.png", dpi=120)
    plt.close(fig)

    return {"model": name, "accuracy": acc, "precision": prec, "recall": rec, "f1_macro": f1}


# ── Model training ────────────────────────────────────────────────────────────

def train_logistic_regression(
    X_train: np.ndarray, y_train: np.ndarray,
    X_test: np.ndarray,  y_test: np.ndarray,
    le: LabelEncoder,
) -> dict:
    print("Training LogisticRegression …")
    model = LogisticRegression(max_iter=1000, random_state=RANDOM_STATE)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    joblib.dump(model, MODELS_DIR / "logistic_regression_model.pkl")
    return evaluate_model("LogisticRegression", y_test, y_pred, le)


def train_random_forest(
    X_train: np.ndarray, y_train: np.ndarray,
    X_test: np.ndarray,  y_test: np.ndarray,
    le: LabelEncoder,
) -> dict:
    print("Training RandomForestClassifier …")
    model = RandomForestClassifier(n_estimators=200, random_state=RANDOM_STATE)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    joblib.dump(model, MODELS_DIR / "random_forest_model.pkl")

    # Feature importance plot
    importances = model.feature_importances_
    fig, ax = plt.subplots(figsize=(7, 4))
    idx = np.argsort(importances)[::-1]
    ax.bar(range(len(FEATURE_COLS)), importances[idx])
    ax.set_xticks(range(len(FEATURE_COLS)))
    ax.set_xticklabels([FEATURE_COLS[i] for i in idx], rotation=30, ha="right")
    ax.set_title("Feature Importance — RandomForest")
    ax.set_ylabel("Importance")
    fig.tight_layout()
    fig.savefig(DATA_DIR / "feature_importance.png", dpi=120)
    plt.close(fig)

    return evaluate_model("RandomForest", y_test, y_pred, le)


def train_svc(
    X_train: np.ndarray, y_train: np.ndarray,
    X_test: np.ndarray,  y_test: np.ndarray,
    le: LabelEncoder,
) -> dict:
    print("Training SVC (rbf) …")
    model = SVC(kernel="rbf", probability=True, random_state=RANDOM_STATE)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    joblib.dump(model, MODELS_DIR / "svc_model.pkl")
    return evaluate_model("SVC", y_test, y_pred, le)


def train_neural_network(
    X_train: np.ndarray, y_train: np.ndarray,
    X_val:   np.ndarray, y_val:   np.ndarray,
    X_test:  np.ndarray, y_test:  np.ndarray,
    le: LabelEncoder,
) -> dict:
    print("Training Neural Network (Keras) …")
    n_classes = len(le.classes_)

    model = keras.Sequential([
        layers.Input(shape=(X_train.shape[1],)),
        layers.Dense(64, activation="relu"),
        layers.Dense(32, activation="relu"),
        layers.Dense(n_classes, activation="softmax"),
    ], name="greenhouse_nn")

    model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    history = model.fit(
        X_train, y_train,
        epochs=30,
        batch_size=64,
        validation_data=(X_val, y_val),
        verbose=0,
    )

    model.save(str(MODELS_DIR / "neural_network_model.h5"))

    # Training history plot
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
    ax1.plot(history.history["loss"],     label="Train loss")
    ax1.plot(history.history["val_loss"], label="Val loss")
    ax1.set_title("Loss")
    ax1.set_xlabel("Epoch")
    ax1.legend()

    ax2.plot(history.history["accuracy"],     label="Train accuracy")
    ax2.plot(history.history["val_accuracy"], label="Val accuracy")
    ax2.set_title("Accuracy")
    ax2.set_xlabel("Epoch")
    ax2.legend()

    fig.suptitle("Neural Network Training History")
    fig.tight_layout()
    fig.savefig(DATA_DIR / "training_history.png", dpi=120)
    plt.close(fig)

    y_pred_proba = model.predict(X_test, verbose=0)
    y_pred = np.argmax(y_pred_proba, axis=1)
    return evaluate_model("NeuralNetwork", y_test, y_pred, le)


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    X, y, le = load_data()
    X_train, X_val, X_test, y_train, y_val, y_test = split_data(X, y)

    X_train_bal, y_train_bal = apply_smote(X_train, y_train)
    X_train_s, X_val_s, X_test_s, _ = scale_data(X_train_bal, X_val, X_test)

    # Save label encoder alongside the scaler for use in predict.py
    joblib.dump(le, MODELS_DIR / "label_encoder.pkl")

    results: list[dict] = []
    results.append(train_logistic_regression(X_train_s, y_train_bal, X_test_s, y_test, le))
    results.append(train_random_forest(X_train_s, y_train_bal, X_test_s, y_test, le))
    results.append(train_svc(X_train_s, y_train_bal, X_test_s, y_test, le))
    results.append(train_neural_network(X_train_s, y_train_bal, X_val_s, y_val, X_test_s, y_test, le))

    # ── Comparison table ──────────────────────────────────────────────────────
    comparison = pd.DataFrame(results).sort_values("f1_macro", ascending=False)
    comparison.to_csv(MODELS_DIR / "model_comparison.csv", index=False)

    print("\n" + "=" * 60)
    print("MODEL COMPARISON (sorted by F1-macro)")
    print("=" * 60)
    print(comparison.to_string(index=False))

    best = comparison.iloc[0]
    print(f"\n✓ Best model: {best['model']}  (F1-macro = {best['f1_macro']:.4f})")
    print(f"  Comparison table saved → models/model_comparison.csv")
    print("Done.")


if __name__ == "__main__":
    main()
