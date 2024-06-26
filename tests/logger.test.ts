import { describe, it } from "bun:test";
import Elysia, { t } from "elysia";

import { logWebSocketMessage, logger } from "../src";

const consoleLogInterceptor = () => {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...args: any[]) => {
    logs.push(
      args
        .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
        .join(" ")
    );
    originalLog.apply(console, args);
  };
  return logs;
};

describe("logger middleware", () => {
  it("logs method, path, and response time", async () => {
    consoleLogInterceptor();

    const app = new Elysia().use(logger);

    app.get("/test-path", () => ({
      status: 200,
      body: JSON.stringify({ message: "ok" }),
    }));

    await app
      .handle(new Request("http://localhost/test-path"))
      .then((res) => res.json());
  });
  it("logs with IP", async () => {
    consoleLogInterceptor();

    const app = new Elysia();

    app.use(logger(app, { logIP: true, writer: { write: console.log } }));

    app.get("/test-path", () => {
      return {
        status: 200,
        body: JSON.stringify({ message: "ok" }),
      };
    });

    await app
      .handle(
        new Request("http://localhost/test-path", {
          headers: {
            "X-Forwarded-For": "127.0.0.1",
          },
        })
      )
      .then((res) => res.json());
  });
});

describe("logger middleware for all HTTP methods", () => {
  it("logs each method in correct color within a single test", async () => {
    consoleLogInterceptor();
    const app = new Elysia().use(logger);

    const routeHandler = () => ({
      status: 200,
      body: JSON.stringify({ message: "ok" }),
    });

    app.get("/test-path", routeHandler);
    app.post("/test-path", routeHandler);
    app.put("/test-path", routeHandler);
    app.delete("/test-path", routeHandler);
    app.patch("/test-path", routeHandler);
    app.options("/test-path", routeHandler);
    app.head("/test-path", routeHandler);

    const methods = [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "OPTIONS",
      "HEAD",
    ];

    for (const method of methods) {
      await app
        .handle(new Request(`http://localhost/test-path`, { method }))
        .then((res) => res.json());
    }
  });
});

describe("logger middleware for websocket", () => {
  it("logs websocket connection", async () => {
    consoleLogInterceptor();
    const app = new Elysia().use(logger);

    app.ws("/test-path", {
      body: t.Object({
        message: t.String(),
        number: t.Number(),
      }),
      open: () => {
        console.log("ws opened");
      },
      message: (ws, message) => {
        logWebSocketMessage(message);
      },
      close: () => {
        console.log("ws closed");
      },
    })

     const ws = new WebSocket("ws://localhost/test-path");

    const client = await app.handle(
      new Request("http://localhost/test-path", {
        headers: { Upgrade: "websocket" },
      })
    );
  });
});
