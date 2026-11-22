// Requires a migrated PostgreSQL database: DATABASE_URL=... npm run test -w @momentum/api
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";

const enabled = Boolean(process.env["DATABASE_URL"]);

type Prisma = typeof import("../src/lib/prisma.js").prisma;

describe("MCP server (integration)", { skip: !enabled }, () => {
  let server: Server;
  let base = "";
  let prisma: Prisma;
  let oauth: typeof import("../src/mcp/oauth.service.js");
  const suffix = randomBytes(4).toString("hex");
  const users: Record<"a" | "b", { id: string; email: string }> = {
    a: { id: "", email: `mcp-a-${suffix}@example.test` },
    b: { id: "", email: `mcp-b-${suffix}@example.test` },
  };
  const password = "correct-horse-battery";
  const sessionIds: Record<"a" | "b", string> = { a: "", b: "" };
  let exerciseId = "";

  const pkce = () => {
    const verifier = randomBytes(32).toString("base64url");
    return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
  };

  async function register(redirectUri = "http://127.0.0.1:19999/callback") {
    const res = await fetch(`${base}/oauth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_name: "Test <b>Client</b>", redirect_uris: [redirectUri] }),
    });
    assert.equal(res.status, 201);
    return (await res.json()) as { client_id: string };
  }

  async function authorize(clientId: string, challenge: string, user: "a" | "b", pass = password) {
    const redirectUri = "http://127.0.0.1:19999/callback";
    const query = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: challenge,
      code_challenge_method: "S256",
      state: "st4te",
      resource: `${base}/mcp`,
    });
    const page = await fetch(`${base}/oauth/authorize?${query}`);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.ok(html.includes("lecture seule"));
    assert.ok(!html.includes("<b>Client</b>"), "client name must be escaped");
    const ticket = /name="ticket" value="([^"]+)"/.exec(html)![1]!;
    return fetch(`${base}/oauth/authorize`, {
      method: "POST",
      redirect: "manual",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        ticket,
        action: "approve",
        email: users[user].email,
        password: pass,
      }),
    });
  }

  async function token(params: Record<string, string>) {
    const res = await fetch(`${base}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
    });
    return { status: res.status, body: (await res.json()) as Record<string, string> };
  }

  async function fullFlow(user: "a" | "b") {
    const client = await register();
    const { verifier, challenge } = pkce();
    const res = await authorize(client.client_id, challenge, user);
    assert.equal(res.status, 302);
    const location = new URL(res.headers.get("location")!);
    assert.equal(location.searchParams.get("state"), "st4te");
    assert.equal(location.searchParams.get("iss"), base);
    const code = location.searchParams.get("code")!;
    const tokens = await token({
      grant_type: "authorization_code",
      client_id: client.client_id,
      code,
      code_verifier: verifier,
      redirect_uri: "http://127.0.0.1:19999/callback",
    });
    return { client, verifier, code, tokens };
  }

  async function callTool(accessToken: string, name: string, args: Record<string, unknown> = {}) {
    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    const { StreamableHTTPClientTransport } =
      await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
    const client = new Client({ name: "test", version: "1.0.0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${accessToken}` } },
      })
    );
    try {
      return await client.callTool({ name, arguments: args });
    } finally {
      await client.close();
    }
  }

  const structured = (result: Awaited<ReturnType<typeof callTool>>) =>
    result.structuredContent as Record<string, any>;

  before(async () => {
    process.env["JWT_SECRET"] = "integration-test-secret";
    const express = (await import("express")).default;
    prisma = (await import("../src/lib/prisma.js")).prisma;
    oauth = await import("../src/mcp/oauth.service.js");
    const { createMcpRouter } = await import("../src/routes/mcp.routes.js");
    const { getMcpConfig } = await import("../src/mcp/config.js");
    const { hashPassword } = await import("../src/services/auth.service.js");

    const app = express();
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    app.use(createMcpRouter(getMcpConfig({ MCP_PUBLIC_URL: base, NODE_ENV: "test" })));

    const passwordHash = await hashPassword(password);
    for (const key of ["a", "b"] as const) {
      users[key].id = (
        await prisma.user.create({
          data: { email: users[key].email, name: `User ${key}`, passwordHash },
        })
      ).id;
    }
    const exercise = await prisma.exercise.create({
      data: { name: `Zzz Test Press ${suffix}`, muscleGroups: ["pectoraux"] },
    });
    exerciseId = exercise.id;

    const today = new Date(new Date().toISOString().slice(0, 10));
    const daysAgo = (n: number) => new Date(today.getTime() - n * 86_400_000);
    await prisma.measurement.createMany({
      data: [
        { userId: users.a.id, date: daysAgo(20), weight: 80, waist: 90 },
        { userId: users.a.id, date: daysAgo(2), weight: 78.5 },
      ],
    });
    const trackable = await prisma.trackableItem.create({
      data: {
        userId: users.a.id,
        name: "Yoga",
        icon: "flower",
        color: "#22C55E",
        trackingType: "boolean",
      },
    });
    await prisma.trackableGoal.create({
      data: { trackableId: trackable.id, targetValue: 1, frequency: "daily" },
    });
    await prisma.dailyEntry.createMany({
      data: [
        { trackableId: trackable.id, date: daysAgo(1), value: 1 },
        { trackableId: trackable.id, date: daysAgo(3), value: 0 },
      ],
    });
    await prisma.workout.create({
      data: {
        userId: users.a.id,
        name: "Push",
        items: {
          create: {
            type: "exercise",
            position: 1,
            restAfter: 60,
            exercises: {
              create: {
                exerciseId,
                position: 1,
                restBetweenSets: 90,
                sets: { create: [{ setNumber: 1, targetReps: 10, targetWeight: 50 }] },
              },
            },
          },
        },
      },
    });

    const now = Date.now();
    for (const key of ["a", "b"] as const) {
      const count = key === "a" ? 3 : 1;
      for (let i = 0; i < count; i++) {
        const startedAt = new Date(now - i * 86_400_000);
        const created = await prisma.workoutSession.create({
          data: {
            userId: users[key].id,
            status: "completed",
            type: "ad_hoc",
            startedAt,
            completedAt: new Date(startedAt.getTime() + 45 * 60_000),
            exercises: {
              create: {
                exerciseId,
                position: 1,
                status: "completed",
                sets: {
                  create: [
                    {
                      setNumber: 1,
                      targetReps: 10,
                      targetWeight: 100,
                      actualReps: 8,
                      actualWeight: 50,
                    },
                    {
                      setNumber: 2,
                      targetReps: 10,
                      targetWeight: 100,
                      actualReps: null,
                      actualWeight: null,
                    },
                  ],
                },
              },
            },
          },
        });
        sessionIds[key] = created.id;
      }
    }
  });

  after(async () => {
    if (!prisma) return;
    const ids = [users.a.id, users.b.id].filter(Boolean);
    await prisma.workoutSession.deleteMany({ where: { userId: { in: ids } } });
    await prisma.workout.deleteMany({ where: { userId: { in: ids } } });
    await prisma.measurement.deleteMany({ where: { userId: { in: ids } } });
    await prisma.trackableItem.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.exercise.deleteMany({ where: { id: exerciseId } });
    await prisma.mcpClient.deleteMany({ where: { name: "Test <b>Client</b>" } });
    await prisma.$disconnect();
    await new Promise((resolve) => server?.close(resolve));
  });

  it("challenges unauthenticated requests and publishes discovery metadata", async () => {
    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    assert.equal(res.status, 401);
    assert.ok(
      res.headers
        .get("www-authenticate")!
        .includes(`resource_metadata="${base}/.well-known/oauth-protected-resource/mcp"`)
    );

    const resource = await (await fetch(`${base}/.well-known/oauth-protected-resource/mcp`)).json();
    assert.equal(resource.resource, `${base}/mcp`);
    assert.deepEqual(resource.authorization_servers, [base]);
    const meta = await (await fetch(`${base}/.well-known/oauth-authorization-server`)).json();
    assert.deepEqual(meta.code_challenge_methods_supported, ["S256"]);
    assert.equal(meta.registration_endpoint, `${base}/oauth/register`);
  });

  it("rejects unsafe redirect URIs at registration and unknown clients at authorization", async () => {
    const bad = await fetch(`${base}/oauth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redirect_uris: ["http://evil.example/cb"] }),
    });
    assert.equal(bad.status, 400);
    assert.equal((await bad.json()).error, "invalid_redirect_uri");

    const page = await fetch(
      `${base}/oauth/authorize?response_type=code&client_id=nope&redirect_uri=http://127.0.0.1:1/cb`
    );
    assert.equal(page.status, 400);
  });

  it("denies access on wrong password, wrong resource and missing PKCE", async () => {
    const client = await register();
    const { challenge } = pkce();
    const wrong = await authorize(client.client_id, challenge, "a", "wrong-password");
    assert.equal(wrong.status, 401);
    assert.equal(wrong.headers.get("location"), null);

    const noPkce = await fetch(
      `${base}/oauth/authorize?${new URLSearchParams({
        response_type: "code",
        client_id: client.client_id,
        redirect_uri: "http://127.0.0.1:19999/callback",
      })}`,
      { redirect: "manual" }
    );
    assert.equal(noPkce.status, 302);
    assert.equal(
      new URL(noPkce.headers.get("location")!).searchParams.get("error"),
      "invalid_request"
    );

    const badResource = await fetch(
      `${base}/oauth/authorize?${new URLSearchParams({
        response_type: "code",
        client_id: client.client_id,
        redirect_uri: "http://127.0.0.1:19999/callback",
        code_challenge: challenge,
        code_challenge_method: "S256",
        resource: "https://other.example/mcp",
      })}`,
      { redirect: "manual" }
    );
    assert.equal(
      new URL(badResource.headers.get("location")!).searchParams.get("error"),
      "invalid_target"
    );
  });

  it("supports cancelling the authorization", async () => {
    const client = await register();
    const { challenge } = pkce();
    const query = new URLSearchParams({
      response_type: "code",
      client_id: client.client_id,
      redirect_uri: "http://127.0.0.1:19999/callback",
      code_challenge: challenge,
      code_challenge_method: "S256",
      state: "s",
    });
    const html = await (await fetch(`${base}/oauth/authorize?${query}`)).text();
    const ticket = /name="ticket" value="([^"]+)"/.exec(html)![1]!;
    const res = await fetch(`${base}/oauth/authorize`, {
      method: "POST",
      redirect: "manual",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ticket, action: "deny" }),
    });
    const location = new URL(res.headers.get("location")!);
    assert.equal(location.searchParams.get("error"), "access_denied");
    assert.equal(location.searchParams.get("code"), null);
  });

  it("completes the OAuth flow and serves only the authenticated user's data", async () => {
    const a = await fullFlow("a");
    assert.equal(a.tokens.status, 200);
    assert.equal(a.tokens.body["scope"], "momentum:read");
    const b = await fullFlow("b");

    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    const { StreamableHTTPClientTransport } =
      await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
    const client = new Client({ name: "test", version: "1.0.0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${a.tokens.body["access_token"]}` } },
      })
    );
    const tools = (await client.listTools()).tools;
    await client.close();
    const names = tools.map((tool) => tool.name);
    for (const expected of [
      "get_stats_summary",
      "list_sessions",
      "get_exercise_history",
      "get_favorite_exercises",
    ]) {
      assert.ok(names.includes(expected), expected);
    }
    assert.ok(tools.every((tool) => tool.annotations?.readOnlyHint === true));

    const summaryA = structured(
      await callTool(a.tokens.body["access_token"]!, "get_stats_summary", { period: "last_7_days" })
    );
    const summaryB = structured(
      await callTool(b.tokens.body["access_token"]!, "get_stats_summary", { period: "last_7_days" })
    );
    assert.equal(summaryA["sessions"].completed, 3);
    assert.equal(summaryB["sessions"].completed, 1);
    assert.equal(summaryA["totals"].sets, 3);
    assert.equal(summaryA["totals"].volumeKg, 1200);

    const history = structured(
      await callTool(a.tokens.body["access_token"]!, "get_exercise_history", {
        exercise: "zzz test press",
      })
    );
    assert.equal(history["status"], "ok");
    assert.equal(history["sessionsCount"], 3);
    assert.equal(history["history"][0].target.sets, 2);
    assert.equal(history["history"][0].target.volumeKg, 2000);
    assert.equal(history["history"][0].target.setsMetTarget, 0);
    assert.equal(summaryA["targets"].plannedSets, 6);

    const detailed = structured(
      await callTool(a.tokens.body["access_token"]!, "get_exercise_history", {
        exercise: "zzz test press",
        includeSets: true,
      })
    );
    assert.deepEqual(detailed["history"][0].setsDetail[0], {
      setNumber: 1,
      reps: 8,
      weightKg: 50,
      targetReps: 10,
      targetWeightKg: 100,
    });

    const own = await callTool(a.tokens.body["access_token"]!, "get_session", {
      sessionId: sessionIds.a,
    });
    assert.notEqual(own.isError, true);
    const foreign = await callTool(a.tokens.body["access_token"]!, "get_session", {
      sessionId: sessionIds.b,
    });
    assert.equal(foreign.isError, true);
    const listed = structured(
      await callTool(b.tokens.body["access_token"]!, "list_sessions", { limit: 50 })
    );
    assert.equal(listed["total"], 1);
    assert.ok(!JSON.stringify(listed).includes(sessionIds.a));
  });

  it("answers every tool with valid defaults and exposes only read-only tools", async () => {
    const created = await oauth.createPersonalToken(users.a.id, {
      label: "smoke",
      expiresInDays: 30,
    });
    const calls: Array<[string, Record<string, unknown>]> = [
      ["get_stats_summary", {}],
      ["get_stats_summary", { period: "all_time" }],
      ["get_activity_timeseries", {}],
      ["get_activity_timeseries", { period: "all_time", granularity: "month" }],
      ["list_sessions", {}],
      ["list_sessions", { exercise: "press", status: "completed", period: "last_30_days" }],
      ["search_exercises", { query: "test PRESS" }],
      ["search_exercises", { practicedOnly: true }],
      ["get_exercise_history", { exercise: "Zzz Test Press", includeSets: true }],
      ["get_favorite_exercises", { metric: "volume" }],
      ["get_personal_records", {}],
      ["get_muscle_group_breakdown", {}],
      ["list_workouts", {}],
      ["get_body_measurements", {}],
      ["get_daily_tracking", { trackable: "yoga" }],
      ["get_profile", {}],
    ];
    for (const [name, args] of calls) {
      const result = await callTool(created.token, name, args);
      assert.notEqual(
        result.isError,
        true,
        `${name} ${JSON.stringify(args)}: ${JSON.stringify(result.content)}`
      );
    }

    const measurements = structured(
      await callTool(created.token, "get_body_measurements", { period: "last_90_days" })
    );
    assert.equal(measurements["count"], 2);
    assert.equal(measurements["changes"].weight.delta, -1.5);
    assert.equal(measurements["latest"].waist, null);

    const tracking = structured(
      await callTool(created.token, "get_daily_tracking", { period: "last_30_days" })
    );
    assert.equal(tracking["trackables"][0].daysLogged, 2);
    assert.equal(tracking["trackables"][0].daysGoalMet, 1);

    const workouts = structured(await callTool(created.token, "list_workouts"));
    assert.equal(workouts["workouts"][0].name, "Push");

    const ambiguous = structured(
      await callTool(created.token, "get_exercise_history", { exercise: "no such exercise xyz" })
    );
    assert.equal(ambiguous["status"], "not_found");

    const bad = await callTool(created.token, "get_stats_summary", {
      period: "this_month",
      from: "2026-13-01",
    });
    assert.equal(bad.isError, true);

    const otherUserTracking = await callTool(
      (await oauth.createPersonalToken(users.b.id, { label: "b", expiresInDays: 30 })).token,
      "get_daily_tracking",
      {}
    );
    assert.deepEqual(structured(otherUserTracking)["trackables"], []);
  });

  it("rejects replayed authorization codes and revokes the resulting grant", async () => {
    const flow = await fullFlow("a");
    const access = flow.tokens.body["access_token"]!;
    assert.notEqual((await callTool(access, "get_profile")).isError, true);

    const replay = await token({
      grant_type: "authorization_code",
      client_id: flow.client.client_id,
      code: flow.code,
      code_verifier: flow.verifier,
      redirect_uri: "http://127.0.0.1:19999/callback",
    });
    assert.equal(replay.status, 400);
    assert.equal(replay.body["error"], "invalid_grant");

    const after = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${access}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    assert.equal(after.status, 401);
  });

  it("rejects a wrong PKCE verifier", async () => {
    const client = await register();
    const { challenge } = pkce();
    const res = await authorize(client.client_id, challenge, "a");
    const code = new URL(res.headers.get("location")!).searchParams.get("code")!;
    const result = await token({
      grant_type: "authorization_code",
      client_id: client.client_id,
      code,
      code_verifier: pkce().verifier,
      redirect_uri: "http://127.0.0.1:19999/callback",
    });
    assert.equal(result.body["error"], "invalid_grant");
  });

  it("rotates refresh tokens, detects reuse and never accepts refresh tokens as bearer", async () => {
    const flow = await fullFlow("a");
    const refresh = flow.tokens.body["refresh_token"]!;

    const asBearer = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${refresh}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    assert.equal(asBearer.status, 401);

    const rotated = await token({
      grant_type: "refresh_token",
      client_id: flow.client.client_id,
      refresh_token: refresh,
    });
    assert.equal(rotated.status, 200);
    assert.notEqual(rotated.body["refresh_token"], refresh);
    assert.notEqual((await callTool(rotated.body["access_token"]!, "get_profile")).isError, true);

    const reuse = await token({
      grant_type: "refresh_token",
      client_id: flow.client.client_id,
      refresh_token: refresh,
    });
    assert.equal(reuse.body["error"], "invalid_grant");
    const revoked = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${rotated.body["access_token"]}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    assert.equal(revoked.status, 401);
  });

  it("supports revocation through the OAuth endpoint", async () => {
    const flow = await fullFlow("b");
    await fetch(`${base}/oauth/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        token: flow.tokens.body["refresh_token"]!,
        client_id: flow.client.client_id,
      }),
    });
    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${flow.tokens.body["access_token"]}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    assert.equal(res.status, 401);
  });

  it("personal access tokens work, are listed without secrets, and revoke immediately", async () => {
    const created = await oauth.createPersonalToken(users.a.id, {
      label: "Claude Code",
      expiresInDays: 30,
    });
    assert.ok(created.token.startsWith("mpt_"));
    const stored = await prisma.mcpToken.findMany({
      where: { connection: { userId: users.a.id }, kind: "personal" },
    });
    assert.ok(stored.every((row) => row.tokenHash !== created.token));

    const summary = structured(
      await callTool(created.token, "get_stats_summary", { period: "last_7_days", compare: false })
    );
    assert.equal(summary["sessions"].completed, 3);

    const listed = await oauth.listConnections(users.a.id);
    const entry = listed.find((connection) => connection.id === created.id)!;
    assert.equal(entry.label, "Claude Code");
    assert.ok(!JSON.stringify(listed).includes(created.token));

    assert.equal(await oauth.revokeConnection(users.b.id, created.id), false);
    assert.equal(await oauth.revokeConnection(users.a.id, created.id), true);
    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${created.token}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    assert.equal(res.status, 401);
  });

  it("rejects expired tokens and tokens issued to a missing connection", async () => {
    const created = await oauth.createPersonalToken(users.a.id, {
      label: "short",
      expiresInDays: 30,
    });
    await prisma.mcpToken.updateMany({
      where: { connectionId: created.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    assert.equal(await oauth.authenticateBearer(created.token), null);
    assert.equal(await oauth.authenticateBearer(`mpt_${randomUUID()}`), null);
  });
});
