import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load env variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

import { User } from '../src/modules/auth/auth.model.js';
import { Doctor } from '../src/modules/doctor/doctor.model.js';

async function syncVerificationStatus() {
  try {
    // MongoDB connection
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/doctor_appointment';
    console.log('📡 Connecting to MongoDB...');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
    
    // Get all doctors with user data
    const doctors = await Doctor.find().populate('user');
    console.log(`📊 Found ${doctors.length} doctors`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const doctor of doctors) {
      if (!doctor.user) {
        console.log(`⚠️ Doctor ${doctor._id} has no user reference`);
        skipped++;
        continue;
      }
      
      // Check if status needs sync
      if (doctor.verificationStatus !== doctor.user.verificationStatus) {
        await User.findByIdAndUpdate(doctor.user._id, {
          verificationStatus: doctor.verificationStatus,
          verifiedBy: doctor.verifiedBy,
          verifiedAt: doctor.verifiedAt,
          verificationNotes: doctor.verificationNotes,
        });
        updated++;
        console.log(`✅ Synced: ${doctor.user.email} | Doctor: ${doctor.verificationStatus} | User: ${doctor.user.verificationStatus} -> ${doctor.verificationStatus}`);
      } else {
        console.log(`⏭️ Already synced: ${doctor.user.email} -> ${doctor.verificationStatus}`);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total doctors: ${doctors.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`\n✅ Sync complete!`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
syncVerificationStatus();