#!/usr/bin/env node
/**
 * WUSHA Platform Diagnostics Runner
 * Executes read-only diagnostic queries to identify actual problems
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadEnv } from './load-env.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment from .env.local
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const results = [];

async function runQuery(category, severity, tableName, queryFn) {
  process.stdout.write(`\n🔍 ${category}... `);

  try {
    const result = await queryFn();
    const rowCount = result.data?.length || 0;

    results.push({
      category,
      severity,
      tableName,
      rowCount,
      data: result.data || [],
      error: result.error?.message
    });

    if (result.error) {
      console.log(`❌ Error: ${result.error.message}`);
    } else {
      console.log(`✅ ${rowCount} rows`);
      if (rowCount > 0 && (severity === 'CRITICAL' || severity === 'WARNING')) {
        console.log(`   ⚠️  ${severity}: Found ${rowCount} potential issues`);
      }
    }
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
    results.push({
      category,
      severity,
      tableName,
      rowCount: 0,
      data: [],
      error: err.message
    });
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🏥 WUSHA Platform Diagnostics');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════');

  // 1. CRITICAL: Check for negative inventory
  await runQuery(
    '1. Negative Inventory Check',
    'CRITICAL',
    'inventory_levels',
    () => supabase
      .from('inventory_levels')
      .select(`
        id,
        sku_id,
        available_quantity,
        reserved_quantity,
        updated_at,
        product_skus(sku, products(name))
      `)
      .lt('available_quantity', 0)
      .order('updated_at', { ascending: false })
      .limit(10)
  );

  // 2. INFO: Inventory statistics
  await runQuery(
    '2. Inventory Statistics',
    'INFO',
    'inventory_levels',
    async () => {
      const { data: all } = await supabase.from('inventory_levels').select('available_quantity');
      const negative = all?.filter(i => i.available_quantity < 0).length || 0;
      const zero = all?.filter(i => i.available_quantity === 0).length || 0;
      const low = all?.filter(i => i.available_quantity < 10).length || 0;
      const quantities = all?.map(i => i.available_quantity) || [];
      const min = Math.min(...quantities);
      const max = Math.max(...quantities);
      const avg = quantities.reduce((a, b) => a + b, 0) / quantities.length;

      return {
        data: [{
          total_skus: all?.length || 0,
          negative_count: negative,
          out_of_stock: zero,
          low_stock: low,
          min_quantity: min,
          max_quantity: max,
          avg_quantity: avg.toFixed(2)
        }]
      };
    }
  );

  // 3. WARNING: Check for duplicate Stripe sessions
  await runQuery(
    '3. Duplicate Stripe Sessions',
    'WARNING',
    'orders',
    async () => {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, stripe_checkout_session_id, status, created_at')
        .not('stripe_checkout_session_id', 'is', null);

      const sessionMap = {};
      orders?.forEach(order => {
        const sessionId = order.stripe_checkout_session_id;
        if (!sessionMap[sessionId]) {
          sessionMap[sessionId] = [];
        }
        sessionMap[sessionId].push(order);
      });

      const duplicates = Object.entries(sessionMap)
        .filter(([_, orders]) => orders.length > 1)
        .map(([sessionId, orders]) => ({
          stripe_checkout_session_id: sessionId,
          order_count: orders.length,
          order_ids: orders.map(o => o.id),
          statuses: orders.map(o => o.status)
        }));

      return { data: duplicates };
    }
  );

  // 4. INFO: Order volume last 7 days
  await runQuery(
    '4. Order Volume (Last 7 Days)',
    'INFO',
    'orders',
    async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await supabase
        .from('orders')
        .select('created_at, user_id, total_amount, status')
        .gte('created_at', sevenDaysAgo.toISOString())
        .neq('status', 'cancelled');

      // Group by date
      const byDate = {};
      data?.forEach(order => {
        const date = order.created_at.split('T')[0];
        if (!byDate[date]) {
          byDate[date] = { orders: [], users: new Set(), revenue: 0 };
        }
        byDate[date].orders.push(order);
        byDate[date].users.add(order.user_id);
        byDate[date].revenue += parseFloat(order.total_amount || 0);
      });

      const result = Object.entries(byDate).map(([date, stats]) => ({
        date,
        order_count: stats.orders.length,
        unique_customers: stats.users.size,
        daily_revenue: stats.revenue.toFixed(2)
      })).sort((a, b) => b.date.localeCompare(a.date));

      return { data: result };
    }
  );

  // 5. INFO: Order status breakdown
  await runQuery(
    '5. Order Status Breakdown',
    'INFO',
    'orders',
    async () => {
      const { data } = await supabase
        .from('orders')
        .select('status, total_amount');

      const byStatus = {};
      data?.forEach(order => {
        if (!byStatus[order.status]) {
          byStatus[order.status] = { count: 0, revenue: 0 };
        }
        byStatus[order.status].count++;
        byStatus[order.status].revenue += parseFloat(order.total_amount || 0);
      });

      const result = Object.entries(byStatus).map(([status, stats]) => ({
        status,
        count: stats.count,
        total_revenue: stats.revenue.toFixed(2)
      })).sort((a, b) => b.count - a.count);

      return { data: result };
    }
  );

  // 6. WARNING: Pending orders over 24h
  await runQuery(
    '6. Stale Pending Orders (>24h)',
    'WARNING',
    'orders',
    async () => {
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);

      const { data } = await supabase
        .from('orders')
        .select('id, user_id, status, total_amount, created_at')
        .eq('status', 'pending')
        .lt('created_at', oneDayAgo.toISOString())
        .order('created_at', { ascending: true })
        .limit(10);

      return {
        data: data?.map(order => ({
          ...order,
          hours_old: ((Date.now() - new Date(order.created_at).getTime()) / 3600000).toFixed(1)
        }))
      };
    }
  );

  // 7. INFO: AI usage last 30 days
  await runQuery(
    '7. AI Usage (Last 30 Days)',
    'INFO',
    'ai_usage_audit',
    async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data } = await supabase
        .from('ai_usage_audit')
        .select('id, user_id, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const uniqueUsers = new Set(data?.map(d => d.user_id));

      return {
        data: [{
          total_requests: data?.length || 0,
          unique_users: uniqueUsers.size,
          first_request: data?.[0]?.created_at?.split('T')[0] || 'N/A',
          last_request: data?.[data.length - 1]?.created_at?.split('T')[0] || 'N/A'
        }]
      };
    }
  );

  // 8. INFO: Design order statistics
  await runQuery(
    '8. Design Order Status',
    'INFO',
    'custom_design_orders',
    async () => {
      const { data } = await supabase
        .from('custom_design_orders')
        .select('status');

      const byStatus = {};
      data?.forEach(order => {
        byStatus[order.status] = (byStatus[order.status] || 0) + 1;
      });

      const result = Object.entries(byStatus).map(([status, count]) => ({
        status,
        count
      })).sort((a, b) => b.count - a.count);

      return { data: result };
    }
  );

  // 9. WARNING: Stale design orders
  await runQuery(
    '9. Stale Design Orders (>7 days)',
    'WARNING',
    'custom_design_orders',
    async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await supabase
        .from('custom_design_orders')
        .select('id, user_id, status, created_at')
        .eq('status', 'awaiting_review')
        .lt('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true })
        .limit(10);

      return {
        data: data?.map(order => ({
          ...order,
          days_old: ((Date.now() - new Date(order.created_at).getTime()) / 86400000).toFixed(1)
        }))
      };
    }
  );

  // 10. INFO: User statistics
  await runQuery(
    '10. User Statistics',
    'INFO',
    'profiles',
    async () => {
      const { data: all } = await supabase.from('profiles').select('id, role, created_at');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const admins = all?.filter(u => u.role === 'admin').length || 0;
      const recent = all?.filter(u => new Date(u.created_at) > thirtyDaysAgo).length || 0;

      return {
        data: [{
          total_users: all?.length || 0,
          admin_count: admins,
          new_users_30d: recent,
          first_user: all?.[0]?.created_at?.split('T')[0] || 'N/A',
          last_user: all?.[all.length - 1]?.created_at?.split('T')[0] || 'N/A'
        }]
      };
    }
  );

  // Generate report
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📊 DIAGNOSTIC REPORT');
  console.log('═══════════════════════════════════════════════════════════\n');

  const critical = results.filter(r => r.severity === 'CRITICAL' && r.rowCount > 0);
  const warnings = results.filter(r => r.severity === 'WARNING' && r.rowCount > 0);

  console.log(`🔴 CRITICAL ISSUES: ${critical.length}`);
  critical.forEach(issue => {
    console.log(`\n   ❌ ${issue.category}: ${issue.rowCount} issues found`);
    if (issue.data?.[0]) {
      console.log('   Sample:', JSON.stringify(issue.data[0], null, 2));
    }
  });

  console.log(`\n⚠️  WARNINGS: ${warnings.length}`);
  warnings.forEach(warning => {
    console.log(`\n   ⚠️  ${warning.category}: ${warning.rowCount} issues found`);
    if (warning.data?.[0]) {
      console.log('   Sample:', JSON.stringify(warning.data[0], null, 2));
    }
  });

  // Save reports
  const reportPath = join(__dirname, '..', 'DIAGNOSTIC_REPORT.json');
  writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Detailed report: DIAGNOSTIC_REPORT.json`);

  const summaryPath = join(__dirname, '..', 'DIAGNOSTIC_SUMMARY.md');
  const summary = generateMarkdownSummary(results);
  writeFileSync(summaryPath, summary);
  console.log(`✅ Summary: DIAGNOSTIC_SUMMARY.md`);

  console.log('\n═══════════════════════════════════════════════════════════');

  // Print recommendation
  console.log('\n📋 RECOMMENDATIONS:\n');

  if (critical.length === 0 && warnings.length === 0) {
    console.log('✅ No critical issues or warnings found!');
    console.log('✅ Your platform is in good health.');
    console.log('\n💡 Focus on Phase 1 (Developer Experience) from OPTIMIZATION_ROADMAP_LEAN.md');
  } else {
    console.log('⚠️  Issues found. Refer to OPTIMIZATION_ROADMAP_LEAN.md for fixes:');
    critical.forEach(c => console.log(`   - Phase 0: ${c.category}`));
    warnings.forEach(w => console.log(`   - Phase 0: ${w.category}`));
  }

  console.log('\n');
}

function generateMarkdownSummary(results) {
  const now = new Date().toISOString();
  let md = `# WUSHA Platform Diagnostic Report\n\n`;
  md += `**Generated**: ${now}\n\n`;
  md += `---\n\n`;

  const critical = results.filter(r => r.severity === 'CRITICAL');
  const warnings = results.filter(r => r.severity === 'WARNING');
  const info = results.filter(r => r.severity === 'INFO');

  md += `## Summary\n\n`;
  md += `| Severity | Checks Run | Issues Found |\n`;
  md += `|----------|------------|-------------|\n`;
  md += `| 🔴 CRITICAL | ${critical.length} | ${critical.filter(r => r.rowCount > 0).length} |\n`;
  md += `| ⚠️  WARNING | ${warnings.length} | ${warnings.filter(r => r.rowCount > 0).length} |\n`;
  md += `| ℹ️  INFO | ${info.length} | N/A |\n\n`;

  // Verdict
  const criticalIssues = critical.filter(r => r.rowCount > 0);
  const warningIssues = warnings.filter(r => r.rowCount > 0);

  if (criticalIssues.length === 0 && warningIssues.length === 0) {
    md += `## ✅ Platform Health: GOOD\n\n`;
    md += `No critical issues or warnings detected. Your platform is operating normally.\n\n`;
    md += `### Recommended Next Steps:\n\n`;
    md += `1. Continue with Phase 1 (Developer Experience) from \`OPTIMIZATION_ROADMAP_LEAN.md\`\n`;
    md += `2. Set up Sentry for error monitoring\n`;
    md += `3. Run diagnostics weekly to catch issues early\n\n`;
  } else {
    md += `## ⚠️  Platform Health: NEEDS ATTENTION\n\n`;
    md += `Found ${criticalIssues.length} critical issues and ${warningIssues.length} warnings.\n\n`;
  }

  md += `---\n\n`;

  // Critical Issues
  md += `## 🔴 Critical Issues\n\n`;
  if (criticalIssues.length === 0) {
    md += `✅ No critical issues found!\n\n`;
  } else {
    criticalIssues.forEach(issue => {
      md += `### ${issue.category}\n\n`;
      md += `**Issues Found**: ${issue.rowCount}\n\n`;
      if (issue.data?.[0]) {
        md += `**Sample Data**:\n\`\`\`json\n${JSON.stringify(issue.data[0], null, 2)}\n\`\`\`\n\n`;
      }
      md += `**Action**: See Phase 0 in \`OPTIMIZATION_ROADMAP_LEAN.md\`\n\n`;
    });
  }

  // Warnings
  md += `## ⚠️ Warnings\n\n`;
  if (warningIssues.length === 0) {
    md += `✅ No warnings!\n\n`;
  } else {
    warningIssues.forEach(warning => {
      md += `### ${warning.category}\n\n`;
      md += `**Issues Found**: ${warning.rowCount}\n\n`;
      if (warning.data?.[0]) {
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
      md += `⚠️ Could not retrieve: ${i.error}\n\n`;
    }
  });

  md += `---\n\n`;
  md += `## Next Steps\n\n`;
  md += `1. Review issues above\n`;
  md += `2. Refer to \`OPTIMIZATION_ROADMAP_LEAN.md\` Phase 0 for fixes\n`;
  md += `3. Implement ONLY fixes for confirmed issues\n`;
  md += `4. Re-run: \`npm run diagnostics\`\n`;

  return md;
}

main().catch(console.error);
