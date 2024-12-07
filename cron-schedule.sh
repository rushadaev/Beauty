#!/bin/sh

echo "Script starting at $(date)"

# Create directories for cron jobs and logs
mkdir -p /var/www/wb-back/cron.d
mkdir -p /var/www/wb-back/storage/logs

# Set initial permissions
chown -R www-data:www-data /var/www/wb-back/storage
chmod -R 775 /var/www/wb-back/storage

# Create crontab file
cat > /var/www/wb-back/cron.d/laravel-schedule << 'CRON'
# Laravel Scheduler
* * * * * cd /var/www/wb-back && php artisan schedule:run --verbose >> /var/www/wb-back/storage/logs/scheduler.log 2>&1

# Branches sync - hourly
0 * * * * cd /var/www/wb-back && php artisan app:fetch-branches-info >> /var/www/wb-back/storage/logs/branches-sync.log 2>&1

# Full branches sync - daily at 3 AM
0 3 * * * cd /var/www/wb-back && php artisan app:fetch-branches-info --full >> /var/www/wb-back/storage/logs/branches-sync-daily.log 2>&1
CRON

# Set crontab permissions
chmod 0644 /var/www/wb-back/cron.d/laravel-schedule

echo "Starting Supercronic..."
exec supercronic /var/www/wb-back/cron.d/laravel-schedule