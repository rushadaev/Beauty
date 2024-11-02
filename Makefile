.PHONY: build up down restart shell composer artisan migrate fresh test setup
generate-swagger:
	docker-compose exec beauty php artisan l5-swagger:generate

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

restart:
	docker-compose restart

shell:
	docker-compose exec beauty bash

shell-root:
	docker-compose exec --user root beauty bash

composer:
	docker-compose exec beauty composer $(filter-out $@,$(MAKECMDGOALS))

artisan:
	docker-compose exec beauty php artisan $(filter-out $@,$(MAKECMDGOALS))

migrate:
	docker-compose exec beauty php artisan migrate

fresh:
	docker-compose exec beauty php artisan migrate:fresh --seed

test:
	docker-compose exec beauty php artisan test

setup:
	@docker-compose exec beauty sh -c '[ -f /var/www/wb-back/.env ] && echo ".env file already exists. Skipping .env file creation." || (cp /var/www/wb-back/.env.example /var/www/wb-back/.env && echo ".env file created from .env.example.")'
	@docker-compose exec beauty composer install -d /var/www/wb-back
	@docker-compose exec beauty php /var/www/wb-back/artisan key:generate
	@docker-compose exec beauty php /var/www/wb-back/artisan migrate
	@echo "Setup completed."

update-prod: stop build up setup

install-laravel:
	@docker-compose run --rm -u root beauty bash -c "\
		cd /var/www/wb-back && \
		rm -rf .[!.]* * && \
		curl -LO https://github.com/laravel/laravel/archive/refs/heads/master.zip && \
		unzip master.zip && \
		mv laravel-master/* laravel-master/.[!.]* . && \
		rm -rf laravel-master master.zip && \
		composer install"

clean:
	docker system prune -f
	
# Retry a specific failed job by ID
retry-job:
	@read -p "Enter job ID to retry: " job_id; \
	docker-compose exec beauty php artisan queue:retry $$job_id

# Retry all failed jobs
retry-all-jobs:
	docker-compose exec beauty php artisan queue:retry all

# List all failed jobs
list-failed-jobs:
	docker-compose exec beauty php artisan queue:failed

# Delete a specific failed job by ID
delete-failed-job:
	@read -p "Enter job ID to delete: " job_id; \
	docker-compose exec beauty php artisan queue:forget $$job_id

# Flush all failed jobs
flush-failed-jobs:
	docker-compose exec horizon php artisan horizon:forget --all

# Restart queue worker
restart-queue-worker:
	docker-compose restart queue-worker

%:
	@: