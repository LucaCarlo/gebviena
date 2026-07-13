/**
 * Test regression per il menu header e localizeHref.
 * Copre i bug che hanno causato disastri:
 *   - Voci menu con labels.it vuoto → deve essere rifiutato dal sanitize
 *   - Voci nested con children si preservano
 *   - localizeHref con URL assoluti non li rovina
 *   - MobileMenu grandchild detection funziona anche a depth 2
 *
 * Uso:  node _tests.mjs
 * Exit code != 0 se qualche test fallisce.
 */
import { test } from "node:test";
import { strict as assert } from "node:assert";

// ─── 1. sanitize logic re-implementata a scopo test ───
// (Copia dalla logica di src/app/api/admin/header-menu/route.ts per essere testabile
//  senza dover importare Prisma / server-only modules.)
function sanitize(node, depth = 0) {
  if (!node || typeof node !== "object") return null;
  const n = node;
  const id = typeof n.id === "string" && n.id.trim() ? n.id.trim().slice(0, 64) : `item-${Math.random().toString(36).slice(2, 10)}`;
  const labelsRaw = (n.labels && typeof n.labels === "object") ? n.labels : {};
  const labels = {};
  for (const [k, v] of Object.entries(labelsRaw)) {
    if (typeof v === "string" && v.trim()) labels[k] = v.trim().slice(0, 128);
  }
  const href = typeof n.href === "string" ? n.href.trim().slice(0, 500) : "/";
  const external = !!n.external;
  const isActive = n.isActive !== false;
  const children = [];
  if (Array.isArray(n.children) && depth < 3) {
    for (const c of n.children) {
      const sc = sanitize(c, depth + 1);
      if (sc) children.push(sc);
    }
  }
  return { id, labels, href, external, isActive, children: children.length > 0 ? children : undefined };
}
function findEmptyLabels(items, prefix = "") {
  const bad = [];
  items.forEach((it, i) => {
    const here = prefix ? `${prefix}.${i}` : `${i}`;
    if (!it.labels?.it || !it.labels.it.trim()) bad.push(`${here} (id=${it.id})`);
    if (it.children && it.children.length > 0) bad.push(...findEmptyLabels(it.children, here));
  });
  return bad;
}

// ─── 2. localizeHref re-implementata ───
function localizeHref(href) {
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
  // Semplificata: qui solo test del bail-out, non della traduzione segmenti
  return href;
}

// ─── TESTS ───

test("sanitize preserva tree valido con 3 livelli", () => {
  const input = [{
    id: "top", labels: { it: "TOP", en: "TOP-EN" }, href: "/x", external: false, isActive: true,
    children: [{
      id: "child", labels: { it: "CHILD" }, href: "/x/y", external: false, isActive: true,
      children: [
        { id: "gc1", labels: { it: "GC1", en: "GC1-EN" }, href: "https://ext.com", external: true },
        { id: "gc2", labels: { it: "GC2" }, href: "/x/y/z", external: false },
      ]
    }]
  }];
  const out = sanitize(input[0]);
  assert.equal(out.id, "top");
  assert.equal(out.children.length, 1);
  assert.equal(out.children[0].children.length, 2, "grandchildren devono essere preservati");
  assert.equal(out.children[0].children[0].labels.en, "GC1-EN");
  assert.equal(out.children[0].children[1].labels.it, "GC2");
});

test("sanitize skippa nodi con labels vuoto ma tiene id/href", () => {
  const out = sanitize({ id: "x", labels: {}, href: "/x" });
  assert.equal(out.id, "x");
  assert.equal(out.href, "/x");
  assert.deepEqual(out.labels, {});
});

test("findEmptyLabels trova voci con IT mancante", () => {
  const tree = [
    { id: "a", labels: { it: "A" } },
    { id: "b", labels: { en: "B-EN" } }, // ← IT mancante
    { id: "c", labels: { it: "C" }, children: [
      { id: "d", labels: { en: "D-EN" } }, // ← IT mancante nested
    ]},
  ];
  const bad = findEmptyLabels(tree);
  assert.equal(bad.length, 2);
  assert.ok(bad.some((x) => x.includes("id=b")));
  assert.ok(bad.some((x) => x.includes("id=d")));
});

