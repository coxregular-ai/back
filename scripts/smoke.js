import app from "../src/server.js";
import { readStore, writeStore } from "../src/store.js";

const server = app.listen(0);
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const originalStore = await readStore();

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${path} failed ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

try {
  await request("/health");
  const login = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "cox.regular@gmail.com", password: "Scoore@2026" })
  });
  const auth = { authorization: `Bearer ${login.accessToken}` };
  await request("/panel/demo-profile", { headers: auth });
  await request("/admin/profiles/demo-profile", {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify({ fullName: "JOAO DA SILVA MVP" })
  });
  const debt = await request("/admin/profiles/demo-profile/debts", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ title: "Smoke debt", amount: "R$ 10,00" })
  });
  await request(`/admin/debts/${debt.id}`, {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify({ status: "Conferida" })
  });
  await request(`/admin/debts/${debt.id}/resolve`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ reason: "Quitacao", credentials: { login: "a", pin: "1", password: "b" } })
  });
  const snapshot = await request("/admin/profiles/demo-profile/snapshots", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ name: "Smoke snapshot" })
  });
  const snapshots = await request("/admin/profiles/demo-profile/snapshots", { headers: auth });
  if (!snapshots.some((item) => item.id === snapshot.id)) {
    throw new Error("snapshot not listed");
  }
  await request(`/admin/profiles/demo-profile/snapshots/${snapshot.id}/load`, {
    method: "POST",
    headers: auth
  });
  await request(`/admin/profiles/demo-profile/snapshots/${snapshot.id}`, {
    method: "DELETE",
    headers: auth
  });
  const simulation = await request("/admin/profiles/demo-profile/simulate-removal", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ login: "admin", password: "demo" })
  });
  if (simulation.message !== "registro excluido com sucesso") {
    throw new Error("unexpected simulation message");
  }
  console.log("smoke ok");
} finally {
  await writeStore(originalStore);
  server.close();
}
