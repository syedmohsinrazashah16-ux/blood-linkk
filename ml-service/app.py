"""
FastAPI server that serves LSTM predictions.
Endpoint: GET /predict/{blood_group}
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import pandas as pd
import joblib
import os
from tensorflow.keras.models import load_model

app = FastAPI(title="Blood-Link LSTM Forecast API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

LOOKBACK = 30
FORECAST = 7
BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
models_cache = {}

def load_model_for(group):
    if group in models_cache:
        return models_cache[group]
    safe_name = group.replace("+", "pos").replace("-", "neg")
    model_path = f"models/lstm_{safe_name}.keras"
    scaler_path = f"models/scaler_{safe_name}.pkl"
    if not os.path.exists(model_path):
        return None, None
    model = load_model(model_path)
    scaler = joblib.load(scaler_path)
    models_cache[group] = (model, scaler)
    return model, scaler

@app.get("/")
def root():
    return {"status": "online", "service": "Blood-Link LSTM Forecast"}

@app.get("/predict/{blood_group}")
def predict(blood_group: str):
    if blood_group not in BLOOD_GROUPS:
        raise HTTPException(400, f"Invalid blood group. Use one of: {BLOOD_GROUPS}")
    
    model, scaler = load_model_for(blood_group)
    if model is None:
        raise HTTPException(500, "Model not found. Please train first.")
    
    df = pd.read_csv("data/blood_demand.csv")
    group_df = df[df["blood_group"] == blood_group].sort_values("date").tail(LOOKBACK)
    
    recent = group_df["units_demanded"].values.reshape(-1, 1)
    scaled = scaler.transform(recent).flatten()
    X = np.array([scaled]).reshape((1, LOOKBACK, 1))
    
    pred_scaled = model.predict(X, verbose=0)[0]
    predictions = scaler.inverse_transform(pred_scaled.reshape(-1, 1)).flatten()
    predictions = np.maximum(predictions, 0).round(2)
    
    last_date = pd.to_datetime(group_df["date"].iloc[-1])
    forecast_dates = [(last_date + pd.Timedelta(days=i+1)).strftime("%Y-%m-%d") for i in range(FORECAST)]
    
    avg_recent = float(np.mean(recent))
    avg_forecast = float(np.mean(predictions))
    
    if avg_forecast > avg_recent * 1.2:
        risk = "HIGH"
    elif avg_forecast < avg_recent * 0.9:
        risk = "LOW"
    else:
        risk = "MEDIUM"
    
    return {
        "blood_group": blood_group,
        "forecast_dates": forecast_dates,
        "predicted_demand": predictions.tolist(),
        "average_recent_demand": round(avg_recent, 2),
        "average_forecast_demand": round(avg_forecast, 2),
        "shortage_risk": risk,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)