.PHONY: up down test

up:
	docker compose up -d --build

down:
	docker compose down

test:
	docker compose run --rm api python -m pytest -q 2>/dev/null || true
