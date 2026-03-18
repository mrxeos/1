
import { GoogleGenAI, Type } from "@google/genai";
import { DiseaseSuggestion } from '../types';

// FIX: Initialize Gemini API client using process.env.API_KEY directly following guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const suggestDiseases = async (symptoms: string, patientContext: string): Promise<DiseaseSuggestion[]> => {
  if (!process.env.API_KEY) return [];
  try {
    const prompt = `
      Based on the following symptoms and patient context, list up to 5 possible diseases with their probability as a percentage.
      Symptoms: "${symptoms}"
      Patient Context: "${patientContext}"
      Please provide a concise list of likely diagnoses.
    `;
    
    // FIX: Updated model to 'gemini-3-flash-preview' for text task and used correct generateContent pattern.
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              disease: {
                type: Type.STRING,
                description: 'اسم المرض المحتمل باللغة العربية',
              },
              probability: {
                type: Type.NUMBER,
                description: 'الاحتمالية كنسبة مئوية (رقم فقط)',
              },
            },
          },
        },
      },
    });

    // FIX: Access generated text using the .text property directly (not a method).
    const jsonText = response.text?.trim() || '[]';
    const suggestions = JSON.parse(jsonText);
    return suggestions as DiseaseSuggestion[];

  } catch (error) {
    console.error("Error suggesting diseases:", error);
    return [];
  }
};

export const suggestAlternativeMedicines = async (medicineName: string): Promise<string[]> => {
    if (!process.env.API_KEY) return [];
    try {
        const prompt = `Suggest three alternative medicines available in Egypt for the drug "${medicineName}". Provide only the names of the alternatives.`;

        // FIX: Updated model to 'gemini-3-flash-preview' for text task.
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        alternatives: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING
                            }
                        }
                    }
                }
            }
        });
        // FIX: Access generated text using the .text property directly (not a method).
        const jsonText = response.text?.trim() || '{}';
        const result = JSON.parse(jsonText);
        return result.alternatives || [];
    } catch (error) {
        console.error("Error suggesting alternative medicines:", error);
        return [];
    }
};
