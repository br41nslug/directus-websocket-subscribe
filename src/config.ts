/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Manages server configuration.
 */
import { ApiExtensionContext } from '@directus/shared/dist/esm/types';
import { DirectusWebsocketConfig } from './types';

export const defaultWebsocketConfig: DirectusWebsocketConfig = {
    public: false,
    path: '/websocket',
};

export async function getConfig({ emitter, logger, env }: ApiExtensionContext): Promise<DirectusWebsocketConfig> {
    let config: DirectusWebsocketConfig = await emitter.emitFilter('websocket.config', defaultWebsocketConfig);
    logger.debug('[ WS ] added extension config overrides - ' + JSON.stringify(config));
    if ('WEBSOCKET_PUBLIC' in env) {
        config.public = !!env.WEBSOCKET_PUBLIC;
    }
    if ('WEBSOCKET_PATH' in env) {
        config.path = env.WEBSOCKET_PATH;
    }
    logger.debug('[ WS ] added environment config - ' + JSON.stringify(config));
    return config;
}