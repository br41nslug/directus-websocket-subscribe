/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 *
 * Integration with Directus usign a custom hook extension.
 */
import { defineHook } from "@directus/extensions-sdk";
import {
  getHandler,
  postHandler,
  patchHandler,
  deleteHandler,
  subscribeHandler,
} from "./handlers";
import { DirectusWebsocketServer } from "./server";
import { getConfig } from "./config";
import { WebsocketClient } from "./types";

export default defineHook(async ({ init, action }, context) => {
  const { logger, emitter } = context;
  const config = await getConfig(
    {
      public: false,
      path: "/websocket",
      system: false,
      core: {
        get: true,
        post: true,
        patch: true,
        delete: true,
        subscribe: true,
      },
      autoSubscriptionCollections: [],
    },
    context
  );
  const wsServer = new DirectusWebsocketServer(config, context);

  if (!config.public) {
    logger.debug(
      "Websocket Subscribe Extension is set to private, only valid keys will be accepted."
    );
  }

  // connect core message handlers
  wsServer.register(getHandler);
  wsServer.register(postHandler);
  wsServer.register(patchHandler);
  wsServer.register(deleteHandler);
  const subscription = wsServer.register(subscribeHandler);
  // allow auto subscription to collections
  wsServer.setAutoSubscriber((client: WebsocketClient) => {
    config.autoSubscriptionCollections.forEach(async (collection) => {
      try {
        await subscription.onMessage(client, {
          type: "SUBSCRIBE",
          collection: collection,
        });
      } catch (error) {
        /* empty */
      }
    });
  });
  // allow registration of handlers via the custom emitter
  await emitter.emitFilter("websocket.register", (init: any) =>
    wsServer.register(init)
  );

  // hook into server start events
  Promise.all([
    new Promise((r) => init("app.after", ({ app }) => r(app))),
    new Promise((r) => action("server.start", ({ server }) => r(server))),
  ]).then(([app, server]) => wsServer.hookServer(app, server));

  // hook into item manipulation actions
  const dispatchAction = subscription.buildDispatcher(action, logger);
  (config.system
    ? [
        // listen to all the system collections too
        "items",
        "activity",
        "collections",
        "fields",
        "folders",
        "permissions",
        "presets",
        "relations",
        "revisions",
        "roles",
        "settings",
        "users",
        "webhooks",
      ]
    : ["items"]
  ).forEach((collection) => {
    dispatchAction(collection + ".create", ({ key }: any) => ({ key }));
    dispatchAction(collection + ".update", ({ keys }: any) => ({ keys }));
    dispatchAction(collection + ".delete");
  });
});
