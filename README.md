# directus-websocket-subscribe
An extension to subscribe to directus updates over a websocket.

Currently this simply adds a websocket on the "/websocket" path you can connect to (warning no authentication whatsoever!). The cli will also output the definite port and path you can connect to.
Once you've connected with any websocket client you can do two things:
### 1. Request data
You request data by sending a message like this to the server: `{"type":"get", "collection":"test", "query":{"limit":2}}`.
Where the query object follows the ItemService.readByQuery options.
The server should respond with an object like this: `{"type":"RESPONSE","data":[...]}`.
### 2. Subscribe to updates
You can subscribe to updates of any collection like this: `{"type":"subscribe", "collection":"test"}`.
After doing so you will receive updates like a custom hook would (actions: `items.create`,`items.update`,`items.delete`) but over the websocket!
The update objects will look like this: `{"action":"update","payload":{"test":"lala","status":"published"},"keys":["3"],"collection":"test"}`

> Disclaimer: this is absolutely in alpha status and should not get near any sort of production environment! This should definitely not be considered secure in any way!