/** Read-only cross-store futures inventory. Never releases funds or clears recovery fences. */
import { config } from 'dotenv';
import mysql from 'mysql2/promise';
import cassandra from 'cassandra-driver';
import { writeFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readScyllaPages } from './scylla-pages.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
config({ path: path.join(root, '.env'), quiet: true });
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--output') throw new Error('Usage: node scripts/audit-futures-settlement.mjs --output /private/directory/report.json');
const destination = path.join(await realpath(path.dirname(path.resolve(args[1]))), path.basename(args[1]));
if (destination === root || destination.startsWith(root + path.sep)) throw new Error('Write financial reports outside the web root');
const report = { startedAt: new Date().toISOString(), readOnly: true, complete: false,
  consistentSnapshot: false, limitation: 'MySQL and Scylla have no shared snapshot. This inventory cannot authorize balance repairs, funding backfills, or recovery-fence removal.',
  tables: {}, findings: [], counts: {} };
let db, client;
try {
  db = await mysql.createConnection({ host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'platform', connectTimeout: 5000 });
  await db.query('START TRANSACTION READ ONLY');
  for (const table of ['futures_market', 'futures_funding_payment', 'futures_fee_reversal', 'futures_insurance_ledger']) {
    const [exists] = await db.execute('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [table]);
    if (!exists.length) { report.findings.push({ code: 'MISSING_TABLE', table }); continue; }
    const [rows] = await db.query(`SELECT * FROM \`${table}\` LIMIT 50001`);
    if (rows.length > 50000) throw new Error(`Audit row bound exceeded: ${table}`);
    report.tables[table] = rows;
    report.counts[table] = rows.length;
  }
  const [wallets] = await db.query("SELECT id, userId, currency, balance, inOrder FROM wallet WHERE type = 'FUTURES' LIMIT 50001");
  const [ledger] = await db.query("SELECT id, userId, walletId, type, status, amount, fee, metadata, idempotencyKey, createdAt FROM `transaction` WHERE type = 'FUTURES_ORDER' OR LEFT(idempotencyKey, 8) = 'futures_' LIMIT 50001");
  if (wallets.length > 50000 || ledger.length > 50000) throw new Error('Audit SQL row bound exceeded');
  report.tables.wallets = wallets; report.tables.ledger = ledger;
  const [pending] = await db.execute('SELECT `key`, value FROM settings WHERE `key` = ?', ['futuresEnginePendingCycle']);
  report.tables.pendingCycle = pending;
  if (pending.length) report.findings.push({ code: 'ENGINE_RECOVERY_REQUIRED' });
  const keyspace = process.env.SCYLLA_FUTURES_KEYSPACE || 'futures';
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(keyspace)) throw new Error('Invalid futures keyspace identifier');
  const settings = { contactPoints: [process.env.SCYLLA_HOST || 'localhost'], localDataCenter: process.env.SCYLLA_DATACENTER || 'datacenter1', socketOptions: { connectTimeout: 5000, readTimeout: 10000 }, queryOptions: { consistency: cassandra.types.consistencies.localQuorum } };
  if (process.env.SCYLLA_USERNAME && process.env.SCYLLA_PASSWORD) settings.authProvider = new cassandra.auth.PlainTextAuthProvider(process.env.SCYLLA_USERNAME, process.env.SCYLLA_PASSWORD);
  client = new cassandra.Client(settings);
  for (const table of ['orders', 'position']) {
    const result = await readScyllaPages(client, `SELECT * FROM ${keyspace}.${table}`);
    if (result.truncated) throw new Error(`Incomplete Scylla snapshot: ${table}`);
    report.tables[table] = result.rows;
    report.counts[table] = result.rows.length;
  }
  const holds = new Map(ledger.filter(row => row.status === 'COMPLETED').map(row => [row.idempotencyKey, row]));
  for (const order of report.tables.orders) {
    const hold = holds.get(`futures_hold_${String(order.id)}`);
    let metadata;
    try { metadata = typeof hold?.metadata === 'string' ? JSON.parse(hold.metadata) : hold?.metadata; } catch {}
    const proof = metadata?.futuresOrder;
    if (!hold || String(hold.userId) !== String(order.userId) || !proof || ['id','symbol','cost','fee','amount'].some(key => String(proof[key]) !== String(order[key]))) {
      report.findings.push({ code: 'UNPROVEN_ORDER_COLLATERAL', orderId: String(order.id), status: order.status });
    }
  }
  for (const position of report.tables.position) {
    if (['OPEN', 'PARTIALLY_LIQUIDATED'].includes(position.status)) report.findings.push({ code: 'POSITION_FILL_COLLATERAL_MAPPING_REQUIRED', positionId: String(position.id) });
  }
  report.counts.wallets = wallets.length; report.counts.ledger = ledger.length;
  report.complete = true;
} catch (error) {
  // Credentials and raw driver errors are deliberately excluded from reports.
  report.error = { code: error.code || 'AUDIT_FAILED', kind: error.name, causes: Object.values(error.innerErrors || {}).map(e => e.code || e.name), message: 'Could not complete read-only inventory; no repairs attempted.' };
  process.exitCode = 1;
} finally {
  if (db) { await db.rollback().catch(() => {}); await db.end().catch(() => {}); }
  if (client) await client.shutdown().catch(() => {});
  report.finishedAt = new Date().toISOString();
  await writeFile(destination, JSON.stringify(report, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2), { mode: 0o600, flag: 'wx' });
  console.log(JSON.stringify({ complete: report.complete, counts: report.counts, findings: report.findings.length, error: report.error, report: destination }));
}
