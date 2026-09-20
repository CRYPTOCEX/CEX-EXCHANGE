// Local stub satisfying @wagmi/core's dynamic `import('accounts')` call.
// The real 'accounts' package is an optional Tempo peer dep this app does
// not use, but Turbopack eagerly resolves the specifier regardless of the
// runtime `.catch()` fallback, so we provide an installable stub.

const notInstalled = () => {
  throw new Error('dependency "accounts" not installed');
};

export const connect = notInstalled;
export const disconnect = notInstalled;
export const getAccounts = notInstalled;

export default {};
