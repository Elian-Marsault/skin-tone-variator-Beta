const express = require('express');
const { GoogleGenAI, Modality } = require('@google/genai');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limite à 50 requêtes par IP par fenêtre (augmenté pour les tests)
  message: {
    error: 'Trop de requêtes, veuillez réessayer plus tard.',
    isQuotaError: true
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4000'],
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

    const prompt = `Vous êtes un outil d'édition d'images précis. Votre SEULE fonction est de modifier l'ethnicité de la personne dans l'image fournie pour ${ethnicity}. Vous devez respecter strictement les règles suivantes, en traitant l'image originale comme un modèle fixe.
RÈGLES CRITIQUES - LA SORTIE DOIT ÊTRE IDENTIQUE À L'ORIGINAL SAUF POUR L'ETHNICITÉ :
VÊTEMENTS : NE modifiez PAS les vêtements, le tissu, la couleur ou le style de quelque manière que ce soit. Ils doivent être IDENTIQUES.
POSE ET EXPRESSION : La pose de la personne, l'expression faciale et la position du corps DOIVENT rester INCHANGÉES.
ACCESSOIRES ET COIFFURE : NE changez PAS les accessoires (bijoux, lunettes, etc.). Vous pouvez adapter la coiffure de la personne selon l'ethnicité.
ARRIÈRE-PLAN ET ÉCLAIRAGE : L'arrière-plan, le décor et l'éclairage de l'image DOIVENT être IDENTIQUES à l'original.
Votre seule modification concerne le teint de peau et les caractéristiques ethniques de la personne pour représenter avec précision un individu ${ethnicity}. Tous les autres éléments de l'image sont non négociables et doivent être préservés exactement comme dans l'original.`;

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

