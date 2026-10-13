"""
Trains LSTM models to predict blood demand.
One model per blood group.
Input: past 30 days | Output: next 7 days
"""
import pandas as pd
import numpy as np
import os
import joblib
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping

LOOKBACK = 30
FORECAST = 7
EPOCHS = 30
BATCH_SIZE = 32

def create_sequences(data, lookback, forecast):
    X, y = [], []
    for i in range(len(data) - lookback - forecast + 1):
        X.append(data[i:i + lookback])
        y.append(data[i + lookback:i + lookback + forecast])
    return np.array(X), np.array(y)

def train_for_group(df, group):
    print(f"\n🧠 Training {group}...")
    group_df = df[df["blood_group"] == group].sort_values("date").reset_index(drop=True)
    values = group_df["units_demanded"].values.reshape(-1, 1)
    
    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(values).flatten()
    
    X, y = create_sequences(scaled, LOOKBACK, FORECAST)
    X = X.reshape((X.shape[0], X.shape[1], 1))
    
    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]
    
    model = Sequential([
        LSTM(64, activation="relu", return_sequences=True, input_shape=(LOOKBACK, 1)),
        Dropout(0.2),
        LSTM(32, activation="relu"),
        Dropout(0.2),
        Dense(FORECAST),
    ])
    model.compile(optimizer="adam", loss="mse", metrics=["mae"])
    
    early_stop = EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True)
    model.fit(
        X_train, y_train,
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        validation_data=(X_test, y_test),
        callbacks=[early_stop],
        verbose=0,
    )
    
    loss, mae = model.evaluate(X_test, y_test, verbose=0)
    print(f"   ✅ MAE: {mae:.4f} | Loss: {loss:.4f}")
    
    os.makedirs("models", exist_ok=True)
    safe_name = group.replace("+", "pos").replace("-", "neg")
    model.save(f"models/lstm_{safe_name}.keras")
    joblib.dump(scaler, f"models/scaler_{safe_name}.pkl")
    
    return {"group": group, "mae": round(mae, 4), "loss": round(loss, 4)}

def main():
    print("📊 Loading data...")
    df = pd.read_csv("data/blood_demand.csv")
    df["date"] = pd.to_datetime(df["date"])
    
    results = []
    for group in df["blood_group"].unique():
        results.append(train_for_group(df, group))
    
    print("\n" + "=" * 50)
    print("📈 TRAINING COMPLETE")
    print("=" * 50)
    results_df = pd.DataFrame(results)
    print(results_df.to_string(index=False))
    os.makedirs("models", exist_ok=True)
    results_df.to_csv("models/training_results.csv", index=False)

if __name__ == "__main__":
    main()