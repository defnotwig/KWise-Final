#!/usr/bin/env node
/**
 * compute_compat_metrics.js
 * One-off helper to compute compatibility metrics from the `compatibility_logs` table.
 * Usage: from repo root run `node KWise-Backend/scripts/compute_compat_metrics.js`
 */

const path = require('node:path');
const fs = require('node:fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number.parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'KWiseDB',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

async function tableExists(tableName) {
  const q = `SELECT to_regclass($1) AS tbl`;
  const r = await pool.query(q, [tableName]);
  return r.rows[0] && r.rows[0].tbl !== null;
}

async function getSampleRow() {
  const q = `SELECT * FROM compatibility_logs ORDER BY created_at DESC LIMIT 1`;
  try {
    const r = await pool.query(q);
    return r.rows[0] || null;
  } catch (err) {
    return null;
  }
}

async function totalChecks() {
  const q = `SELECT COUNT(*)::bigint AS total_checks FROM compatibility_logs`;
  const r = await pool.query(q);
  return Number.parseInt(r.rows[0].total_checks, 10);
}

async function computeBuildLevelMetrics(sampleRow) {
  // Try various approaches depending on available schema
  // 1) If rules_verdict->>'failed' exists, use it
  const conn = pool;
  // Detect presence of keys by inspecting sampleRow if provided
  if (sampleRow && sampleRow.rules_verdict) {
    const rv = sampleRow.rules_verdict;
    if (rv.failed !== undefined || rv.failed_count !== undefined || rv.failed_rules !== undefined) {
      // prefer numeric key 'failed' or 'failed_count'
      const candidateKeys = ['failed', 'failed_count', 'failed_rules'];
      const present = candidateKeys.find(k => rv[k] !== undefined);
      if (present) {
        const q = `SELECT COUNT(*) FILTER (WHERE ((rules_verdict->>$1))::int = 0) AS zero_fail_builds, COUNT(*) AS total_builds FROM compatibility_logs`;
        const r = await conn.query(q, [present]);
        return { zero_fail_builds: Number.parseInt(r.rows[0].zero_fail_builds, 10), total_builds: Number.parseInt(r.rows[0].total_builds, 10) };
      }
    }
  }

  // 2) If rules_applied array exists, compute builds with no failing rules
  // We'll check existence of rules_applied in sampleRow
  if (sampleRow && sampleRow.rules_applied) {
    // Use a NOT EXISTS subquery to detect builds with any matched=false
    const q = `
      SELECT
        COUNT(*) FILTER (WHERE NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(rules_applied) AS ra WHERE (ra->>'matched')::text = 'false'
        )) AS zero_fail_builds,
        COUNT(*) AS total_builds
      FROM compatibility_logs
    `;
    const r = await conn.query(q);
    return { zero_fail_builds: Number.parseInt(r.rows[0].zero_fail_builds, 10), total_builds: Number.parseInt(r.rows[0].total_builds, 10) };
  }

  // 3) Generic fallback: look for a top-level column 'outcome_quality' where 'good' or 'success' indicates pass
  try {
    const q = `SELECT COUNT(*) FILTER (WHERE outcome_quality IN ('success','good','passed','ok')) AS zero_fail_builds, COUNT(*) AS total_builds FROM compatibility_logs`;
    const r = await conn.query(q);
    return { zero_fail_builds: Number.parseInt(r.rows[0].zero_fail_builds, 10), total_builds: Number.parseInt(r.rows[0].total_builds, 10) };
  } catch (err) {
    return { zero_fail_builds: 0, total_builds: 0 };
  }
}

async function computeRuleLevelMetrics() {
  // Attempt to compute matched_rules / total_rules from rules_applied
  // If rules_applied doesn't exist, we'll attempt to parse rules_verdict aggregated fields
  const client = pool;
  // Check if rules_applied column exists by probing a sample
  try {
    const sample = await client.query("SELECT rules_applied FROM compatibility_logs LIMIT 1");
    if (sample.rowCount === 0 || sample.rows[0].rules_applied === null) {
      // No rules_applied - try rules_verdict aggregated fields
      // First try common keys 'compatible_count' and 'total'
      const tryCompat = await client.query(`
        SELECT
          SUM((rules_verdict->>'compatible_count')::int) AS matched_rules,
          SUM((rules_verdict->>'total')::int) AS total_rules
        FROM compatibility_logs
      `).catch(() => null);

      if (tryCompat && tryCompat.rows && (tryCompat.rows[0].matched_rules !== null || tryCompat.rows[0].total_rules !== null)) {
        return { matched_rules: Number.parseInt(tryCompat.rows[0].matched_rules || 0, 10), total_rules: Number.parseInt(tryCompat.rows[0].total_rules || 0, 10) };
      }

      // Fallback: try 'passed'/'total' keys
      const tryAgg = await client.query(`
        SELECT
          SUM((rules_verdict->>'passed')::int) AS passed_rules,
          SUM((rules_verdict->>'total')::int) AS total_rules
        FROM compatibility_logs
      `).catch(() => null);
      if (tryAgg && tryAgg.rows && tryAgg.rows[0]) {
        return { matched_rules: Number.parseInt(tryAgg.rows[0].passed_rules || 0, 10), total_rules: Number.parseInt(tryAgg.rows[0].total_rules || 0, 10) };
      }

      return { matched_rules: 0, total_rules: 0 };
    }

    // If we have rules_applied, explode it and count
    const q = `
      WITH exploded AS (
        SELECT jsonb_array_elements(rules_applied) AS rule
        FROM compatibility_logs
      )
      SELECT
        SUM(CASE WHEN (rule->>'matched')::text = 'true' THEN 1 ELSE 0 END) AS matched_rules,
        COUNT(*) AS total_rules
      FROM exploded;
    `;
    const r = await client.query(q);
    return { matched_rules: Number.parseInt(r.rows[0].matched_rules || 0, 10), total_rules: Number.parseInt(r.rows[0].total_rules || 0, 10) };
  } catch (err) {
    return { matched_rules: 0, total_rules: 0 };
  }
}

async function main() {
  console.log('Connecting to DB:', process.env.DB_HOST, process.env.DB_NAME, 'as', process.env.DB_USER);
  try {
    const exists = await tableExists('compatibility_logs');
    if (!exists) {
      console.error('Table `compatibility_logs` does not exist in the database.');
      process.exitCode = 2;
      await pool.end();
      return;
    }

    const total = await totalChecks();
    console.log(`Total compatibility checks logged: ${total}`);

    const sample = await getSampleRow();
    if (!sample) {
      console.log('No sample row available. Table may be empty.');
    } else {
      console.log('\nSample row (most recent):');
      // Print a concise view of JSON fields useful for adapting queries
      const preview = {
        id: sample.id || sample.log_id || '(no id)',
        created_at: sample.created_at || sample.timestamp || null,
        product_id: sample.product_id || sample.build_hash || null,
        rules_verdict: sample.rules_verdict || null,
        rules_applied: sample.rules_applied || null,
        ai_verdict: sample.ai_verdict || null,
        outcome_quality: sample.outcome_quality || null
      };
      console.log(JSON.stringify(preview, null, 2));
    }

    console.log('\nComputing build-level metrics...');
    const buildMetrics = await computeBuildLevelMetrics(sample);
    if (buildMetrics.total_builds === 0) {
      console.log('No builds found or unable to compute build-level metrics with current schema.');
    } else {
      const pct = ((buildMetrics.zero_fail_builds / buildMetrics.total_builds) * 100).toFixed(2);
      console.log(`Zero-fail builds: ${buildMetrics.zero_fail_builds}/${buildMetrics.total_builds} (${pct}%)`);
    }

    console.log('\nComputing rule-level metrics...');
    const ruleMetrics = await computeRuleLevelMetrics();
    if (ruleMetrics.total_rules === 0) {
      console.log('No rule-level data found or unable to compute rule-level metrics with current schema.');
    } else {
      const pct = ((ruleMetrics.matched_rules / ruleMetrics.total_rules) * 100).toFixed(4);
      console.log(`Matched rules: ${ruleMetrics.matched_rules}/${ruleMetrics.total_rules} (${pct}%)`);
    }

    console.log('\nDone.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exitCode = 3;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}
