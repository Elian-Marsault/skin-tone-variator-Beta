# Skin Tone Variator - Docker Setup

## Déploiement rapide

### 1. Configuration
```bash
# Copier le fichier d'environnement
cp env.example .env

# Éditer .env et ajouter votre clé API Gemini
GEMINI_API_KEY=votre_cle_api_ici
```

### 2. Déploiement avec Docker Compose
```bash
# Démarrer tous les services
docker-compose up -d

# Vérifier les logs
docker-compose logs -f

# Arrêter les services
docker-compose down
```

### 3. Accès à l'application
- Frontend : http://localhost:4000
- Backend API : http://localhost:3001
- Health Check : http://localhost:4000/healthz

## Déploiement manuel

### Frontend seulement
```bash
docker build -t skin-tone-variator:latest .
docker run --rm -p 4000:8080 skin-tone-variator:latest
```

### Backend seulement
```bash
cd backend
docker build -t skin-tone-variator-backend:latest .
docker run --rm -p 3001:3001 -e GEMINI_API_KEY=votre_cle skin-tone-variator-backend:latest
```

## Sécurité

### Améliorations apportées :
- Proxy backend : API calls via serveur sécurisé
- Headers de sécurité : CSP, XSS protection, etc.
- Utilisateur non-root : Sécurité renforcée
- Health checks : Monitoring automatique


## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Gemini API    │
│   (Nginx)       │◄──►│   (Node.js)     │◄──►│   (Google)      │
│   Port: 4000    │    │   Port: 3001    │    │   External      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Commandes utiles

```bash
# Voir les logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Redémarrer un service
docker-compose restart backend

# Mettre à jour les images
docker-compose pull
docker-compose up -d

# Nettoyer
docker-compose down -v
docker system prune -f
```

## Production

Pour la production, configurez :
- Domaine : Mettez à jour BACKEND_URL dans le frontend
- HTTPS : Ajoutez un reverse proxy (Traefik, Nginx)
- Monitoring : Configurez les health checks
- Secrets : Utilisez un gestionnaire de secrets (Docker Secrets, Vault)

