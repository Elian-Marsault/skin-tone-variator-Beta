// Import supprimé - l'API est maintenant gérée par le backend

const statusEl = document.querySelector('#status') as HTMLParagraphElement;
const imageUploadEl = document.querySelector(
  '#image-upload',
) as HTMLInputElement;
const previewContainerEl = document.querySelector(
  '#preview-container',
) as HTMLDivElement;
const originalImageEl = document.querySelector(
  '#original-image',
) as HTMLImageElement;
const generateButton = document.querySelector(
  '#generate-button',
) as HTMLButtonElement;
const outputGalleryEl = document.querySelector(
  '#output-gallery',
) as HTMLDivElement;

const ETHNICITIES = [
  'Afro-Américain',
  'Asiatique de l\'Est',
  'Asiatique du Sud',
  'Latino',
  'Moyen-Oriental',
  'Blanc',
];

// --- State Variables ---
let originalImageBase64: string | null = null;
let originalImageMimeType: string | null = null;

// --- API Configuration ---
// L'API est maintenant gérée par le backend proxy
const BACKEND_URL = 'http://localhost:3001';

// --- Utility Functions ---
function fileToGenerativePart(file: File) {
  return new Promise<{base64: string; mimeType: string}>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return reject(new Error('Failed to read file as string'));
      }
      const base64 = reader.result.split(',')[1];
      resolve({base64, mimeType: file.type});
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showStatusError(message: string) {
  statusEl.innerHTML = `<span class="text-red-500">${message}</span>`;
}

function setControlsDisabled(disabled: boolean) {
  generateButton.disabled = disabled;
  imageUploadEl.disabled = disabled;
}

