module.exports = function registerHook(_, { logger, emitter }) {
        emitter.onFilter('websocket.config', (cfg) => {
                logger.info('[ ext ] websocket config - ' + JSON.stringify(cfg));
                cfg.path = '/test';
                logger.info('[ ext ] websocket config - ' + JSON.stringify(cfg));
                return cfg;
        });
};
