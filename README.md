# Team3 — Chat "General" (MVP)

Application de chat en temps quasi-réel limitée à un canal unique **#General**, développée
pour l'examen DevOps (Team3). Le projet couvre l'intégralité du cycle : code applicatif,
tests automatisés, conteneurisation, build automation et intégration continue.

## 1. Fonctionnalités livrées (cahier des charges)

| Exigence | Statut | Où |
|---|---|---|
| Envoyer un message dans le canal unique "General" | ✅ | `POST /api/chat/messages` |
| Voir l'historique des messages (pagination) | ✅ | `GET /api/chat/messages?limit=&offset=` |
| Voir qui a envoyé chaque message (nom + avatar) | ✅ | champ `author_name` / `author_avatar` (généré via ui-avatars.com) |
| Actualisation manuelle (bouton Refresh) | ✅ | bouton "🔄 Refresh" dans le frontend |
| Auto-refresh toutes les 5 secondes | ✅ | `setInterval(fetchMessages, 5000)`, activable/désactivable |
| Date/heure du message | ✅ | champ `created_at`, affiché formaté |
| Créer un sondage (question + 2 à 10 options) | ✅ (bonus) | `POST /api/chat/polls`, vote via `POST /api/chat/polls/:id/vote` |
| Supprimer son propre message | ✅ | `DELETE /api/chat/messages/:id` (403 si pas l'auteur) |
| Script de migration base de données (table `chat_messages`) | ✅ | `backend/src/db/migrate.js` (+ `npm run migrate` / `make migrate`) |

## 2. Architecture

```
chat-app/
├── backend/                # API Node.js / Express + SQLite (better-sqlite3)
│   ├── src/
│   │   ├── app.js          # factory Express (utilisée par les tests)
│   │   ├── server.js       # point d'entrée (migration + listen)
│   │   ├── db/
│   │   │   ├── connection.js
│   │   │   └── migrate.js  # script de migration idempotent
│   │   ├── models/message.js
│   │   └── routes/{chat,poll}.js
│   ├── tests/
│   │   ├── unit/            # modèle de données, sans HTTP
│   │   ├── integration/     # API via supertest
│   │   └── e2e/              # parcours utilisateur complet (join → chat → poll → delete)
│   └── Dockerfile           # multi-stage: deps / test / runtime
├── frontend/                 # SPA HTML/CSS/JS vanilla, servie par Nginx
│   ├── index.html
│   ├── nginx.conf            # proxy /api -> backend:3000
│   └── Dockerfile
├── docker-compose.yml         # backend + frontend (+ profil "test")
├── Makefile                   # build automation, avec et sans Docker
└── .github/workflows/ci.yml   # pipeline CI
```

Le frontend est un client statique (aucun framework) qui consomme l'API REST du backend.
Il tourne derrière Nginx qui reverse-proxy `/api/*` vers le service `backend`.

## 3. Démarrage rapide

### Sans Docker (Node.js local)
```bash
make install    # npm install
make migrate    # crée la base SQLite + table chat_messages
make start       # démarre le backend sur http://localhost:3000
```
Ouvrez ensuite `frontend/index.html` dans un navigateur (ou servez-le avec un serveur
statique quelconque) en pointant `window.CHAT_API_BASE` vers `http://localhost:3000/api`.

### Avec Docker Compose
```bash
make build   # docker compose build
make up      # démarre backend (:3000) + frontend (:8080)
make logs    # suivre les logs
make down    # arrêter
```
Frontend: http://localhost:8080 — Backend: http://localhost:3000/api/health

## 4. Tests

Trois niveaux de tests, indépendants les uns des autres :

- **Unitaires** (`backend/tests/unit`) : la couche d'accès aux données (`models/message.js`)
  testée en isolation sur une base SQLite en mémoire.
- **Intégration** (`backend/tests/integration`) : les endpoints REST testés via `supertest`
  contre l'application Express (sans serveur HTTP réel).
- **E2E** (`backend/tests/e2e`) : un vrai serveur HTTP est démarré et un parcours
  utilisateur complet est rejoué (arrivée sur le canal, envoi de messages, création d'un
  sondage, vote, double-vote refusé, suppression de message).

```bash
make test              # tous les tests
make test-unit
make test-integration
make test-e2e
make coverage           # avec rapport de couverture (seuil configuré à 70%)
make test-docker        # exécute la suite de tests dans un conteneur dédié
```

Résultat actuel : **16 tests, 3 suites, ~88% de couverture** (statements).

## 5. Build automation (Makefile)

Le `Makefile` fournit deux familles de cibles, listées avec `make help` :

- **Local (Node.js)** : `install`, `migrate`, `start`, `test*`, `coverage`, `lint`, `clean`
- **Docker Compose** : `build`, `up`, `down`, `restart`, `logs`, `ps`, `test-docker`,
  `clean-docker`

## 6. Dockerisation

Chaque composant a son propre `Dockerfile` :

- `backend/Dockerfile` : build multi-stage (`deps` → `test` → `runtime`), image finale
  Alpine, utilisateur non-root, `HEALTHCHECK` sur `/api/health`.
- `frontend/Dockerfile` : image Nginx Alpine servant le SPA statique + reverse proxy API.

`docker-compose.yml` orchestre les deux services avec un volume persistant pour la base
SQLite et un profil `test` dédié à l'exécution de la suite de tests en conteneur.

## 7. Intégration continue

`.github/workflows/ci.yml` définit un pipeline avec les jobs suivants, déclenché sur
chaque push et pull request :

1. `lint` — ESLint
2. `unit-tests`, `integration-tests`, `e2e-tests` — en parallèle après le lint
3. `coverage` — génère et archive le rapport de couverture
4. `docker-build` — build des deux images Docker + smoke test du conteneur backend
   (`/api/health`)

## 8. Modèle de données

Table `chat_messages` (créée par `migrate.js`) :

| Colonne | Type | Description |
|---|---|---|
| id | TEXT (UUID) | clé primaire |
| channel | TEXT | toujours `General` pour le MVP |
| author_name | TEXT | nom de l'auteur |
| author_avatar | TEXT | URL de l'avatar (générée) |
| content | TEXT | contenu du message |
| created_at | TEXT (ISO 8601) | horodatage |

Tables `polls`, `poll_options`, `poll_votes` pour la fonctionnalité sondage (bonus).

## 9. Endpoints API (version MVP)

```
GET    /api/health                       - healthcheck
GET    /api/chat/messages?limit=&offset= - liste des messages (paginé)
POST   /api/chat/messages                - envoyer un message      { authorName, content }
DELETE /api/chat/messages/:id            - supprimer son message   { authorName }

POST   /api/chat/polls                   - créer un sondage        { authorName, question, options[2..10] }
POST   /api/chat/polls/:id/vote          - voter                   { optionId, voterName }
GET    /api/chat/polls/:id               - résultats du sondage
```

## 10. Workflow Git recommandé pour l'équipe

- `main` : toujours déployable, protégée
- `develop` : intégration continue des features
- `feature/<nom>` : une branche par fonctionnalité (ex. `feature/chat`), mergée dans
  `develop` via Pull Request après revue
- Tags sémantiques (`v0.1.0`, `v0.2.0`, ...) posés sur `main` à chaque livraison stable
