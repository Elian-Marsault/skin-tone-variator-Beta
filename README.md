# Kiabi - Variateur de Teint de Peau

Une application web développée pour Kiabi qui permet de générer des variations d'images avec différents teints de peau et ethnies, tout en conservant la tenue et la pose originales.

## Fonctionnalités

- Upload d'images : Support des formats PNG, JPG, WEBP
- Génération de variations : Création automatique de 6 variations ethniques différentes
- Interface Kiabi : Design adapté à l'identité visuelle de Kiabi
- IA Gemini : Utilisation de l'API Gemini pour la génération d'images

## Installation et Configuration

### 1. Installation des dépendances
```bash
npm install
```

### 2. Configuration de la clé API Gemini

#### Option A : Via l'interface web (Recommandé)
1. Lancez l'application : `npm run dev`
2. Ouvrez votre navigateur sur l'URL affichée
3. Dans le champ "Clé API Gemini", entrez votre clé API
4. Obtenez votre clé API sur [aistudio.google.com](https://aistudio.google.com/app/apikey)

#### Option B : Via le fichier de configuration
1. Ouvrez le fichier `config.js`
2. Remplacez `'your_gemini_api_key_here'` par votre vraie clé API
3. Sauvegardez le fichier

#### Option C : Via la console du navigateur
1. Ouvrez la console de votre navigateur (F12)
2. Tapez : `window.GEMINI_API_KEY = 'votre_cle_api_ici'`
3. Appuyez sur Entrée

### 3. Lancement de l'application
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173` (ou le port affiché dans le terminal).

## Utilisation

1. Entrez votre clé API dans le champ dédié
2. Téléchargez une image en cliquant sur la zone de téléchargement
3. Cliquez sur "Générer les Variations" pour créer les différentes versions
4. Attendez que toutes les variations soient générées
5. Visualisez les résultats dans la galerie à droite

## Personnalisation

L'application utilise les couleurs et l'identité visuelle de Kiabi :
- Couleurs principales : Rose (#e91e63) et Violet (#9c27b0)
- Typographie : Inter pour une lisibilité optimale
- Design : Interface moderne et responsive

## Technologies utilisées

- Frontend : React, TypeScript, Tailwind CSS
- IA : Google Gemini API
- Build : Vite
- Animations : Framer Motion

## Notes importantes

- La clé API Gemini est nécessaire pour le fonctionnement de l'application
- Les images générées respectent les vêtements et poses originales
- L'application est optimisée pour les appareils mobiles et desktop
- Toutes les variations sont générées en parallèle pour une meilleure performance

## Limitations

- Nécessite une connexion internet pour l'API Gemini
- Les images générées peuvent varier en qualité selon l'image source
- Limite de taux d'utilisation selon votre plan Gemini API