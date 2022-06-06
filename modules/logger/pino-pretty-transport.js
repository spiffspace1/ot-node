// pino-pretty-transport.js
import PinoPretty from 'pino-pretty';

export default (opts) =>
    PinoPretty({
        ...opts,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname,Event_name,Operation_name,Id_operation',
        hideObject: true,
        messageFormat: (log, messageKey) => `${log[messageKey]}`,
    });