// --- Main Application Logic ---
async function generateSingleVariation(
  ethnicity: string,
  galleryItem: HTMLDivElement,
) {
  const imgEl = galleryItem.querySelector('img') as HTMLImageElement;
  const loadingIndicator = galleryItem.querySelector('.absolute.inset-0.flex') as HTMLDivElement;
  const statusBadge = galleryItem.querySelector('.absolute.top-4.right-4 div') as HTMLDivElement;
  const progressBar = galleryItem.querySelector('.bg-gradient-to-r') as HTMLDivElement;
  const statusText = galleryItem.querySelector('.text-xs.text-slate-500') as HTMLSpanElement;

  try {
    // Appel au backend proxy au lieu de l'API Gemini directement
    const response = await fetch(`${BACKEND_URL}/api/generate-variation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: originalImageBase64,
        mimeType: originalImageMimeType,
        ethnicity: ethnicity
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur lors de la génération');
    }

    const data = await response.json();
    
    if (data.success && data.imageData) {
      const imageUrl = `data:${data.mimeType};base64,${data.imageData}`;
      imgEl.src = imageUrl;
      imgEl.classList.remove('animate-pulse');
      
      // Masquer l'indicateur de chargement
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
      
      // Mettre à jour la barre de progression
      if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.className = 'bg-gradient-to-r from-green-500 to-emerald-600 h-1.5 rounded-full transition-all duration-500';
      }
      
      // Mettre à jour le texte de statut
      if (statusText) {
        statusText.textContent = 'Terminé';
        statusText.className = 'text-xs text-green-600 font-medium';
      }
      
      // Masquer le badge de statut
      if (statusBadge) {
        statusBadge.style.display = 'none';
      }
      
      // Ajouter un bouton de relance pour les images réussies
      const retryButton = document.createElement('button');
      retryButton.className = 'absolute bottom-2 right-3 w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 retry-btn';
      retryButton.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
      `;
      retryButton.title = 'Régénérer cette image';
      retryButton.onclick = () => retryGeneration(ethnicity, galleryItem);
      
      // Ajouter un bouton de téléchargement
      const downloadButton = document.createElement('button');
      downloadButton.className = 'absolute bottom-2 right-14 w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 download-btn';
      downloadButton.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      `;
      downloadButton.title = 'Télécharger cette image';
      downloadButton.onclick = () => downloadImage(imgEl.src, ethnicity);
      
      // Ajouter les boutons à la carte
      galleryItem.appendChild(retryButton);
      galleryItem.appendChild(downloadButton);
      
      return;
    } else {
      throw new Error(data.error || 'Aucune image n\'a été générée pour cette variation.');
    }
  } catch (e) {
    console.error(`Échec de génération de variation pour ${ethnicity}:`, e);
    
    let errorMessage = 'Une erreur inconnue s\'est produite.';
    let isQuotaError = false;
    
    if (e instanceof Error) {
      errorMessage = e.message;
      // Détecter les erreurs de quota
      if (e.message.includes('quota') || e.message.includes('429') || e.message.includes('RESOURCE_EXHAUSTED')) {
        isQuotaError = true;
        errorMessage = 'Quota API dépassé';
      }
    }
    
    // Masquer l'indicateur de chargement
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
    
    // Mettre à jour la barre de progression
    if (progressBar) {
      progressBar.style.width = '100%';
      if (isQuotaError) {
        progressBar.className = 'bg-gradient-to-r from-orange-500 to-red-500 h-1.5 rounded-full transition-all duration-500';
      } else {
        progressBar.className = 'bg-gradient-to-r from-red-500 to-red-600 h-1.5 rounded-full transition-all duration-500';
      }
    }
    
    // Mettre à jour le texte de statut
    if (statusText) {
      if (isQuotaError) {
        statusText.textContent = 'Quota dépassé';
        statusText.className = 'text-xs text-orange-600 font-medium';
      } else {
        statusText.textContent = 'Échec';
        statusText.className = 'text-xs text-red-600 font-medium';
      }
    }
    
    // Mettre à jour le badge de statut avec l'erreur et ajouter un bouton retry
    if (statusBadge) {
      if (isQuotaError) {
        statusBadge.innerHTML = `
          <span class="flex items-center space-x-1">
            <div class="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
            <span>Quota dépassé</span>
          </span>
        `;
        statusBadge.className = 'px-3 py-1.5 bg-orange-50/95 backdrop-blur-sm text-orange-700 text-xs font-semibold rounded-full shadow-lg border border-orange-200/50';
      } else {
        statusBadge.innerHTML = `
          <span class="flex items-center space-x-1">
            <div class="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
            <span>Échec</span>
          </span>
        `;
        statusBadge.className = 'px-3 py-1.5 bg-red-50/95 backdrop-blur-sm text-red-700 text-xs font-semibold rounded-full shadow-lg border border-red-200/50';
      }
    }
    
    // Ajouter un bouton de retry
    const retryButton = document.createElement('button');
    retryButton.className = 'absolute bottom-2 right-3 w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 retry-btn';
    retryButton.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
      </svg>
    `;
    retryButton.title = 'Relancer la génération';
    retryButton.onclick = () => retryGeneration(ethnicity, galleryItem);
    
    // Ajouter un bouton de téléchargement (même pour les échecs, au cas où il y aurait une image)
    const downloadButton = document.createElement('button');
    downloadButton.className = 'absolute bottom-2 right-14 w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 download-btn';
    downloadButton.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
    `;
    downloadButton.title = 'Télécharger cette image';
    downloadButton.onclick = () => {
      if (imgEl.src && imgEl.src !== '') {
        downloadImage(imgEl.src, ethnicity);
      } else {
        alert('Aucune image à télécharger');
      }
    };
    
    // Ajouter les boutons à la carte
    galleryItem.appendChild(retryButton);
    galleryItem.appendChild(downloadButton);
    
    imgEl.classList.remove('animate-pulse');
    imgEl.classList.add('opacity-30');
    throw e; // Re-throw to be caught by Promise.allSettled
  }
}

async function generate() {
  statusEl.innerText = 'Génération des variations...';
  setControlsDisabled(true);
  setupGallery();

  const galleryItems = Array.from(
    outputGalleryEl.children,
  ) as HTMLDivElement[];

  const generationPromises = ETHNICITIES.map((ethnicity, index) =>
    generateSingleVariation(ethnicity, galleryItems[index]),
  );

  const results = await Promise.allSettled(generationPromises);
  const successfulGenerations = results.filter(
    r => r.status === 'fulfilled',
  ).length;

  // Vérifier s'il y a des erreurs de quota
  const quotaErrors = results.filter(r => 
    r.status === 'rejected' && 
    r.reason instanceof Error && 
    (r.reason.message.includes('quota') || r.reason.message.includes('429'))
  ).length;

  if (successfulGenerations === ETHNICITIES.length) {
    statusEl.innerText = 'Variations générées avec succès.';
  } else if (quotaErrors > 0) {
    showStatusError(
      `Quota API dépassé. ${successfulGenerations}/${ETHNICITIES.length} variations générées. Attendez 24h ou passez à un plan payant.`
    );
  } else if (successfulGenerations > 0) {
    statusEl.innerText = `Généré ${successfulGenerations}/${ETHNICITIES.length} variations. Certaines ont échoué.`;
  } else {
    showStatusError(
      'Impossible de générer des variations. Vérifiez votre clé API et votre quota.',
    );
  }

  setControlsDisabled(false);
}

function setupGallery() {
  outputGalleryEl.innerHTML = ''; // Clear previous results
  for (const ethnicity of ETHNICITIES) {
    const galleryItem = document.createElement('div');
    galleryItem.className =
      'group relative bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-700 transform hover:scale-105 hover:-translate-y-2 border border-slate-200/50 backdrop-blur-sm';
    galleryItem.innerHTML = `
      <!-- Image container avec effet glassmorphism -->
      <div class="aspect-[4/5] relative overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
        <img src="" alt="Image générée pour ${ethnicity}" class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-1000 ease-out"/>
        
        <!-- Overlay avec effet de brillance -->
        <div class="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <!-- Indicateur de chargement premium -->
        <div class="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div class="text-center">
            <div class="w-16 h-16 bg-gradient-to-br from-slate-600 to-blue-700 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg animate-pulse">
              <svg class="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            </div>
            <p class="text-slate-600 font-medium text-sm">Génération en cours...</p>
          </div>
        </div>
        
        <!-- Bouton plein écran -->
        <button class="absolute top-3 left-3 w-10 h-10 bg-white/90 fullscreen-btn rounded-full flex items-center justify-center shadow-lg opacity-100 transition-all duration-300 hover:bg-white hover:scale-110" onclick="openFullscreen('${ethnicity.replace(/'/g, "\\'")}')" title="Voir en plein écran">
          <svg class="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
          </svg>
        </button>
        
        <!-- Effet de brillance qui traverse -->
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      </div>
      
      <!-- Contenu de la carte -->
      <div class="p-4 bg-white">
        <div class="text-center">
          <h3 class="text-sm font-semibold text-gray-800">${ethnicity}</h3>
        </div>
      </div>
      
      <!-- Badge de statut flottant -->
      <div class="absolute top-4 right-4">
        <div class="px-3 py-1.5 bg-white/95 backdrop-blur-sm text-slate-700 text-xs font-semibold rounded-full shadow-lg border border-slate-200/50">
          <span class="flex items-center space-x-1">
            <div class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse"></div>
            <span>Génération</span>
          </span>
        </div>
      </div>
    `;
    outputGalleryEl.appendChild(galleryItem);
  }
}

// --- Fonction de retry pour un visuel spécifique ---
async function retryGeneration(ethnicity: string, galleryItem: HTMLDivElement) {
  // Supprimer tous les boutons existants
  const existingRetryBtns = galleryItem.querySelectorAll('.retry-btn');
  const existingDownloadBtns = galleryItem.querySelectorAll('.download-btn');
  existingRetryBtns.forEach(btn => btn.remove());
  existingDownloadBtns.forEach(btn => btn.remove());
  
  // Réinitialiser l'état de la carte
  const imgEl = galleryItem.querySelector('img') as HTMLImageElement;
  const loadingIndicator = galleryItem.querySelector('.absolute.inset-0.flex') as HTMLDivElement;
  const statusBadge = galleryItem.querySelector('.absolute.top-4.right-4 div') as HTMLDivElement;
  const progressBar = galleryItem.querySelector('.bg-gradient-to-r') as HTMLDivElement;
  const statusText = galleryItem.querySelector('.text-xs.text-slate-500') as HTMLSpanElement;
  
  // Réinitialiser l'image
  imgEl.src = '';
  imgEl.classList.add('animate-pulse');
  imgEl.classList.remove('opacity-30');
  
  // Réafficher l'indicateur de chargement
  if (loadingIndicator) {
    loadingIndicator.style.display = 'flex';
  }
  
  // Réinitialiser la barre de progression
  if (progressBar) {
    progressBar.style.width = '0%';
    progressBar.className = 'bg-gradient-to-r from-slate-500 via-slate-600 to-blue-700 h-1.5 rounded-full transition-all duration-500';
  }
  
  // Réinitialiser le badge de statut
  if (statusBadge) {
    statusBadge.innerHTML = `
      <span class="flex items-center space-x-1">
        <div class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse"></div>
        <span>Génération</span>
      </span>
    `;
    statusBadge.className = 'px-3 py-1.5 bg-white/95 backdrop-blur-sm text-slate-700 text-xs font-semibold rounded-full shadow-lg border border-slate-200/50';
  }
  
  // Réinitialiser le texte de statut
  if (statusText) {
    statusText.textContent = 'Génération en cours...';
    statusText.className = 'text-xs text-slate-500';
  }
  
  // Relancer la génération
  try {
    await generateSingleVariation(ethnicity, galleryItem);
  } catch (error) {
    console.error('Erreur lors du retry pour', ethnicity, error);
  }
}

// --- Fonction plein écran ---
function openFullscreen(ethnicity: string) {
  // Trouver l'image correspondante
  const galleryItems = document.querySelectorAll('#output-gallery > div');
  let targetImage: HTMLImageElement | null = null;
  
  for (const item of galleryItems) {
    const title = item.querySelector('h3')?.textContent;
    if (title === ethnicity) {
      targetImage = item.querySelector('img') as HTMLImageElement;
      break;
    }
  }
  
  if (!targetImage || !targetImage.src || targetImage.src === '') {
    alert('Image non disponible ou pas encore generee');
    return;
  }
  
  // Créer le modal plein écran
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 fullscreen-modal';
  modal.innerHTML = `
    <div class="relative max-w-4xl max-h-full w-full h-full flex items-center justify-center">
      <!-- Image en plein écran -->
      <img src="${targetImage.src}" alt="Image générée pour ${ethnicity}" class="max-w-full max-h-full object-contain rounded-lg shadow-2xl"/>
      
      <!-- Bouton fermer -->
      <button class="absolute top-4 right-4 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white hover:scale-110 transition-all duration-300" onclick="closeFullscreen()">
        <svg class="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
      
      <!-- Titre de l'image -->
      <div class="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-4">
        <h3 class="text-white text-xl font-bold mb-1">${ethnicity}</h3>
        <p class="text-white/80 text-sm">Variation de teint de peau générée par IA</p>
      </div>
      
      <!-- Bouton télécharger -->
      <button class="absolute bottom-4 right-4 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white hover:scale-110 transition-all duration-300" onclick="downloadImage('${targetImage.src}', '${ethnicity}')">
        <svg class="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      </button>
    </div>
  `;
  
  // Ajouter le modal au DOM
  document.body.appendChild(modal);
  
  // Fermer avec Escape
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeFullscreen();
    }
  };
  
  document.addEventListener('keydown', handleKeydown);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeFullscreen();
    }
  });
  
  // Stocker la fonction de nettoyage
  (modal as any).cleanup = () => {
    document.removeEventListener('keydown', handleKeydown);
  };
}

function closeFullscreen() {
  const modal = document.querySelector('.fixed.inset-0.bg-black\\/90');
  if (modal) {
    (modal as any).cleanup?.();
    modal.remove();
  }
}

function downloadImage(imageSrc: string, ethnicity: string) {
  const link = document.createElement('a');
  link.href = imageSrc;
  link.download = `variation-${ethnicity.toLowerCase().replace(/\s+/g, '-')}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Exposer les fonctions globalement
(window as any).openFullscreen = openFullscreen;
(window as any).closeFullscreen = closeFullscreen;
(window as any).downloadImage = downloadImage;
(window as any).retryGeneration = retryGeneration;

// --- Event Listeners ---
imageUploadEl.addEventListener('change', async () => {
  const file = imageUploadEl.files?.[0];
  if (!file) {
    return;
  }

  statusEl.innerText = 'Traitement de l\'image...';
  try {
    const {base64, mimeType} = await fileToGenerativePart(file);
    originalImageBase64 = base64;
    originalImageMimeType = mimeType;

    originalImageEl.src = `data:${mimeType};base64,${base64}`;
    previewContainerEl.classList.remove('hidden');
    statusEl.innerText = 'Prêt à générer les variations.';
    outputGalleryEl.innerHTML = ''; // Clear gallery on new image upload
    updateGenerateButtonState(); // Mettre à jour l'état du bouton
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Une erreur inconnue s\'est produite';
    showStatusError(`Erreur lors du traitement du fichier : ${message}`);
    console.error(e);
  }
});

generateButton.addEventListener('click', () => {
  if (!originalImageBase64) {
    showStatusError('Veuillez d\'abord télécharger une image.');
    return;
  }
  generate();
});

// Activer le bouton de génération quand une image est uploadée
function updateGenerateButtonState() {
  const hasImage = !!originalImageBase64;
  generateButton.disabled = !hasImage;
}

// Initialisation au chargement de la page
function initializeApp() {
  statusEl.innerText = 'Prêt à générer des variations.';
}

// Lancer l'initialisation quand le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
