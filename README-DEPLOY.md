# 🚀 Déploiement sur Render

## Configuration requise

### Variables d'environnement
- `GEMINI_API_KEY` : Clé API Gemini (obligatoire)
- `NODE_ENV` : production (automatique)
- `FRONTEND_URL` : URL de l'application (automatique)

## Déploiement automatique

1. **Connecte ton repo GitHub** à Render
2. **Sélectionne** le service `skin-tone-variator`
3. **Configure** la variable `GEMINI_API_KEY` dans les paramètres
4. **Déploie** !

## Commandes de build

- **Build** : `npm run build`
- **Start** : `npm start`

## Structure du projet

- **Backend** : Express.js sur le port configuré par Render
- **Frontend** : React + Vite, servi par le backend en production
- **API** : `/api/generate-variation` pour la génération d'images

## URLs

- **Production** : https://skin-tone-variator.onrender.com
- **API** : https://skin-tone-variator.onrender.com/api/generate-variation
