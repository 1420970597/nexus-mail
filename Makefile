SHELL := /bin/bash

.PHONY: help bootstrap up down build logs ps test lint fmt web-install web-build

help:
	@echo "可用命令:"
	@echo "  make bootstrap   - 初始化本地开发依赖并生成环境文件"
	@echo "  make up          - 启动 docker compose 开发环境"
	@echo "  make down        - 停止开发环境"
	@echo "  make build       - 构建后端与前端"
	@echo "  make test        - 运行后端与前端测试"
	@echo "  make lint        - 运行后端与前端静态检查"
	@echo "  make fmt         - 格式化代码"
	@echo "  make logs        - 查看容器日志"
	@echo "  make ps          - 查看容器状态"

bootstrap:
	@test -f .env || cp .env.example .env
	@echo "已准备 .env 文件"

up:
	docker compose up -d --build

down:
	docker compose down

build:
	docker compose build api worker scheduler mail-ingest web

logs:
	docker compose logs -f --tail=200

ps:
	docker compose ps

test:
	go test ./...
	cd web && pnpm test

lint:
	go vet ./...
	cd web && pnpm lint

fmt:
	gofmt -w ./cmd ./internal
	cd web && pnpm format

web-install:
	cd web && pnpm install

web-build:
	cd web && pnpm build
