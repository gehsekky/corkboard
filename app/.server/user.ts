import { PrismaClient, user } from '@prisma/client';

const prisma = new PrismaClient();

export const createUser = async (email : string, name : string, password : string) : Promise<user | null> => {
  return await prisma.user.create({
    data: {
      email,
      name,
      password_hash: password,
      salt: '',
    }
  });
};

export const updateUser = async () : Promise<void> => {

};

export const getUserByEmail = async (email : string) : Promise<user | null> => {
  return await prisma.user.findUnique({
    where: {
      email,
    }
  });
};

export const login = async (email : string, password : string) : Promise<user | null> => {
  return await prisma.user.findUnique({
    where: {
      email,
      password_hash: password,
    }
  });
};
