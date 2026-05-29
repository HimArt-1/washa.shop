#!/usr/bin/env node
/**
 * Design Order Cancellation Investigation
 * Deep dive into why 46% of orders are cancelled
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { loadEnv } from './load-env.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 Design Order Cancellation Investigation');
  console.log('═══════════════════════════════════════════════════════════\n');

  const findings = {};

  // 1. Get ALL design orders with details
  console.log('📊 Fetching all design orders...');
  const { data: orders, error } = await supabase
    .from('custom_design_orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  findings.totalOrders = orders.length;
  findings.byStatus = {};

  orders.forEach(order => {
    findings.byStatus[order.status] = (findings.byStatus[order.status] || 0) + 1;
  });

  console.log('\n📈 Status Breakdown:');
  Object.entries(findings.byStatus).forEach(([status, count]) => {
    const pct = ((count / orders.length) * 100).toFixed(1);
    console.log(`   ${status.padEnd(20)} ${count.toString().padStart(3)} (${pct}%)`);
  });

  // 2. Analyze cancelled orders specifically
  const cancelled = orders.filter(o => o.status === 'cancelled');
  const completed = orders.filter(o => o.status === 'completed');
  const inProgress = orders.filter(o => o.status === 'in_progress');
  const newOrders = orders.filter(o => o.status === 'new');

  findings.cancelled = {
    count: cancelled.length,
    percentage: ((cancelled.length / orders.length) * 100).toFixed(1)
  };

  console.log('\n🔴 Cancellation Analysis:');
  console.log(`   Total Cancelled: ${cancelled.length} (${findings.cancelled.percentage}%)`);

  // 3. Check for user info
  const cancelledWithEmail = cancelled.filter(o => o.customer_email);
  const cancelledWithoutEmail = cancelled.filter(o => !o.customer_email);

  console.log(`   - With email: ${cancelledWithEmail.length}`);
  console.log(`   - Without email: ${cancelledWithoutEmail.length}`);

  findings.contactInfo = {
    withEmail: cancelledWithEmail.length,
    withoutEmail: cancelledWithoutEmail.length,
    implication: cancelledWithoutEmail.length > 0
      ? 'Users abandoning before providing contact info'
      : 'All provided email (abandoned after committing)'
  };

  // 4. Time to cancellation analysis
  const cancelledWithTime = cancelled.map(o => {
    const created = new Date(o.created_at);
    const updated = new Date(o.updated_at);
    const minutesToCancel = (updated - created) / (1000 * 60);
    return { ...o, minutesToCancel };
  });

  const avgTimeToCancel = cancelledWithTime.reduce((sum, o) => sum + o.minutesToCancel, 0) / cancelledWithTime.length;

  console.log('\n⏱️  Time Analysis:');
  console.log(`   Avg time to cancellation: ${avgTimeToCancel.toFixed(1)} minutes`);

  const immediateCancels = cancelledWithTime.filter(o => o.minutesToCancel < 5);
  const lateCancels = cancelledWithTime.filter(o => o.minutesToCancel >= 60);

  console.log(`   - Immediate (<5 min): ${immediateCancels.length} (${((immediateCancels.length/cancelled.length)*100).toFixed(1)}%)`);
  console.log(`   - Late (>1 hour): ${lateCancels.length} (${((lateCancels.length/cancelled.length)*100).toFixed(1)}%)`);

  findings.timeToCancel = {
    average: avgTimeToCancel.toFixed(1),
    immediate: immediateCancels.length,
    late: lateCancels.length,
    implication: immediateCancels.length > cancelled.length / 2
      ? '⚠️  CRITICAL: Most cancellations happen immediately (UX issue)'
      : 'Cancellations spread over time (admin delay issue)'
  };

  // 5. Design method analysis
  const byMethod = {
    from_text: cancelled.filter(o => o.design_method === 'from_text').length,
    from_image: cancelled.filter(o => o.design_method === 'from_image').length,
    missing: cancelled.filter(o => !o.design_method).length
  };

  console.log('\n🎨 Design Method (Cancelled Orders):');
  console.log(`   - Text prompt: ${byMethod.from_text}`);
  console.log(`   - Image upload: ${byMethod.from_image}`);
  console.log(`   - Missing: ${byMethod.missing}`);

  findings.designMethod = byMethod;

  // 6. Check for missing required fields
  const missingFields = cancelled.map(order => {
    const missing = [];
    if (!order.customer_name) missing.push('name');
    if (!order.customer_email) missing.push('email');
    if (!order.customer_phone) missing.push('phone');
    if (!order.text_prompt && !order.reference_image_url) missing.push('design_input');
    if (!order.garment_name) missing.push('garment');
    if (!order.color_name) missing.push('color');
    if (!order.size_name) missing.push('size');

    return {
      id: order.id,
      missingCount: missing.length,
      missing
    };
  });

  const ordersWithMissingFields = missingFields.filter(o => o.missingCount > 0);
  console.log('\n📋 Missing Required Fields:');
  console.log(`   Orders with missing fields: ${ordersWithMissingFields.length}/${cancelled.length}`);

  if (ordersWithMissingFields.length > 0) {
    const fieldCounts = {};
    ordersWithMissingFields.forEach(o => {
      o.missing.forEach(field => {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
      });
    });

    console.log('   Most commonly missing:');
    Object.entries(fieldCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([field, count]) => {
        console.log(`      ${field}: ${count} orders`);
      });

    findings.missingFields = {
      ordersAffected: ordersWithMissingFields.length,
      breakdown: fieldCounts,
      implication: '⚠️  Users abandoning mid-flow (wizard too long or confusing)'
    };
  }

  // 7. Compare completed vs cancelled characteristics
  console.log('\n✅ Comparison: Completed vs Cancelled');

  const completedWithEmail = completed.filter(o => o.customer_email).length;
  const completedTextMethod = completed.filter(o => o.design_method === 'from_text').length;

  console.log(`   Completed with email: ${completedWithEmail}/${completed.length} (${((completedWithEmail/completed.length)*100).toFixed(1)}%)`);
  console.log(`   Cancelled with email: ${cancelledWithEmail.length}/${cancelled.length} (${((cancelledWithEmail.length/cancelled.length)*100).toFixed(1)}%)`);

  console.log(`\n   Completed via text: ${completedTextMethod}/${completed.length} (${((completedTextMethod/completed.length)*100).toFixed(1)}%)`);
  console.log(`   Cancelled via text: ${byMethod.from_text}/${cancelled.length} (${((byMethod.from_text/cancelled.length)*100).toFixed(1)}%)`);

  // 8. Check user_id field (if exists)
  const cancelledWithUserId = cancelled.filter(o => o.user_id);
  const cancelledAnonymous = cancelled.filter(o => !o.user_id);

  if (cancelledWithUserId.length + cancelledAnonymous.length === cancelled.length) {
    console.log('\n👤 User Authentication:');
    console.log(`   Logged in: ${cancelledWithUserId.length}`);
    console.log(`   Anonymous: ${cancelledAnonymous.length}`);

    findings.authentication = {
      loggedIn: cancelledWithUserId.length,
      anonymous: cancelledAnonymous.length,
      implication: cancelledAnonymous.length > cancelledWithUserId.length
        ? '⚠️  Most cancellations from anonymous users (auth friction?)'
        : 'Auth not the issue'
    };
  }

  // 9. Check for admin processing delays
  const awaitingReview = orders.filter(o => o.status === 'awaiting_review');
  if (awaitingReview.length > 0) {
    const waitTimes = awaitingReview.map(o => {
      const created = new Date(o.created_at);
      const now = new Date();
      const hoursWaiting = (now - created) / (1000 * 60 * 60);
      return hoursWaiting;
    });

    const avgWait = waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length;
    const maxWait = Math.max(...waitTimes);

    console.log('\n⏳ Admin Processing Delays:');
    console.log(`   Orders awaiting review: ${awaitingReview.length}`);
    console.log(`   Average wait time: ${avgWait.toFixed(1)} hours`);
    console.log(`   Longest wait: ${maxWait.toFixed(1)} hours`);

    findings.adminDelays = {
      count: awaitingReview.length,
      avgWaitHours: avgWait.toFixed(1),
      maxWaitHours: maxWait.toFixed(1),
      implication: avgWait > 24
        ? '🔴 CRITICAL: Long admin delays may cause user frustration'
        : 'Admin processing seems reasonable'
    };
  }

  // 10. Sample cancelled orders for pattern detection
  console.log('\n📝 Sample Cancelled Orders (first 3):');
  cancelled.slice(0, 3).forEach((order, idx) => {
    console.log(`\n   [${idx + 1}] Order ${order.id.substring(0, 8)}...`);
    console.log(`       Created: ${new Date(order.created_at).toISOString()}`);
    console.log(`       Method: ${order.design_method || 'MISSING'}`);
    console.log(`       Email: ${order.customer_email || 'MISSING'}`);
    console.log(`       Garment: ${order.garment_name || 'MISSING'}`);
    console.log(`       Prompt: ${order.text_prompt ? order.text_prompt.substring(0, 50) + '...' : 'MISSING'}`);
  });

  // Generate report
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📊 KEY FINDINGS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('🔴 SMOKING GUNS (Probable Root Causes):\n');

  const smokingGuns = [];

  if (findings.missingFields && findings.missingFields.ordersAffected > cancelled.length * 0.5) {
    const gun = `1. INCOMPLETE SUBMISSIONS: ${findings.missingFields.ordersAffected}/${cancelled.length} cancelled orders missing required fields`;
    smokingGuns.push(gun);
    console.log(`   ${gun}`);
    console.log(`      → Users abandoning wizard before completion`);
    console.log(`      → Wizard may be too long, confusing, or have validation issues\n`);
  }

  if (findings.timeToCancel && findings.timeToCancel.immediate > cancelled.length * 0.5) {
    const gun = `2. IMMEDIATE ABANDONMENT: ${findings.timeToCancel.immediate}/${cancelled.length} cancelled within 5 minutes`;
    smokingGuns.push(gun);
    console.log(`   ${gun}`);
    console.log(`      → Users cancel right after starting`);
    console.log(`      → Possible causes: unclear pricing, confusing UI, technical errors\n`);
  }

  if (findings.authentication && findings.authentication.anonymous > findings.authentication.loggedIn * 1.5) {
    const gun = `3. AUTHENTICATION BARRIER: ${findings.authentication.anonymous}/${cancelled.length} cancellations from anonymous users`;
    smokingGuns.push(gun);
    console.log(`   ${gun}`);
    console.log(`      → Users don't want to create account`);
    console.log(`      → Consider guest checkout or delayed auth\n`);
  }

  if (findings.adminDelays && parseFloat(findings.adminDelays.avgWaitHours) > 48) {
    const gun = `4. ADMIN DELAYS: Average ${findings.adminDelays.avgWaitHours} hours wait time`;
    smokingGuns.push(gun);
    console.log(`   ${gun}`);
    console.log(`      → Users losing patience waiting for admin`);
    console.log(`      → Need faster turnaround or automated processing\n`);
  }

  if (findings.contactInfo && findings.contactInfo.withoutEmail > cancelled.length * 0.3) {
    const gun = `5. EARLY ABANDONMENT: ${findings.contactInfo.withoutEmail}/${cancelled.length} cancelled without providing email`;
    smokingGuns.push(gun);
    console.log(`   ${gun}`);
    console.log(`      → Users leaving before committing any info`);
    console.log(`      → First impression/value proposition issue\n`);
  }

  console.log('═══════════════════════════════════════════════════════════\n');

  // Save detailed findings
  const reportPath = join(__dirname, '..', 'CANCELLATION_INVESTIGATION.json');
  writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      totalOrders: findings.totalOrders,
      cancelled: findings.cancelled,
      smokingGuns
    },
    findings,
    sampleCancelled: cancelled.slice(0, 10),
    sampleCompleted: completed.slice(0, 10)
  }, null, 2));

  console.log(`✅ Full report saved to: CANCELLATION_INVESTIGATION.json\n`);
}

main().catch(console.error);
