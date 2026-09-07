// In-memory localStorage shim so the mock service can load in Node.
const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => {
    store[k] = String(v);
  },
  removeItem: (k) => {
    delete store[k];
  },
  clear: () => {
    for (const k of Object.keys(store)) delete store[k];
  },
  key: (i) => Object.keys(store)[i] ?? null,
  get length() {
    return Object.keys(store).length;
  },
};
module.exports = {};