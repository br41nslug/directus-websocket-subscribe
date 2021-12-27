/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Manages server configuration.
 */
import { ApiExtensionContext } from '@directus/shared/dist/esm/types';

export type DirectusWebsocketConfig = {
    public: boolean;
    path: string;
};

export const defaultConfig: DirectusWebsocketConfig = {
    public: false,
    path: '/websocket',
};

function getEnvironmentConfig(config: DirectusWebsocketConfig, env: Record<string, any>): DirectusWebsocketConfig {
    if ('WEBSOCKET_PUBLIC' in env) config.public = !!env.WEBSOCKET_PUBLIC;
    if ('WEBSOCKET_PATH' in env) config.path = env.WEBSOCKET_PATH;
    return config;
}

export async function getConfig({ emitter, logger, env }: ApiExtensionContext): Promise<DirectusWebsocketConfig> {
    let config: DirectusWebsocketConfig = await emitter.emitFilter('websocket.config', defaultConfig);
    logger.debug('[ WS ] added extension config overrides - ' + JSON.stringify(config));
    config = getEnvironmentConfig(config, env);
    logger.debug('[ WS ] added environment config - ' + JSON.stringify(config));
    return config;
}