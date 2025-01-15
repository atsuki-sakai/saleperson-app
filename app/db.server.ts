import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

declare global {
  var __db__: PrismaClient;
}

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
} else {
  if (!global.__db__) {
    global.__db__ = new PrismaClient({
      datasources: {
        db: {
          url: process.env.LOCAL_DATABASE_URL,
        },
      },
    });
  }
  prisma = global.__db__;
  prisma.$connect();
}

export { prisma };
