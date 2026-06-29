import { Router, type IRouter } from "express";
import { eq, desc, and, or, ilike } from "drizzle-orm";
import { db, licensesTable } from "@workspace/db";
import {
  ListLicensesQueryParams,
  GenerateLicenseBody,
  ValidateLicenseBody,
  GetLicenseParams,
  UpdateLicenseParams,
  UpdateLicenseBody,
  DeleteLicenseParams,
  RevokeLicenseParams,
  RenewLicenseParams,
} from "@workspace/api-zod";
import {
  generateLicenseKey,
  computeExpiryDate,
  isLicenseExpired,
  daysRemaining,
} from "../lib/licenseKey";

const router: IRouter = Router();

// ── Liste des licences ────────────────────────────────────────────────────────
router.get("/licenses", async (req, res): Promise<void> => {
  try {
    const query = ListLicensesQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }

    const { product, licenseType, status, search } = query.data;
    const conditions = [];

    if (product) conditions.push(eq(licensesTable.product, product));
    if (licenseType) conditions.push(eq(licensesTable.licenseType, licenseType));
    if (status === "active") conditions.push(eq(licensesTable.isActive, true));
    if (status === "revoked") conditions.push(eq(licensesTable.isActive, false));
    if (search) {
      conditions.push(
        or(
          ilike(licensesTable.licenseKey, `%${search}%`),
          ilike(licensesTable.machineId, `%${search}%`),
          ilike(licensesTable.clientName, `%${search}%`)
        )
      );
    }

    const licenses = await db
      .select()
      .from(licensesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(licensesTable.createdAt));

    res.json(licenses);
  } catch (err) {
    console.error("GET /licenses error:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ── Générer une licence ───────────────────────────────────────────────────────
router.post("/licenses", async (req, res): Promise<void> => {
  try {
    const parsed = GenerateLicenseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { machineId, product, licenseType, durationDays, clientName, notes } = parsed.data;

    const validProducts = ["recorder", "cash_sheeter", "inventory", "suite"];
    const validTypes = ["trial", "subscription", "perpetual"];

    if (!validProducts.includes(product)) {
      res.status(400).json({ error: `Produit invalide : ${product}` });
      return;
    }
    if (!validTypes.includes(licenseType)) {
      res.status(400).json({ error: `Type de licence invalide : ${licenseType}` });
      return;
    }

    const expiresAt = computeExpiryDate(licenseType, durationDays);
    const licenseKey = generateLicenseKey(machineId, product, licenseType, expiresAt);

    const [license] = await db
      .insert(licensesTable)
      .values({
        licenseKey,
        machineId,
        product,
        licenseType,
        isActive: true,
        expiresAt,
        clientName: clientName ?? null,
        notes: notes ?? null,
      })
      .returning();

    res.status(201).json(license);
  } catch (err) {
    console.error("POST /licenses error:", err);
    res.status(500).json({ error: "Erreur lors de la génération de la licence." });
  }
});

// ── Valider une licence ───────────────────────────────────────────────────────
router.post("/licenses/validate", async (req, res): Promise<void> => {
  try {
    const parsed = ValidateLicenseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { licenseKey, machineId, product } = parsed.data;

    const [license] = await db
      .select()
      .from(licensesTable)
      .where(eq(licensesTable.licenseKey, licenseKey));

    // Clé inexistante
    if (!license) {
      res.json({ valid: false, message: "Clé de licence invalide.", licenseType: null, expiresAt: null, daysRemaining: null });
      return;
    }

    // Machine non autorisée
    if (license.machineId !== machineId) {
      res.json({ valid: false, message: "Cette licence n'est pas assignée à cette machine.", licenseType: null, expiresAt: null, daysRemaining: null });
      return;
    }

    // Vérification produit :
    // Une licence "suite" est valide pour tous les produits DMH.
    // Une licence produit spécifique n'est valide que pour ce produit.
    const produitAutorise = license.product === product || license.product === "suite";
    if (!produitAutorise) {
      res.json({ valid: false, message: "Cette licence n'est pas valide pour ce produit.", licenseType: null, expiresAt: null, daysRemaining: null });
      return;
    }

    // Licence révoquée
    if (!license.isActive) {
      res.json({
        valid: false,
        message: "Cette licence a été révoquée.",
        licenseType: license.licenseType,
        expiresAt: license.expiresAt?.toISOString() ?? null,
        daysRemaining: null,
      });
      return;
    }

    // Licence expirée
    if (isLicenseExpired(license.expiresAt)) {
      res.json({
        valid: false,
        message: license.licenseType === "subscription"
          ? "Votre abonnement a expiré. Veuillez renouveler."
          : "Votre période d'essai a expiré.",
        licenseType: license.licenseType,
        expiresAt: license.expiresAt?.toISOString() ?? null,
        daysRemaining: 0,
      });
      return;
    }

    // ✓ Licence valide
    const remaining = daysRemaining(license.expiresAt);
    res.json({
      valid: true,
      message: license.licenseType === "perpetual"
        ? "Licence perpétuelle valide."
        : `Licence valide. ${remaining} jour(s) restant(s).`,
      licenseType: license.licenseType,
      expiresAt: license.expiresAt?.toISOString() ?? null,
      daysRemaining: remaining,
    });
  } catch (err) {
    console.error("POST /licenses/validate error:", err);
    res.status(500).json({ error: "Erreur lors de la validation." });
  }
});

// ── Statistiques ──────────────────────────────────────────────────────────────
router.get("/licenses/stats", async (_req, res): Promise<void> => {
  try {
    const allLicenses = await db.select().from(licensesTable);
    const now = new Date();

    const total = allLicenses.length;
    const active = allLicenses.filter((l) => l.isActive && (!l.expiresAt || l.expiresAt > now)).length;
    const revoked = allLicenses.filter((l) => !l.isActive).length;
    const expired = allLicenses.filter((l) => l.isActive && l.expiresAt && l.expiresAt <= now).length;
    const trial = allLicenses.filter((l) => l.licenseType === "trial").length;
    const subscription = allLicenses.filter((l) => l.licenseType === "subscription").length;
    const perpetual = allLicenses.filter((l) => l.licenseType === "perpetual").length;

    const productCounts: Record<string, number> = {};
    for (const l of allLicenses) {
      productCounts[l.product] = (productCounts[l.product] ?? 0) + 1;
    }
    const byProduct = Object.entries(productCounts).map(([product, count]) => ({ product, count }));

    const recentLicenses = [...allLicenses]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    res.json({ total, active, revoked, expired, trial, subscription, perpetual, byProduct, recentLicenses });
  } catch (err: any) {
    console.error("STATS ERROR:", err);
    res.status(500).json({ error: String(err), cause: String(err?.cause) });
  }
});

// ── Détail d'une licence ──────────────────────────────────────────────────────
router.get("/licenses/:id", async (req, res): Promise<void> => {
  try {
    const params = GetLicenseParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [license] = await db.select().from(licensesTable).where(eq(licensesTable.id, id));

    if (!license) {
      res.status(404).json({ error: "Licence introuvable." });
      return;
    }

    res.json(license);
  } catch (err) {
    console.error("GET /licenses/:id error:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ── Modifier une licence ──────────────────────────────────────────────────────
router.patch("/licenses/:id", async (req, res): Promise<void> => {
  try {
    const params = UpdateLicenseParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const parsed = UpdateLicenseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [license] = await db.update(licensesTable).set(parsed.data).where(eq(licensesTable.id, id)).returning();

    if (!license) {
      res.status(404).json({ error: "Licence introuvable." });
      return;
    }

    res.json(license);
  } catch (err) {
    console.error("PATCH /licenses/:id error:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ── Supprimer une licence ─────────────────────────────────────────────────────
router.delete("/licenses/:id", async (req, res): Promise<void> => {
  try {
    const params = DeleteLicenseParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [license] = await db.delete(licensesTable).where(eq(licensesTable.id, id)).returning();

    if (!license) {
      res.status(404).json({ error: "Licence introuvable." });
      return;
    }

    res.sendStatus(204);
  } catch (err) {
    console.error("DELETE /licenses/:id error:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ── Révoquer une licence ──────────────────────────────────────────────────────
router.post("/licenses/:id/revoke", async (req, res): Promise<void> => {
  try {
    const params = RevokeLicenseParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [license] = await db.update(licensesTable).set({ isActive: false }).where(eq(licensesTable.id, id)).returning();

    if (!license) {
      res.status(404).json({ error: "Licence introuvable." });
      return;
    }

    res.json(license);
  } catch (err) {
    console.error("POST /licenses/:id/revoke error:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ── Renouveler une licence ────────────────────────────────────────────────────
router.post("/licenses/:id/renew", async (req, res): Promise<void> => {
  try {
    const params = RenewLicenseParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [existing] = await db.select().from(licensesTable).where(eq(licensesTable.id, id));

    if (!existing) {
      res.status(404).json({ error: "Licence introuvable." });
      return;
    }

    if (existing.licenseType !== "subscription") {
      res.status(400).json({ error: "Seules les licences abonnement peuvent être renouvelées." });
      return;
    }

    const baseDate = existing.expiresAt && existing.expiresAt > new Date() ? existing.expiresAt : new Date();
    const newExpiry = new Date(baseDate);
    newExpiry.setDate(newExpiry.getDate() + 30);

    const [license] = await db
      .update(licensesTable)
      .set({ expiresAt: newExpiry, isActive: true })
      .where(eq(licensesTable.id, id))
      .returning();

    res.json(license);
  } catch (err) {
    console.error("POST /licenses/:id/renew error:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

export default router;
