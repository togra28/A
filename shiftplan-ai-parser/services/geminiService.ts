
import { GoogleGenAI, Type } from "@google/genai";
import { ShiftType, ExtractedPreference, InputItem } from "../types";

export const extractShiftData = async (input: InputItem, employeeIdHint: string): Promise<ExtractedPreference[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    Analyze this document (text, image, or PDF) to extract unavailability and shift preferences for employee '${employeeIdHint}'.
    
    Valid Categories:
    - ABW: Absent/Cannot work.
    - WUNSCH_NACHT: Wishes to work a night shift.
    - WUNSCH_TAG: Wishes to work a day shift.

    Rules:
    - If the employee ID (MA_XXXX) is visible in the document, use that. Otherwise, use '${employeeIdHint}'.
    - Extract all individual days mentioned.
    - Convert ranges (e.g., "10th to 12th") into single days (10, 11, 12).
    - Return a clean list of JSON objects.
  `;

  const parts: any[] = [{ text: "Extract shift preferences from this file." }];

  if (input.mimeType === 'text/plain' && input.content) {
    parts.push({ text: input.content });
  } else if (input.base64) {
    parts.push({
      inlineData: {
        data: input.base64,
        mimeType: input.mimeType
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                description: "The type: ABW, WUNSCH_NACHT, or WUNSCH_TAG",
                enum: Object.values(ShiftType)
              },
              days: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description: "List of day numbers extracted."
              },
              employeeId: {
                type: Type.STRING,
                description: "The ID of the employee (e.g., MA_123)"
              }
            },
            required: ["type", "days", "employeeId"]
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) return [];
    
    return JSON.parse(resultText) as ExtractedPreference[];
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
