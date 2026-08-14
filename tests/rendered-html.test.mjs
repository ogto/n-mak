import assert from "node:assert/strict";
import test from "node:test";

const DEFAULT_STORE_PATH = "/s/1xbHos";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("redirects the root route to the default store", async () => {
  const response = await render();

  assert.equal(response.status, 307);
  assert.equal(
    new URL(response.headers.get("location") ?? "", "http://localhost").pathname,
    DEFAULT_STORE_PATH,
  );
});

test("server-renders the fish brothers storefront", async () => {
  const response = await render(DEFAULT_STORE_PATH);

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /어시장브라더스/);
  assert.match(html, /오늘의 행운을/);
  assert.match(html, /출석체크/);
  assert.match(html, /내 쿠폰/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("server-renders the fishing game route", async () => {
  const response = await render(`${DEFAULT_STORE_PATH}/game`);

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /행운의 대어잡기/);
  assert.match(html, /낚싯줄 던지기/);
  assert.match(html, /오늘 1회/);
  assert.match(html, /카카오 로그인 후 참여해요/);
});
