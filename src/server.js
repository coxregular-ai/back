import "dotenv/config";
import express from "express";
import cors from "cors";
import { isSupabaseAuthEnabled, supabaseAuth } from "./supabase.js";
import {
  addDebt,
  readStore,
  updateContacts,
  updateCredits,
  updateDebt,
  updateIndicators,
  updateProfile,
  resolveDebt,
  updateSettings
} from "./store.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
const demoEmail = process.env.DEMO_ADMIN_EMAIL || "cox.regular@gmail.com";
const demoPassword = process.env.DEMO_ADMIN_PASSWORD || "Scoore@2026";
const adminEmail = process.env.ADMIN_EMAIL || demoEmail;

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "4mb" }));

async function authRequired(req, res, next) {
  const auth = req.header("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) {
    return res.status(401).json({ error: "unauthorized" });
  }
  if (!isSupabaseAuthEnabled && token === "scoore-demo-token") {
    req.user = { id: "admin-demo", email: demoEmail, role: "admin" };
    return next();
  }
  if (!isSupabaseAuthEnabled) return res.status(401).json({ error: "unauthorized" });
  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: "unauthorized" });
  req.user = {
    id: data.user.id,
    email: data.user.email,
    role: data.user.app_metadata?.role || data.user.user_metadata?.role || "admin"
  };
  return next();
}

function adminRequired(req, res, next) {
  return authRequired(req, res, () => {
    if (req.user?.email !== adminEmail && req.user?.role !== "admin") {
      return res.status(403).json({ error: "forbidden" });
    }
    return next();
  });
}

app.get("/health", (req, res) => {
  res.json({ ok: true, app: "scoore-back" });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (isSupabaseAuthEnabled) {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) return res.status(401).json({ error: "login_invalido" });
    if (data.user.email !== adminEmail && data.user.app_metadata?.role !== "admin" && data.user.user_metadata?.role !== "admin") {
      return res.status(403).json({ error: "forbidden" });
    }
    return res.json({
      accessToken: data.session.access_token,
      user: { id: data.user.id, email: data.user.email, role: data.user.app_metadata?.role || data.user.user_metadata?.role || "admin" }
    });
  }
  if (email === demoEmail && password === demoPassword) {
    return res.json({
      accessToken: "scoore-demo-token",
      user: { id: "admin-demo", email, role: "admin" }
    });
  }
  return res.status(401).json({ error: "login_invalido" });
});

app.get("/panel/:profileId", authRequired, async (req, res, next) => {
  try {
    const store = await readStore();
    const activeDebts = store.debts.filter((debt) => !["Quitada", "Removida", "Excluida"].includes(debt.status));
    res.json({ ...store, debts: activeDebts, profile: { ...store.profile, id: req.params.profileId } });
  } catch (error) {
    next(error);
  }
});

app.patch("/admin/profiles/:profileId", adminRequired, async (req, res, next) => {
  try {
    const store = await updateProfile(req.body || {});
    res.json(store.profile);
  } catch (error) {
    next(error);
  }
});

app.patch("/admin/profiles/:profileId/contacts", adminRequired, async (req, res, next) => {
  try {
    const store = await updateContacts(req.body || {});
    res.json(store.contacts);
  } catch (error) {
    next(error);
  }
});

app.patch("/admin/profiles/:profileId/indicators", adminRequired, async (req, res, next) => {
  try {
    const store = await updateIndicators(req.body || {});
    res.json(store.indicators);
  } catch (error) {
    next(error);
  }
});

app.get("/admin/profiles/:profileId/debts", adminRequired, async (req, res, next) => {
  try {
    const store = await readStore();
    res.json(store.debts);
  } catch (error) {
    next(error);
  }
});

app.post("/admin/profiles/:profileId/debts", adminRequired, async (req, res, next) => {
  try {
    const debt = await addDebt(req.body || {});
    res.status(201).json(debt);
  } catch (error) {
    next(error);
  }
});

app.patch("/admin/debts/:debtId", adminRequired, async (req, res, next) => {
  try {
    const debt = await updateDebt(req.params.debtId, req.body || {});
    if (!debt) return res.status(404).json({ error: "divida_nao_encontrada" });
    return res.json(debt);
  } catch (error) {
    next(error);
  }
});

app.post("/admin/debts/:debtId/resolve", adminRequired, async (req, res, next) => {
  try {
    const credentials = req.body?.credentials;
    if (!credentials || !("login" in credentials) || !("pin" in credentials) || !("password" in credentials)) {
      return res.status(400).json({ error: "credenciais_obrigatorias" });
    }
    const debt = await resolveDebt(req.params.debtId, req.body || {});
    if (!debt) return res.status(404).json({ error: "divida_nao_encontrada" });
    return res.json(debt);
  } catch (error) {
    next(error);
  }
});

app.patch("/admin/profiles/:profileId/credits", adminRequired, async (req, res, next) => {
  try {
    const store = await updateCredits(req.body || {});
    res.json(store.credits);
  } catch (error) {
    next(error);
  }
});

app.patch("/admin/profiles/:profileId/settings", adminRequired, async (req, res, next) => {
  try {
    const store = await updateSettings(req.body || {});
    res.json(store.settings);
  } catch (error) {
    next(error);
  }
});

app.post("/admin/profiles/:profileId/simulate-removal", adminRequired, (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) {
    return res.status(400).json({ error: "login_e_senha_obrigatorios" });
  }
  return res.json({ message: "registro excluido com sucesso" });
});

app.use((error, req, res, next) => {
  console.error("api_error", { message: error.message, path: req.path });
  res.status(500).json({ error: "erro_interno" });
});

const isSmokeTest = process.argv[1]?.endsWith("smoke.js");

if (process.env.VERCEL !== "1" && !isSmokeTest) {
  app.listen(port, () => {
    console.log(`scoore-back listening on http://localhost:${port}`);
  });
}

export default app;
