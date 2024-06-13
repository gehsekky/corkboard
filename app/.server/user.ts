import { PrismaClient, user } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export const generateSalt = (rounds : number = 16) : string => {
  return crypto.randomBytes(Math.ceil(rounds / 2)).toString('hex').slice(0, rounds);
};

export const hashPassword = (password : string , salt : string) => {
  const hash = crypto.createHmac('sha512', salt);
  hash.update(password);
  return hash.digest('hex');
};

export const createUser = async (email : string, name : string, password : string) : Promise<user | null> => {
  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  return await prisma.user.create({
    data: {
      email,
      name,
      password_hash: passwordHash,
      salt,
    }
  });
};

export const getUserByEmail = async (email : string) : Promise<user | null> => {
  return await prisma.user.findUnique({
    where: {
      email,
    }
  });
};

export const login = async (email : string, password : string) : Promise<user | null> => {
  return await prisma.$transaction(async (tx) => {
    const user = await prisma.user.findUnique({
      where: {
        email,
      }
    });
    if (!user) {
      return null;
    }
    if (hashPassword(password, user.salt) === user.password_hash) {
      return user;
    }

    return null;
  });
};
