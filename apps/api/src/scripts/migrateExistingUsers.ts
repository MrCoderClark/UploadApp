/**
 * Migration Script: Add FREE subscriptions to existing users
 * Run this once to migrate existing users who registered before subscriptions were added
 */

import prisma from '../lib/prisma';
import { subscriptionService } from '../services/subscription.service';

async function migrateExistingUsers() {
  console.log('🔄 Starting migration: Adding subscriptions to existing users...\n');

  try {
    // Find all users without a subscription
    const usersWithoutSubscription = await prisma.user.findMany({
      where: {
        subscription: null,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    console.log(`📊 Found ${usersWithoutSubscription.length} users without subscriptions\n`);

    if (usersWithoutSubscription.length === 0) {
      console.log('✅ All users already have subscriptions!');
      return;
    }

    // Create FREE subscription for each user
    let successCount = 0;
    let errorCount = 0;

    for (const user of usersWithoutSubscription) {
      try {
        await subscriptionService.createFreeSubscription(user.id);
        console.log(`✅ Created FREE subscription for: ${user.email}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to create subscription for ${user.email}:`, error);
        errorCount++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📊 Total: ${usersWithoutSubscription.length}`);
    console.log('\n✨ Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateExistingUsers()
  .then(() => {
    console.log('\n👋 Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration error:', error);
    process.exit(1);
  });
