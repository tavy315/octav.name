COMMAND ?=

all: help
.PHONY: all

help:
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[1;33m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[1;33m%-25s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
.PHONY: help

serve: ## Run jekyll serve
	bundle exec jekyll serve
.PHONY: serve

wsl: ## Run jekyll serve (live reload + force polling) on WSL
	bundle exec jekyll serve --force_polling --livereload
.PHONY: wsl

docker-serve: ## Runs Jekyll serve with sane defaults, good for local Jekyll site dev
	docker run -p 4000:4000 -v $(pwd):/site bretfisher/jekyll-serve
.PHONY: docker-serve

docker-jekyll:
	docker run -v $(pwd):/site bretfisher/jekyll
.PHONY: docker-jekyll

# docker run -v $(pwd):/site -it --entrypoint bash bretfisher/jekyll
# Then run your commands interactively:
# bundle install --retry 5 --jobs 20
# bundle exec jekyll build
