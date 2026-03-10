import { db } from "../db.js";
import { GoogleGenAI } from "@google/genai";

export async function generateRecommendations() {
  console.log("Running CloudGuard Optimization Agent...");

  const anomalies = db.prepare(`
    SELECT a.id, a.type, a.description, a.estimated_waste, r.name, r.service
    FROM anomalies a
    JOIN resources r ON a.resource_id = r.id
    LEFT JOIN recommendations rec ON a.id = rec.anomaly_id
    WHERE rec.id IS NULL
  `).all() as any[];

  if (anomalies.length === 0) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.error("Valid GEMINI_API_KEY is not set. Please configure it in the Secrets panel.");
    return;
  }

  const ai = new GoogleGenAI({ apiKey });

  const insertRecommendation = db.prepare(`
    INSERT INTO recommendations (anomaly_id, action, estimated_savings, confidence)
    VALUES (?, ?, ?, ?)
  `);

  for (const anomaly of anomalies) {
    try {
      const prompt = `
        You are an AI Cloud FinOps and Security Expert.
        Analyze the following cloud anomaly and recommend the best remediation action.
        
        Resource Name: ${anomaly.name}
        Service: ${anomaly.service}
        Anomaly Type: ${anomaly.type}
        Description: ${anomaly.description}
        Estimated Monthly Waste: $${anomaly.estimated_waste}

        Provide a JSON response with the following structure:
        {
          "action": "Short description of the recommended action (e.g., 'Stop instance', 'Terminate resource', 'Investigate for malware')",
          "confidence": 95, // Integer between 0 and 100
          "estimated_savings": 120.50 // Number representing estimated monthly savings
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const result = JSON.parse(response.text || "{}");

      if (result.action) {
        insertRecommendation.run(
          anomaly.id,
          result.action,
          result.estimated_savings || anomaly.estimated_waste,
          result.confidence || 80
        );
        console.log(`Generated recommendation for anomaly ${anomaly.id}: ${result.action}`);
      }
    } catch (error: any) {
      console.error(`Failed to generate recommendation for anomaly ${anomaly.id}:`, error.message || error);
    }
  }
}
