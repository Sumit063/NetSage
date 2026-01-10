.PHONY: test-backend test-frontend docker-build

test-backend:
	cd backend && go test ./...

test-frontend:
	cd frontend && npm ci && npm run build

docker-build:
	docker build -t netsage-backend ./backend
	docker build -t netsage-frontend ./frontend
