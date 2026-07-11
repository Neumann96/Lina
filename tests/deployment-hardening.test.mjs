import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("sets browser security headers and hides framework disclosure", async () => {
  const config = await read("next.config.ts");

  assert.match(config, /poweredByHeader: false/);
  assert.match(config, /Content-Security-Policy/);
  assert.match(config, /frame-ancestors 'none'/);
  assert.match(config, /Permissions-Policy/);
  assert.match(config, /https:\/\/telegram\.org/);
});

test("runs releases read-only apart from the Next cache", async () => {
  const service = await read("deploy/lina.service");
  const workflow = await read(".github/workflows/deploy.yml");

  assert.match(service, /ProtectSystem=strict/);
  assert.match(service, /ReadWritePaths=\/opt\/lina\/current\/\.next\/cache/);
  assert.doesNotMatch(service, /ReadWritePaths=\/opt\/lina\s*$/m);
  assert.match(workflow, /chown -R root:root/);
  assert.match(workflow, /rolling back to/);
  assert.doesNotMatch(workflow, /ssh-keyscan/);
  assert.doesNotMatch(workflow, /AUTH_SECRET_B64='\$AUTH_SECRET_B64'/);
});

test("bounds edge traffic and serves immutable assets without Node", async () => {
  const nginx = await read("deploy/nginx.ssl.conf");
  const reminders = await read("src/app/api/reviews/notify/route.ts");

  assert.match(nginx, /limit_req_zone .*zone=lina_api/);
  assert.match(nginx, /limit_conn lina_connections 30/);
  assert.match(nginx, /keepalive 32/);
  assert.match(nginx, /alias \/opt\/lina\/current\/\.next\/static\//);
  assert.match(nginx, /proxy_read_timeout 180s/);
  assert.match(reminders, /const batchSize = 5/);
  assert.match(reminders, /Promise\.all\(batch\.map/);
});

test("pins the production SSH host key and workflow actions", async () => {
  const knownHosts = await read("deploy/known_hosts");
  const workflow = await read(".github/workflows/deploy.yml");

  assert.match(knownHosts, /^5\.129\.195\.206.*ssh-ed25519 /);
  assert.match(workflow, /actions\/checkout@[0-9a-f]{40}/);
  assert.match(workflow, /actions\/setup-node@[0-9a-f]{40}/);
});