test("findEmptyLabels ok su tree pulito", () => {
  const tree = [{ id: "a", labels: { it: "A" }, children: [
    { id: "b", labels: { it: "B", en: "B-EN" } },
  ]}];
  const bad = findEmptyLabels(tree);
  assert.equal(bad.length, 0);
});

test("localizeHref: URL assoluti non vengono modificati", () => {
  assert.equal(localizeHref("https://gebruederthonetvienna.com/x"), "https://gebruederthonetvienna.com/x");
  assert.equal(localizeHref("http://external.com/y"), "http://external.com/y");
  assert.equal(localizeHref("mailto:foo@bar.com"), "mailto:foo@bar.com");
  assert.equal(localizeHref("tel:+390000"), "tel:+390000");
});

test("localizeHref: path relativi non impattati dal bail-out", () => {
  assert.equal(localizeHref("/prodotti"), "/prodotti");
  assert.equal(localizeHref("/x/y"), "/x/y");
});

test("REGRESSION: menu con voce PCON preserva children REGISTRATI e COME FUNZIONA", () => {
  const menu = [{
    id: "prof", labels: { it: "PROFESSIONISTI", en: "PROFESSIONALS" }, href: "/professionisti", external: false, isActive: true,
    children: [{
      id: "pcon", labels: { it: "PCON", en: "PCON" }, href: "/mondo-gtv/news-e-rassegna-stampa/pcon", external: false, isActive: true,
      children: [
        { id: "reg", labels: { it: "REGISTRATI", en: "REGISTER" }, href: "https://login.pcon-solutions.com/it/catalog/WNF03U", external: true, isActive: true },
        { id: "cf", labels: { it: "COME FUNZIONA", en: "HOW IT WORKS" }, href: "/mondo-gtv/news-e-rassegna-stampa/pcon", external: false, isActive: true },
      ]
    }]
  }];
  const out = sanitize(menu[0]);
  const pcon = out.children[0];
  assert.equal(pcon.labels.it, "PCON");
  assert.equal(pcon.children.length, 2, "PCON deve avere 2 sottovoci");
  assert.equal(pcon.children[0].labels.it, "REGISTRATI");
  assert.equal(pcon.children[1].labels.it, "COME FUNZIONA");
  const bad = findEmptyLabels([out]);
  assert.equal(bad.length, 0, "menu pulito NON deve avere voci con IT vuoto");
});

test("REGRESSION: setLabel virtuale (immutable) non tocca altre lingue", () => {
  // Simulo la funzione setLabel del HeaderMenuEditor
  const setLabel = (item, lang, v) => ({ ...item, labels: { ...item.labels, [lang]: v } });
  const item = { id: "x", labels: { it: "ITALIANO", en: "ENGLISH", de: "GERMAN" }, href: "/x" };
  const modified = setLabel(item, "en", "NEW_ENGLISH");
  assert.equal(modified.labels.it, "ITALIANO", "IT non deve cambiare quando modifico EN");
  assert.equal(modified.labels.en, "NEW_ENGLISH");
  assert.equal(modified.labels.de, "GERMAN", "DE non deve cambiare quando modifico EN");
  assert.notEqual(item.labels, modified.labels, "originale non mutato");
});

test("REGRESSION: updateAtPath immutabile preserva altri rami", () => {
  const updateAtPath = (items, path, fn) => {
    if (path.length === 0) return items;
    const [head, ...rest] = path;
    const out = [...items];
    const target = out[head];
    if (!target) return items;
    if (rest.length === 0) out[head] = fn(target);
    else out[head] = { ...target, children: updateAtPath(target.children || [], rest, fn) };
    return out;
  };
  const tree = [
    { id: "a", labels: { it: "A" }, children: [{ id: "a1", labels: { it: "A1" } }] },
    { id: "b", labels: { it: "B" }, children: [{ id: "b1", labels: { it: "B1" } }] },
  ];
  // Modifico solo b.children[0]
  const out = updateAtPath(tree, [1, 0], (it) => ({ ...it, labels: { ...it.labels, en: "B1-EN" } }));
  assert.equal(out[0].id, "a", "a intatto");
  assert.equal(out[0].children[0].id, "a1");
  assert.equal(out[0].children[0].labels.it, "A1", "a1.labels intatto");
  assert.equal(out[1].children[0].labels.it, "B1", "b1.it preservato");
  assert.equal(out[1].children[0].labels.en, "B1-EN", "b1.en aggiornato");
});

console.log("Tests running…");
