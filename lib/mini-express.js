const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

function createApp() {
  const middlewares = [];
  const routes = [];

  function app(request, response) {
    decorateResponse(response);
    const parsed = new URL(request.url, "http://localhost");
    request.path = parsed.pathname;
    request.query = Object.fromEntries(parsed.searchParams.entries());

    let index = 0;
    const stack = [
      ...middlewares,
      ...routes
        .filter((route) => route.method === request.method && (route.path === request.path || route.path === "*"))
        .map((route) => route.handler)
    ];

    function next() {
      const handler = stack[index];
      index += 1;
      if (!handler) {
        response.statusCode = 404;
        response.end("Not found");
        return;
      }
      handler(request, response, next);
    }

    next();
  }

  app.use = (handler) => middlewares.push(handler);
  app.get = (routePath, handler) => routes.push({ method: "GET", path: routePath, handler });
  app.post = (routePath, handler) => routes.push({ method: "POST", path: routePath, handler });
  app.listen = (port, callback) => http.createServer(app).listen(port, callback);

  return app;
}

function decorateResponse(response) {
  response.status = (code) => {
    response.statusCode = code;
    return response;
  };
  response.json = (value) => {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify(value));
  };
  response.sendStatus = (code) => {
    response.statusCode = code;
    response.end(String(code));
  };
  response.sendFile = (filePath) => {
    fs.readFile(filePath, (error, data) => {
      if (error) {
        response.statusCode = 404;
        response.end("Not found");
        return;
      }
      response.setHeader("Content-Type", contentType(filePath));
      response.end(data);
    });
  };
}

createApp.json = () => (request, response, next) => {
  if (!["POST", "PUT", "PATCH"].includes(request.method)) {
    next();
    return;
  }

  let body = "";
  request.on("data", (chunk) => {
    body += chunk;
  });
  request.on("end", () => {
    try {
      request.body = body ? JSON.parse(body) : {};
    } catch {
      request.body = {};
    }
    next();
  });
};

createApp.static = (root) => (request, response, next) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    next();
    return;
  }

  const relativePath = decodeURIComponent(request.path === "/" ? "/index.html" : request.path);
  const filePath = path.normalize(path.join(root, relativePath));

  if (!filePath.startsWith(path.normalize(root))) {
    response.statusCode = 403;
    response.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      next();
      return;
    }
    response.sendFile(filePath);
  });
};

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml"
  }[extension] || "application/octet-stream";
}

module.exports = createApp;
