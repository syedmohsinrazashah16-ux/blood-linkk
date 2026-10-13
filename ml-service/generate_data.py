"""
Generates realistic synthetic blood demand data for South Punjab.
Patterns modeled: summer spikes, dengue season, Ramadan, weekend dips, emergency surges.
"""
import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta

def generate_blood_demand(days=730):
    blood_groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    base_demand = {"A+": 12, "A-": 3, "B+": 15, "B-": 4, "AB+": 6, "AB-": 2, "O+": 18, "O-": 5}
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    dates = [start_date + timedelta(days=i) for i in range(days)]
    
    records = []
    for group in blood_groups:
        base = base_demand[group]
        for date in dates:
            demand = base
            month = date.month
            if month in [5, 6, 7]:
                demand *= 1.3
            elif month in [8, 9, 10]:
                demand *= 1.5
            elif month in [3, 4]:
                demand *= 1.2
            elif month in [12, 1]:
                demand *= 0.85
            if date.weekday() >= 5:
                demand *= 0.75
            demand += np.random.normal(0, base * 0.15)
            demand = max(0, demand)
            if np.random.random() < 0.02:
                demand *= np.random.uniform(1.5, 2.5)
            records.append({
                "date": date.strftime("%Y-%m-%d"),
                "blood_group": group,
                "units_demanded": round(demand, 2),
            })
    
    df = pd.DataFrame(records)
    os.makedirs("data", exist_ok=True)
    df.to_csv("data/blood_demand.csv", index=False)
    print(f"SUCCESS: Generated {len(df)} records")
    print(f"Date range: {df['date'].min()} to {df['date'].max()}")
    print("\nAverage demand per group:")
    print(df.groupby("blood_group")["units_demanded"].mean().round(2).to_string())
    return df

if __name__ == "__main__":
    generate_blood_demand()