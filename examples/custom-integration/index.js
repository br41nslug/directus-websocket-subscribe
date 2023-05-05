export default function registerHook(_, { emitter }) {
    emitter.onFilter('websocket.register', (registerHandler) => {
        registerHandler((_, context) => {
            const { 
                services: { ItemsService },
                database: knex, getSchema
            } = context;
            return {
                parseMessage(message) {
                    if (message.type !== "EXAMPLE") return;
                    return message;
                },
                async onMessage(client, message) {
                    // simply does exactly the same as the GET handler
                    const service = new ItemsService(message.collection, {
                        knex, schema: await getSchema(),
                        accountability: client.accountability
                    });
                    const result = await service.readByQuery(message.query);
                    const msg = { type: 'RESPONSE', data: result };
                    if (message?.uid) msg.uid = message.uid;
                    client.socket.send(JSON.stringify(msg));
                },
            };
        });
    });
}
