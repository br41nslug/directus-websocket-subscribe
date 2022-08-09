/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Helper functions for dealing with incoming messages
 */
import { Query } from '@directus/shared/types';
import { ServerResponse } from 'http';
import { WebsocketMessage } from './types';

// parse incoming message
export function parseIncomingMessage(message: Record<string, any>, schema: any): WebsocketMessage {
    const type = (message.type || '').trim().toUpperCase();
    let msg: WebsocketMessage = { 
        type, uid: message.uid || false,
        query: message.query as Query,
    }
    if (message.collection) {
        const collection = message.collection.trim().toLowerCase();
        if (typeof collection !== "string" || collection.length === 0) {
            throw new Error('Collection is required');
        }
        if ( ! schema.collections[collection]) {
            throw new Error('Collection does not exist in schema');
        }
        msg.collection = collection;
    }
    return msg;
}

export function outgoingResponse(data: any, message?: WebsocketMessage): string {
    const msg: WebsocketMessage = { type: 'RESPONSE', data };
    if (message?.uid) msg.uid = message.uid;
    return JSON.stringify(msg);
}

export function outgoingError(data: any, message?: WebsocketMessage): string {
    const msg: WebsocketMessage = { type: 'ERROR', data };
    if (message?.uid) msg.uid = message.uid;
    return JSON.stringify(msg);
}

export function runExpress(app: any, request: any): Promise<any> {
    return new Promise((resolve, reject) => {
        if (!app) return reject();
        let count = 0;
        const response = new ServerResponse(request)
        app(request, response);
        const interval = setInterval(() => {
            if (response.writableEnded) {
                clearInterval(interval);
                resolve(request);
            }
            if (count > 20) { // should add up to 1 second
                console.error('max interval reached');
                clearInterval(interval);
                reject();
            }
            count++;
        }, 50);
    });
}