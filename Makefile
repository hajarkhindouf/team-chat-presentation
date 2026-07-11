.PHONY: help install migrate start stop dev test test-unit test-integration test-e2e coverage lint \
        build up down logs ps clean clean-docker test-docker build-docker restart

BACKEND_DIR := backend
COMPOSE := docker compose

help: ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

## ---------- Sans Docker (local Node.js) ----------

install: ## Installe les dépendances backend
	cd $(BACKEND_DIR) && npm install

migrate: ## Exécute la migration de la base de données (table chat_messages)
	cd $(BACKEND_DIR) && npm run migrate

start: migrate ## Démarre le backend en local (Node.js)
	cd $(BACKEND_DIR) && npm start

test: ## Lance toute la suite de tests (unit + integration + e2e)
	cd $(BACKEND_DIR) && npm test

test-unit: ## Lance uniquement les tests unitaires
	cd $(BACKEND_DIR) && npm run test:unit

test-integration: ## Lance uniquement les tests d'intégration
	cd $(BACKEND_DIR) && npm run test:integration

test-e2e: ## Lance uniquement les tests end-to-end
	cd $(BACKEND_DIR) && npm run test:e2e

coverage: ## Lance les tests avec couverture de code
	cd $(BACKEND_DIR) && npm run test:coverage

lint: ## Analyse statique du code
	cd $(BACKEND_DIR) && npm run lint

clean: ## Nettoie node_modules, coverage et la base sqlite locale
	rm -rf $(BACKEND_DIR)/node_modules $(BACKEND_DIR)/coverage $(BACKEND_DIR)/data

## ---------- Avec Docker Compose ----------

build: ## Construit les images Docker (backend + frontend)
	$(COMPOSE) build

up: ## Démarre l'application complète (backend + frontend) via Docker Compose
	$(COMPOSE) up -d

down: ## Arrête et supprime les conteneurs
	$(COMPOSE) down

restart: down up ## Redémarre l'application

logs: ## Affiche les logs des conteneurs
	$(COMPOSE) logs -f

ps: ## Liste les conteneurs en cours d'exécution
	$(COMPOSE) ps

test-docker: ## Lance la suite de tests dans un conteneur dédié (image 'test')
	$(COMPOSE) --profile test run --rm backend-test

build-docker: build ## Alias explicite pour construire les images

clean-docker: ## Arrête les conteneurs et supprime volumes + images du projet
	$(COMPOSE) down -v --rmi local --remove-orphans
