const express = require('express');
const { GoogleGenAI, Modality } = require('@google/genai');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 500, // Limite à 500 requêtes par IP par heure
  message: {
    error: 'Trop de requêtes, veuillez réessayer plus tard.',
    isQuotaError: true
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
const corsOptions = {
  origin: [
    'http://localhost:4000',
    'https://skin-tone-variator-beta-front.onrender.com'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


// Appliquer le rate limiting aux routes API
app.use('/api/', limiter);

// Configuration API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY environment variable is required');
  process.exit(1);
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'skin-tone-variator-proxy' });
});

// Validation des images
function validateImage(imageBase64, mimeType) {
  // Vérifier le type MIME
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(mimeType)) {
    throw new Error('Type de fichier non supporté. Utilisez JPEG, PNG ou WebP.');
  }
  
  // Vérifier la taille (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  const imageSize = (imageBase64.length * 3) / 4; // Approximation de la taille
  if (imageSize > maxSize) {
    throw new Error('Image trop volumineuse. Taille maximale: 10MB.');
  }
  
  // Vérifier que c'est bien du base64
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(imageBase64)) {
    throw new Error('Format d\'image invalide.');
  }
}

// Proxy endpoint pour la génération d'images
app.post('/api/generate-variation', async (req, res) => {
  try {
    const { imageBase64, mimeType, ethnicity } = req.body;

    if (!imageBase64 || !mimeType || !ethnicity) {
      return res.status(400).json({ 
        error: 'Missing required parameters: imageBase64, mimeType, ethnicity' 
      });
    }

    // Validation de l'image
    try {
      validateImage(imageBase64, mimeType);
    } catch (validationError) {
      return res.status(400).json({
        error: validationError.message
      });
    }

    const prompt = `You are a precise image editing tool. Your ONLY function is to modify the ethnicity of the person in the provided image to ${ethnicity}. You must strictly follow the following rules, treating the original image as a fixed template.
CRITICAL RULES - THE OUTPUT MUST BE IDENTICAL TO THE ORIGINAL EXCEPT FOR ETHNICITY:
CLOTHING: DO NOT modify clothing, fabric, color or style in any way. They must be IDENTICAL.
POSE AND EXPRESSION: The person's pose, facial expression and body position MUST remain UNCHANGED.
ACCESSORIES AND HAIRSTYLE: DO NOT change accessories (jewelry, glasses, etc.). You may adapt the person's hairstyle according to ethnicity.
BACKGROUND AND LIGHTING: The background, setting and lighting of the image MUST be IDENTICAL to the original.
Your only modification concerns the skin tone and ethnic characteristics of the person to accurately represent a ${ethnicity} individual. All other elements of the image are non-negotiable and must be preserved exactly as in the original.`;

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    // Chercher l'image dans la réponse
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return res.json({
          success: true,
          imageData: part.inlineData.data,
          mimeType: part.inlineData.mimeType
        });
      }
    }

    throw new Error('Aucune image n\'a été générée pour cette variation.');

  } catch (error) {
    console.error('Erreur lors de la génération:', error);
    
    let errorMessage = 'Une erreur inconnue s\'est produite.';
    let isQuotaError = false;
    
    if (error.message.includes('quota') || error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED')) {
      isQuotaError = true;
      errorMessage = 'Quota API dépassé';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return res.status(500).json({
      success: false,
      error: errorMessage,
      isQuotaError
    });
  }
});



app.listen(port, () => {
  console.log(`🚀 Proxy backend démarré sur le port ${port}`);
  console.log(`🔑 API Key configurée: ${GEMINI_API_KEY ? '✅' : '❌'}`);
});

