import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Initializing Supabase seed...');

  const user = await prisma.user.upsert({
    where: { email: 'demo@reachinbox.local' },
    update: { name: 'ReachInbox Demo User' },
    create: {
      email: 'demo@reachinbox.local',
      name: 'ReachInbox Demo User',
    },
  });

  let etherealUser = process.env.ETHEREAL_USER;
  let etherealPass = process.env.ETHEREAL_PASS;
  let etherealHost = process.env.ETHEREAL_HOST || 'smtp.ethereal.email';
  let etherealPort = Number(process.env.ETHEREAL_PORT || 587);

  if (!etherealUser || !etherealPass || etherealPass === 'replace-me') {
    console.log('[Seed] Auto-provisioning genuine Ethereal SMTP test account via nodemailer...');
    const testAccount = await nodemailer.createTestAccount();
    etherealUser = testAccount.user;
    etherealPass = testAccount.pass;
    etherealHost = testAccount.smtp.host;
    etherealPort = testAccount.smtp.port;
    console.log(`[Seed] Provisioned Ethereal account: ${etherealUser}`);
  }

  const seedSender = {
    name: 'Ethereal Demo Sender',
    email: etherealUser,
    host: etherealHost,
    port: etherealPort,
    username: etherealUser,
    password: etherealPass,
    hourlyLimit: Number(process.env.MAX_EMAILS_PER_HOUR ?? 50),
  };

  await prisma.senderAccount.upsert({
    where: { id: 'demo-ethereal-sender' },
    update: { ...seedSender, userId: user.id },
    create: { id: 'demo-ethereal-sender', ...seedSender, userId: user.id },
  });

  // Repair any invalid placeholder sender accounts in the database
  const updatedCount = await prisma.senderAccount.updateMany({
    where: {
      OR: [
        { password: 'replace-me' },
        { email: 'demo@example.com' },
        { username: 'demo@example.com' },
      ],
    },
    data: {
      email: etherealUser,
      username: etherealUser,
      password: etherealPass,
      host: etherealHost,
      port: etherealPort,
    },
  });

  if (updatedCount.count > 0) {
    console.log(`[Seed] Updated ${updatedCount.count} legacy placeholder sender accounts to valid Ethereal credentials.`);
  }

  console.log('[Seed] Database successfully seeded with active Ethereal SMTP credentials.');
}

main()
  .catch((error) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
