#!/bin/sh

# Set working directory
WORK_DIR="/var/www/wb-back"

echo "Script starting at $(date)"

# Create directories and set permissions
mkdir -p ${WORK_DIR}/storage/logs
mkdir -p ${WORK_DIR}/cron.d
touch ${WORK_DIR}/storage/logs/scheduler.log
touch ${WORK_DIR}/storage/logs/warehouse-notifications.log

# Set permissions
chown -R www-data:www-data ${WORK_DIR}/storage
chmod -R 775 ${WORK_DIR}/storage
chmod 664 ${WORK_DIR}/storage/logs/*.log

# Create crontab file with correct syntax
echo "* * * * * cd ${WORK_DIR} && php artisan schedule:run --verbose >> ${WORK_DIR}/storage/logs/scheduler.log 2>&1" > ${WORK_DIR}/cron.d/laravel-schedule
chmod 0644 ${WORK_DIR}/cron.d/laravel-schedule

echo "Crontab content:"
cat ${WORK_DIR}/cron.d/laravel-schedule

echo "Starting Supercronic..."
exec supercronic -debug ${WORK_DIR}/cron.d/laravel-schedule