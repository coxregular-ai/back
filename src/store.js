import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { composeAddress, defaultStore } from "./defaultData.js";
import { isSupabaseDataEnabled, supabaseData } from "./supabase.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const storePath = path.join(dataDir, "store.json");

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(storePath);
  } catch {
    await fs.writeFile(storePath, JSON.stringify(defaultStore, null, 2));
  }
}

export async function readStore() {
  if (isSupabaseDataEnabled) {
    return readStoreFromSupabase();
  }
  await ensureStore();
  const content = await fs.readFile(storePath, "utf8");
  const store = JSON.parse(content.replace(/^\uFEFF/, ""));
  return normalizeStore(store);
}

function normalizeStore(store) {
  const indicatorSource = { ...defaultStore.indicators, ...(store.indicators || {}) };
  const normalizedScore = Number(indicatorSource.score);
  return {
    ...defaultStore,
    ...store,
    profile: { ...defaultStore.profile, ...(store.profile || {}) },
    contacts: { ...defaultStore.contacts, ...(store.contacts || {}), address: normalizeAddress(store.contacts?.address) },
    indicators: {
      ...indicatorSource,
      score: Number.isFinite(normalizedScore) ? Math.max(0, Math.min(1000, normalizedScore)) : defaultStore.indicators.score,
      scoreMax: 1000
    },
    credits: { ...defaultStore.credits, ...(store.credits || {}) },
    settings: { ...defaultStore.settings, ...(store.settings || {}) },
    debts: Array.isArray(store.debts) ? store.debts : [],
    snapshots: Array.isArray(store.snapshots) ? store.snapshots : []
  };
}

function normalizeAddress(address) {
  const merged = { ...defaultStore.contacts.address, ...(address || {}) };
  // enderecos gravados antes do campo unico continuam funcionando
  if (typeof merged.fullText !== "string") {
    merged.fullText = composeAddress(merged);
  }
  return merged;
}

export async function writeStore(nextStore) {
  if (isSupabaseDataEnabled) {
    return writeStoreToSupabase(nextStore);
  }
  await ensureStore();
  await fs.writeFile(storePath, JSON.stringify(nextStore, null, 2));
  return nextStore;
}

export async function updateProfile(patch) {
  const store = await readStore();
  store.profile = { ...store.profile, ...patch };
  return writeStore(store);
}

export async function updateContacts(patch) {
  const store = await readStore();
  store.contacts = {
    ...store.contacts,
    ...patch,
    address: { ...store.contacts.address, ...(patch.address || {}) }
  };
  return writeStore(store);
}

export async function updateIndicators(patch) {
  const store = await readStore();
  const nextScore = Number(patch.score ?? store.indicators.score);
  store.indicators = {
    ...store.indicators,
    ...patch,
    score: Number.isFinite(nextScore) ? Math.max(0, Math.min(1000, nextScore)) : store.indicators.score,
    scoreMax: 1000
  };
  return writeStore(store);
}

export async function addDebt(payload) {
  const store = await readStore();
  const content = String(payload.content || payload.details || payload.title || "").trim();
  const title = content || payload.title || "Divida sem titulo";
  const debt = {
    id: randomUUID(),
    title,
    content,
    category: payload.category || "DÍVIDAS",
    amount: payload.amount || "",
    creditor: payload.creditor || "",
    dueDate: payload.dueDate || "",
    status: payload.status || "Aberta",
    details: content
  };
  store.debts = [debt, ...store.debts];
  await writeStore(store);
  return debt;
}

export async function updateDebt(debtId, patch) {
  const store = await readStore();
  const index = store.debts.findIndex((debt) => debt.id === debtId);
  if (index < 0) return null;
  store.debts[index] = { ...store.debts[index], ...patch, id: debtId };
  await writeStore(store);
  return store.debts[index];
}

export async function resolveDebt(debtId, payload) {
  const store = await readStore();
  const index = store.debts.findIndex((debt) => debt.id === debtId);
  if (index < 0) return null;
  const reason = payload.reason || "Quitacao";
  const status = reason === "Quitacao" ? "Quitada" : "Removida";
  store.debts[index] = {
    ...store.debts[index],
    status,
    resolutionReason: reason,
    resolvedAt: new Date().toISOString(),
    credentialAudit: payload.credentials ? "credential-flow-confirmed" : "not-required"
  };
  await writeStore(store);
  return store.debts[index];
}

