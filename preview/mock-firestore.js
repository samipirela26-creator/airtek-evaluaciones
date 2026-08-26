// mock-firestore.js — Firestore EN MEMORIA para la previsualización local.
// Implementa lo justo que usan las páginas: doc/collection/query/where/orderBy/
// limit/getDoc/getDocs/addDoc/setDoc/updateDoc/deleteDoc/serverTimestamp/runTransaction.
// No persiste: al recargar vuelve al seed.
import { SEED } from "./seed.js";

const store = SEED; // referencia directa (preview es de solo lectura mayormente)
let autoId = 9000;
const nid = () => "gen_" + autoId++;
const col = (name) => (store[name] || (store[name] = {}));

export function collection(_db, name) { return { __t: "coll", name }; }

export function doc(a, b, c) {
  if (a && a.__t === "coll") return { __t: "doc", coll: a.name, id: b || nid() };
  return { __t: "doc", coll: b, id: c || nid() }; // doc(db, coll, id?)
}

export function query(collRef, ...cons) { return { __t: "query", name: collRef.name, cons }; }
export function where(field, op, value) { return { __c: "where", field, op, value }; }
export function orderBy(field, dir = "asc") { return { __c: "orderBy", field, dir }; }
export function limit(n) { return { __c: "limit", n }; }

function snap(coll, id, data) {
  return { id, exists: () => data !== undefined, data: () => data, get: (f) => data && data[f] };
}

export async function getDoc(ref) { return snap(ref.coll, ref.id, col(ref.coll)[ref.id]); }

export async function getDocs(q) {
  const name = q.name;
  const cons = q.cons || [];
  let rows = Object.entries(col(name)).map(([id, data]) => ({ id, data }));
  for (const c of cons.filter((c) => c.__c === "where"))
    rows = rows.filter((r) => matchWhere(r.data ? r.data[c.field] : undefined, c.op, c.value));
  const ob = cons.find((c) => c.__c === "orderBy");
  if (ob) rows.sort((a, b) => cmp(val(a.data, ob.field), val(b.data, ob.field)) * (ob.dir === "desc" ? -1 : 1));
  const lim = cons.find((c) => c.__c === "limit");
  if (lim) rows = rows.slice(0, lim.n);
  const docs = rows.map((r) => snap(name, r.id, r.data));
  return { docs, empty: docs.length === 0, size: docs.length, forEach: (fn) => docs.forEach(fn) };
}

function val(d, f) { return d ? d[f] : undefined; }
function matchWhere(v, op, x) {
  switch (op) {
    case "==": return v === x;
    case "!=": return v !== x;
    case "in": return Array.isArray(x) && x.includes(v);
    case ">=": return v >= x; case "<=": return v <= x;
    case ">": return v > x; case "<": return v < x;
    default: return true;
  }
}
function cmp(a, b) {
  // ordena por .toDate() si es timestamp, si no por valor directo.
  const av = a && a.toDate ? a.toDate().getTime() : a;
  const bv = b && b.toDate ? b.toDate().getTime() : b;
  if (av == null && bv == null) return 0;
  if (av == null) return -1; if (bv == null) return 1;
  return av < bv ? -1 : av > bv ? 1 : 0;
}

export async function addDoc(collRef, data) { const id = nid(); col(collRef.name)[id] = data; return { id }; }
export async function setDoc(ref, data) { col(ref.coll)[ref.id] = data; }
export async function updateDoc(ref, data) { col(ref.coll)[ref.id] = Object.assign(col(ref.coll)[ref.id] || {}, data); }
export async function deleteDoc(ref) { delete col(ref.coll)[ref.id]; }
export function serverTimestamp() { const d = new Date(); return { toDate: () => d, seconds: Math.floor(d / 1000) }; }

export async function runTransaction(_db, fn) {
  return fn({
    get: (ref) => getDoc(ref),
    set: (ref, data) => setDoc(ref, data),
    update: (ref, data) => updateDoc(ref, data),
    delete: (ref) => deleteDoc(ref),
  });
}
