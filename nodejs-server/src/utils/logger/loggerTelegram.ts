import { createLogger, format, transports, Logger } from 'winston';

const loggerTelegram: Logger = createLogger({
    level: 'info',
    format: format.json(),
    defaultMeta: { service: 'nodejs-server' },
    transports: [
        new transports.Console({
            format: format.combine(
                format.timestamp(),
                format.simple()
            ),
        }),
        new transports.File({
            filename: 'telegram.log',
            format: format.json(),
        }),
    ],
});

export default loggerTelegram;
