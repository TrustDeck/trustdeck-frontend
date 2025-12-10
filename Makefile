
gen-cert:
	rm -rf local-key.pem local-cert.pem
	openssl req -newkey rsa:2048 -nodes -keyout local-key.pem -x509 -days 365 -out local-cert.pem -subj "/CN=localhost"

build:
	npm run build
	docker build --no-cache -t trustdeck-frontend:latest .

compose:
	docker compose down -v
	docker compose build --no-cache --pull
	docker compose up -d --force-recreate

.PHONY: gen-cert build compose