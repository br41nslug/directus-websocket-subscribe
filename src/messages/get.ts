import { outgoingResponse } from '../util';

export async function getHandler(ws: WebSocket, message: any, service: any) {
    const result = await service.readByQuery(message.query);
    ws.send(outgoingResponse(result, message));
}