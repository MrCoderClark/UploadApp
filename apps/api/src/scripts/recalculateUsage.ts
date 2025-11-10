/**
 * Migration Script: Recalculate usage for existing uploads
 * Run this to sync subscription usage with existing uploaded files
 */

import prisma from '../lib/prisma';

async function recalculateUsage() {
  console.log('🔄 Starting usage recalculation...\n');

  try {
    // Get all subscriptions
    const subscriptions = await prisma.subscription.findMany({
      include: {
        user: {
          include: {
            uploads: {
              where: {
                deletedAt: null, // Only count non-deleted files
              },
            },
          },
        },
      },
    });

    console.log(`📊 Found ${subscriptions.length} subscriptions to recalculate\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const subscription of subscriptions) {
      try {
        if (!subscription.user) {
          console.log(`⚠️  Skipping subscription ${subscription.id} (no user)`);
          continue;
        }

        const uploads = subscription.user.uploads;
        
        // Calculate total storage used
        const totalStorage = uploads.reduce((sum, upload) => sum + BigInt(upload.size), BigInt(0));
        
        // Count total uploads
        const totalUploads = uploads.length;

        // Update subscription
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            storageUsed: totalStorage,
            uploadsUsed: totalUploads,
          },
        });

        console.log(`✅ ${subscription.user.email}:`);
        console.log(`   📦 Storage: ${Number(totalStorage).toLocaleString()} bytes`);
        console.log(`   📤 Uploads: ${totalUploads}`);
        
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to recalculate for subscription ${subscription.id}:`, error);
        errorCount++;
      }
    }

    console.log('\n📈 Recalculation Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📊 Total: ${subscriptions.length}`);
    console.log('\n✨ Recalculation complete!');

  } catch (error) {
    console.error('❌ Recalculation failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the recalculation
recalculateUsage()
  .then(() => {
    console.log('\n👋 Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Recalculation error:', error);
    process.exit(1);
  });
