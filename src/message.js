/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Allows you to subscribe to Directus collection items using a similar syntax as the items API.
 */


// parse incoming message
export function parseIncomingMessage(msg, schema) {
    const req = JSON.parse(msg.data);
    const type = (req.type || 'fetch').trim().toUpperCase();
    const collection = (req.collection || '').trim().toLowerCase();
    if (typeof collection !== "string" || collection.length === 0) {
        throw new Error('Collection is required');
    }
    if ( ! schema.collections[collection]) {
        throw new Error('Collection does not exist in schema');
    }
    switch (type) {
        case 'GET':
            let query = {};
            if (typeof req.query === "object" && !Array.isArray(req.query)) {
                const queryProps = ['fields', 'sort', 'filter', 'limit', 'offset', 'page', 'search', 'group', 'aggregate', 'deep', 'alias' ];
                queryProps.forEach((prop) => {
                    if ( !! req.query[prop]) {
                        query[prop] = req.query[prop];
                    }
                });
            }
            return { type, collection, query };
        case 'SUBSCRIBE':
            const id = req.id || false;
            return { type, collection, id };
        default:
            throw new Error('Invalid message type! get or subscribe expected');
    }
}

export function outgoingResponse(data) {
    return JSON.stringify({
        type: 'RESPONSE',
        data
    });
}