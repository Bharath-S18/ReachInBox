import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seedSender = {
  name: 'Ethereal Demo Sender',
  email: process.env.ETHEREAL_USER ?? 'demo@example.com',
  host: process.env.ETHEREAL_HOST ?? 'smtp.ethereal.email',
  port: Number(process.env.ETHEREAL_PORT ?? 587),
  username: process.env.ETHEREAL_USER ?? 'demo@example.com',
  password: process.env.ETHEREAL_PASS ?? 'replace-me',
  hourlyLimit: Number(process.env.MAX_EMAILS_PER_HOUR ?? 50),
};

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'demo@reachinbox.local' },
    update: { name: 'ReachInbox Demo User' },
    create: {
      email: 'demo@reachinbox.local',
      name: 'ReachInbox Demo User',
    },
  });

  await prisma.senderAccount.upsert({
    where: { id: 'demo-ethereal-sender' },
    update: { ...seedSender, userId: user.id },
    create: { id: 'demo-ethereal-sender', ...seedSender, userId: user.id },
  });
}

main()
  .catch((error) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
