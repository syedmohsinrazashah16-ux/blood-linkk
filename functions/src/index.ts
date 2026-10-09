// functions/src/index.ts
import { onRequest } from "firebase-functions/v2/https";
// ... your other imports

export const checkTransfusionDates = onRequest(async (req, res) => {
  // Check for the secret to prevent unauthorized calls
  if (req.query.secret !== "your-super-secret-key") {
    res.status(401).send("Unauthorized");
    return;
  }
  // ... your existing logic for checking transfusion dates
});