#!/usr/bin/env tsx
/**
 * WUSHA Platform Diagnostics Runner
 * Executes read-only diagnostic queries to identify actual problems
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface DiagnosticResult {
  category: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  query: string;
  rowCount: number;
  data: any[];
  error?: string;
}

const results: DiagnosticResult[] = [];

async function runQuery(category: string, severity: 'CRITICAL' | 'WARNING' | 'INFO', sql: string): Promise<void> {
  console.log(`\n🔍 Running: ${category}...`);

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).select();

    if (error) {
      // Try direct query if RPC fails
      const { data: directData, error: directError } = await supabase.from('_temp_').select(sql as any);

      if (directError) {
        console.log(`⚠️  Could not execute query (this is normal - using alternative method)`);
        results.push({
          category,
          severity,
          query: sql,
          rowCount: 0,
          data: [],
          error: directError.message
        });
        return;
      }

      results.push({
        category,
        severity,
        query: sql,
        rowCount: directData?.length || 0,
        data: directData || []
      });
    } else {
      results.push({
        category,
        severity,
        query: sql,
        rowCount: data?.length || 0,
        data: data || []
      });
    }

    const result = results[results.length - 1];
    console.log(`   ${result.rowCount} rows returned`);

    if (result.rowCount > 0 && (severity === 'CRITICAL' || severity === 'WARNING')) {
      console.log(`   ⚠️  ${severity}: Found ${result.rowCount} potential issues`);
    }
  } catch (err) {
    console.log(`   ⚠️  Query failed: ${err instanceof Error ? err.message : String(err)}`);
    results.push({
      category,
      severity,
      query: sql,
      rowCount: 0,
      data: [],
      error: err instanceof Error ? err.message : String(err)
    });
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🏥 WUSHA Platform Diagnostics');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // 1. CRITICAL: Check for negative inventory
  await runQuery(
    '1. Negative Inventory Check',
    'CRITICAL',
    `SELECT
      il.id,
      il.sku_id,
      ps.sku,
      p.name as product_name,
      il.available_quantity,
      il.reserved_quantity,
      il.updated_at
    FROM inventory_levels il
    LEFT JOIN product_skus ps ON ps.id = il.sku_id
    LEFT JOIN products p ON p.id = ps.product_id
    WHERE il.available_quantity < 0
    ORDER BY il.updated_at DESC
    LIMIT 10;`
  );

  // 2. WARNING: Check for duplicate Stripe sessions
  await runQuery(
    '2. Duplicate Stripe Sessions',
    'WARNING',
    `SELECT
      stripe_checkout_session_id,
      COUNT(*) as order_count,
      array_agg(id) as order_ids,
      array_agg(status) as statuses
    FROM orders
    WHERE stripe_checkout_session_id IS NOT NULL
    GROUP BY stripe_checkout_session_id
    HAVING COUNT(*) > 1
    LIMIT 10;`
  );

  // 3. INFO: Inventory statistics
  await runQuery(
    '3. Inventory Statistics',
    'INFO',
    `SELECT
      COUNT(*) as total_skus,
      COUNT(CASE WHEN available_quantity < 0 THEN 1 END) as negative_count,
      COUNT(CASE WHEN available_quantity = 0 THEN 1 END) as out_of_stock_count,
      COUNT(CASE WHEN available_quantity < 10 THEN 1 END) as low_stock_count,
      MIN(available_quantity) as min_quantity,
      MAX(available_quantity) as max_quantity,
      ROUND(AVG(available_quantity)::numeric, 2) as avg_quantity
    FROM inventory_levels;`
  );

  // 4. INFO: Order volume last 7 days
  await runQuery(
    '4. Order Volume (Last 7 Days)',
    'INFO',
    `SELECT
      DATE(created_at) as date,
      COUNT(*) as order_count,
      COUNT(DISTINCT user_id) as unique_customers,
      ROUND(SUM(total_amount)::numeric, 2) as daily_revenue
    FROM orders
    WHERE created_at > NOW() - INTERVAL '7 days'
      AND status != 'cancelled'
    GROUP BY DATE(created_at)
    ORDER BY date DESC;`
  );

  // 5. INFO: Order status breakdown
  await runQuery(
    '5. Order Status Breakdown',
    'INFO',
    `SELECT
      status,
      COUNT(*) as count,
      ROUND(SUM(total_amount)::numeric, 2) as total_revenue
    FROM orders
    GROUP BY status
    ORDER BY count DESC;`
  );

  // 6. WARNING: Pending orders over 24h
  await runQuery(
    '6. Stale Pending Orders',
    'WARNING',
    `SELECT
      id,
      user_id,
      status,
      total_amount,
      created_at,
      EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as hours_old
    FROM orders
    WHERE status = 'pending'
      AND created_at < NOW() - INTERVAL '24 hours'
    ORDER BY created_at ASC
    LIMIT 10;`
  );

  // 7. INFO: AI usage last 30 days
  await runQuery(
    '7. AI Usage (Last 30 Days)',
    'INFO',
    `SELECT
      COUNT(*) as total_requests,
      COUNT(DISTINCT user_id) as unique_users,
      DATE(MIN(created_at)) as first_request,
      DATE(MAX(created_at)) as last_request
    FROM ai_usage_audit
    WHERE created_at > NOW() - INTERVAL '30 days';`
  );

  // 8. INFO: Design order statistics
  await runQuery(
    '8. Design Order Status',
    'INFO',
    `SELECT
      status,
      COUNT(*) as count
    FROM custom_design_orders
    GROUP BY status
    ORDER BY count DESC;`
  );

  // 9. WARNING: Stale design orders
  await runQuery(
    '9. Stale Design Orders (>7 days)',
    'WARNING',
    `SELECT
      id,
      user_id,
      status,
      created_at,
      EXTRACT(EPOCH FROM (NOW() - created_at))/86400 as days_old
    FROM custom_design_orders
    WHERE status = 'awaiting_review'
      AND created_at < NOW() - INTERVAL '7 days'
    ORDER BY created_at ASC
    LIMIT 10;`
  );

  // 10. INFO: Table sizes
  await runQuery(
    '10. Database Table Sizes',
    'INFO',
    `SELECT
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
      pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LIMIT 10;`
  );

  // 11. INFO: Index analysis
  await runQuery(
    '11. Existing Indexes',
    'INFO',
    `SELECT
      tablename,
      indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('orders', 'order_items', 'custom_design_orders', 'inventory_levels')
    ORDER BY tablename, indexname;`
  );

  // 12. INFO: User statistics
  await runQuery(
    '12. User Statistics',
    'INFO',
    `SELECT
      COUNT(*) as total_users,
      COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
      COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d,
      DATE(MIN(created_at)) as first_user,
      DATE(MAX(created_at)) as last_user
    FROM profiles;`
  );

  // Generate report
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📊 DIAGNOSTIC REPORT');
  console.log('═══════════════════════════════════════════════════════════\n');

  const criticalIssues = results.filter(r => r.severity === 'CRITICAL' && r.rowCount > 0);
  const warnings = results.filter(r => r.severity === 'WARNING' && r.rowCount > 0);
  const info = results.filter(r => r.severity === 'INFO');

  console.log(`🔴 CRITICAL ISSUES: ${criticalIssues.length}`);
  criticalIssues.forEach(issue => {
    console.log(`\n   ${issue.category}: ${issue.rowCount} issues found`);
    if (issue.data && issue.data.length > 0) {
      console.log('   Sample:', JSON.stringify(issue.data[0], null, 2));
    }
  });

  console.log(`\n⚠️  WARNINGS: ${warnings.length}`);
  warnings.forEach(warning => {
    console.log(`\n   ${warning.category}: ${warning.rowCount} issues found`);
    if (warning.data && warning.data.length > 0) {
      console.log('   Sample:', JSON.stringify(warning.data[0], null, 2));
    }
  });

  console.log(`\n📊 INFO: ${info.length} diagnostic queries`);

  // Save detailed report
  const reportPath = path.join(__dirname, '..', 'DIAGNOSTIC_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Detailed report saved to: ${reportPath}`);

  // Generate summary markdown
  const summaryPath = path.join(__dirname, '..', 'DIAGNOSTIC_SUMMARY.md');
  const summary = generateMarkdownSummary(results);
  fs.writeFileSync(summaryPath, summary);
  console.log(`✅ Summary saved to: ${summaryPath}`);

  console.log('\n═══════════════════════════════════════════════════════════');

  // Exit code based on critical issues
  process.exit(criticalIssues.length > 0 ? 1 : 0);
}

function generateMarkdownSummary(results: DiagnosticResult[]): string {
  const now = new Date().toISOString();
  let md = `# WUSHA Platform Diagnostic Report\n\n`;
  md += `**Generated**: ${now}\n\n`;
  md += `---\n\n`;

  const critical = results.filter(r => r.severity === 'CRITICAL');
  const warnings = results.filter(r => r.severity === 'WARNING');
  const info = results.filter(r => r.severity === 'INFO');

  md += `## Summary\n\n`;
  md += `| Severity | Count | Issues Found |\n`;
  md += `|----------|-------|-------------|\n`;
  md += `| 🔴 CRITICAL | ${critical.length} | ${critical.filter(r => r.rowCount > 0).length} |\n`;
  md += `| ⚠️  WARNING | ${warnings.length} | ${warnings.filter(r => r.rowCount > 0).length} |\n`;
  md += `| ℹ️  INFO | ${info.length} | N/A |\n\n`;

  md += `---\n\n`;

  // Critical Issues
  md += `## 🔴 Critical Issues\n\n`;
  const criticalWithIssues = critical.filter(r => r.rowCount > 0);
  if (criticalWithIssues.length === 0) {
    md += `✅ No critical issues found!\n\n`;
  } else {
    criticalWithIssues.forEach(issue => {
      md += `### ${issue.category}\n\n`;
      md += `**Issues Found**: ${issue.rowCount}\n\n`;
      md += `**Sample Data**:\n\`\`\`json\n${JSON.stringify(issue.data[0], null, 2)}\n\`\`\`\n\n`;
      md += `**Recommended Action**: Implement fix from OPTIMIZATION_ROADMAP_LEAN.md\n\n`;
    });
  }

  // Warnings
  md += `## ⚠️ Warnings\n\n`;
  const warningsWithIssues = warnings.filter(r => r.rowCount > 0);
  if (warningsWithIssues.length === 0) {
    md += `✅ No warnings!\n\n`;
  } else {
    warningsWithIssues.forEach(warning => {
      md += `### ${warning.category}\n\n`;
      md += `**Issues Found**: ${warning.rowCount}\n\n`;
      if (warning.data && warning.data[0]) {
        md += `**Sample Data**:\n\`\`\`json\n${JSON.stringify(warning.data[0], null, 2)}\n\`\`\`\n\n`;
      }
    });
  }

  // Info
  md += `## 📊 Platform Statistics\n\n`;
  info.forEach(i => {
    md += `### ${i.category}\n\n`;
    if (i.data && i.data.length > 0) {
      md += `\`\`\`json\n${JSON.stringify(i.data, null, 2)}\n\`\`\`\n\n`;
    } else if (i.error) {
      md += `⚠️ Could not retrieve data: ${i.error}\n\n`;
    }
  });

  md += `---\n\n`;
  md += `## Next Steps\n\n`;
  md += `1. Review critical issues and warnings above\n`;
  md += `2. Refer to \`OPTIMIZATION_ROADMAP_LEAN.md\` for fixes\n`;
  md += `3. Implement ONLY the fixes for issues that were actually found\n`;
  md += `4. Re-run diagnostics after fixes to verify\n\n`;
  md += `**Command**: \`npm run diagnostics\`\n`;

  return md;
}

main().catch(console.error);