export async function updateCredits(payload) {
  const store = await readStore();
  store.credits = {
    ...store.credits,
    ...payload,
    items: Array.isArray(payload.items) ? payload.items : store.credits.items
  };
  return writeStore(store);
}

export async function updateSettings(payload) {
  const store = await readStore();
  store.settings = { ...store.settings, ...payload };
  return writeStore(store);
}

function snapshotSummary(snapshot) {
  return {
    id: snapshot.id,
    name: snapshot.name,
    createdAt: snapshot.createdAt
  };
}

function statePayloadForSnapshot(store) {
  const normalized = normalizeStore(store);
  const { snapshots, ...payload } = normalized;
  return payload;
}

export async function listSnapshots() {
  if (isSupabaseDataEnabled) {
    return listSnapshotsFromSupabase();
  }
  const store = await readStore();
  return (store.snapshots || []).map(snapshotSummary);
}

export async function createSnapshot(payload = {}) {
  if (isSupabaseDataEnabled) {
    return createSnapshotInSupabase(payload);
  }
  const store = await readStore();
  const name = String(payload.name || "").trim();
  if (!name) {
    const error = new Error("nome_obrigatorio");
    error.statusCode = 400;
    throw error;
  }
  const snapshot = {
    id: randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    payload: statePayloadForSnapshot(store)
  };
  store.snapshots = [snapshot, ...(store.snapshots || [])];
  await writeStore(store);
  return snapshotSummary(snapshot);
}

export async function loadSnapshot(snapshotId) {
  if (isSupabaseDataEnabled) {
    return loadSnapshotFromSupabase(snapshotId);
  }
  const store = await readStore();
  const snapshots = store.snapshots || [];
  const snapshot = snapshots.find((item) => item.id === snapshotId);
  if (!snapshot) return null;
  const restoredStore = normalizeStore({
    ...snapshot.payload,
    snapshots
  });
  await writeStore(restoredStore);
  return restoredStore;
}

export async function deleteSnapshot(snapshotId) {
  if (isSupabaseDataEnabled) {
    return deleteSnapshotFromSupabase(snapshotId);
  }
  const store = await readStore();
  const snapshots = store.snapshots || [];
  const nextSnapshots = snapshots.filter((item) => item.id !== snapshotId);
  if (nextSnapshots.length === snapshots.length) return null;
  store.snapshots = nextSnapshots;
  await writeStore(store);
  return { id: snapshotId };
}

async function readStoreFromSupabase() {
  const { data, error } = await supabaseData
    .from("app_state")
    .select("payload")
    .eq("singleton", true)
    .maybeSingle();
  if (error) throw error;
  if (data?.payload) return normalizeStore(data.payload);
  return writeStoreToSupabase(defaultStore);
}

async function writeStoreToSupabase(nextStore) {
  const payload = statePayloadForSnapshot(nextStore);
  const { data, error } = await supabaseData
    .from("app_state")
    .upsert({
      singleton: true,
      payload,
      updated_at: new Date().toISOString()
    }, { onConflict: "singleton" })
    .select("payload")
    .single();
  if (error) throw error;
  return normalizeStore(data.payload);
}

async function listSnapshotsFromSupabase() {
  const { data, error } = await supabaseData
    .from("app_state_versions")
    .select("id,name,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((snapshot) => ({
    id: snapshot.id,
    name: snapshot.name,
    createdAt: snapshot.created_at
  }));
}

async function createSnapshotInSupabase(payload = {}) {
  const store = await readStore();
  const name = String(payload.name || "").trim();
  if (!name) {
    const error = new Error("nome_obrigatorio");
    error.statusCode = 400;
    throw error;
  }
  const { data, error } = await supabaseData
    .from("app_state_versions")
    .insert({
      profile_id: payload.profileId || "demo-profile",
      name,
      payload: statePayloadForSnapshot(store)
    })
    .select("id,name,created_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    createdAt: data.created_at
  };
}

async function loadSnapshotFromSupabase(snapshotId) {
  const { data, error } = await supabaseData
    .from("app_state_versions")
    .select("payload")
    .eq("id", snapshotId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.payload) return null;
  return writeStoreToSupabase(data.payload);
}

async function deleteSnapshotFromSupabase(snapshotId) {
  const { data, error } = await supabaseData
    .from("app_state_versions")
    .delete()
    .eq("id", snapshotId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.id } : null;
}
