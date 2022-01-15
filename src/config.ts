/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Manages server configuration.
 */
import { ApiExtensionContext } from '@directus/shared/types';
import { DirectusWebsocketConfig } from './types';

export async function getConfig(
    defaultWebsocketConfig: DirectusWebsocketConfig,
    { emitter, logger, env }: ApiExtensionContext
): Promise<DirectusWebsocketConfig> {
    let config: DirectusWebsocketConfig = await emitter.emitFilter('websocket.config', defaultWebsocketConfig);
    logger.debug('[ WS ] added extension config overrides - ' + JSON.stringify(config));
    if ('WEBSOCKET_PUBLIC' in env) config.public = !!env.WEBSOCKET_PUBLIC;
    if ('WEBSOCKET_PATH' in env) config.path = env.WEBSOCKET_PATH;
    if ('WEBSOCKET_SYSTEM_GET' in env) {
        if ( ! config.system) config.system = {};
        config.system.get = !!env.WEBSOCKET_SYSTEM_GET;
    }
    if ('WEBSOCKET_SYSTEM_POST' in env) {
        if ( ! config.system) config.system = {};
        config.system.post = !!env.WEBSOCKET_SYSTEM_POST;
    }
    if ('WEBSOCKET_SYSTEM_PATCH' in env) {
        if ( ! config.system) config.system = {};
        config.system.patch = !!env.WEBSOCKET_SYSTEM_PATCH;
    }
    if ('WEBSOCKET_SYSTEM_DELETE' in env) {
        if ( ! config.system) config.system = {};
        config.system.delete = !!env.WEBSOCKET_SYSTEM_DELETE;
    }
    if ('WEBSOCKET_SYSTEM_SUBSCRIBE' in env) {
        if ( ! config.system) config.system = {};
        config.system.subscribe = !!env.WEBSOCKET_SYSTEM_SUBSCRIBE;
    }
    logger.debug('[ WS ] added environment config - ' + JSON.stringify(config));
    return config;
}