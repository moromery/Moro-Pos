
import { GoogleGenAI } from "@google/genai";

// Ensure the API key is set in the environment variables
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you might want to handle this more gracefully.
  // For this context, we will proceed, but API calls will fail without a key.
  console.warn("API_KEY for GoogleGenAI is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const generateProductDescription = async (
  productName: string,
  category: string
): Promise<string> => {
  if (!API_KEY) {
    return Promise.resolve(`وصف تجريبي لـ ${productName} من فئة ${category}. يتطلب هذا الإجراء مفتاح API صالح.`);
  }

  try {
    const prompt = `اكتب وصفًا جذابًا وقصيرًا باللغة العربية لمنتج في نظام نقاط بيع.
اسم المنتج: "${productName}"
فئة المنتج: "${category}"
الوصف يجب أن يكون مناسبًا للعرض للعملاء والموظفين.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("Error generating description with Gemini:", error);
    return `حدث خطأ أثناء إنشاء الوصف لـ ${productName}.`;
  }
};
