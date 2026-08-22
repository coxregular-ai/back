import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { defaultStore } from "./defaultData.js";
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
  await ensureStore();
  const content = await fs.readFile(storePath, "utf8");
  const store = JSON.parse(content.replace(/^\uFEFF/, ""));
  const settings = isSupabaseDataEnabled ? await readSettingsFromSupabase(store.settings) : store.settings;
  return {
    ...defaultStore,
    ...store,
    contacts: { ...defaultStore.contacts, ...(store.contacts || {}), address: { ...defaultStore.contacts.address, ...(store.contacts?.address || {}) } },
    indicators: { ...defaultStore.indicators, ...(store.indicators || {}) },
    credits: { ...defaultStore.credits, ...(store.credits || {}) },
    settings: { ...defaultStore.settings, ...(settings || {}) },
    debts: Array.isArray(store.debts) ? store.debts : []
  };
}

export async function writeStore(nextStore) {
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
  store.indicators = { ...store.indicators, ...patch };
  return writeStore(store);
}

export async function addDebt(payload) {
  const store = await readStore();
  const debt = {
    id: randomUUID(),
    title: payload.title || "Divida sem titulo",
    amount: payload.amount || "R$ 0,00",
    creditor: payload.creditor || "Credor nao informado",
    dueDate: payload.dueDate || "",
    status: payload.status || "Aberta",
    details: payload.details || ""
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
  if (isSupabaseDataEnabled) {
    return updateSettingsInSupabase(payload);
  }
  const store = await readStore();
  store.settings = { ...store.settings, ...payload };
  return writeStore(store);
}

async function readSettingsFromSupabase(fallback) {
  const { data, error } = await supabaseData
    .from("platform_settings")
    .select("platform_name, logo_url")
    .eq("singleton", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return fallback;
  return {
    platformName: data.platform_name || fallback?.platformName,
    logoUrl: data.logo_url || ""
  };
}

async function updateSettingsInSupabase(payload) {
  const current = await readSettingsFromSupabase(defaultStore.settings);
  const next = { ...current, ...payload };
  const { data, error } = await supabaseData
    .from("platform_settings")
    .upsert({
      singleton: true,
      platform_name: next.platformName || "Scoore Admin",
      logo_url: next.logoUrl || null
    }, { onConflict: "singleton" })
    .select("platform_name, logo_url")
    .single();
  if (error) throw error;
  return {
    settings: {
      platformName: data.platform_name || "Scoore Admin",
      logoUrl: data.logo_url || ""
    }
  };
}
