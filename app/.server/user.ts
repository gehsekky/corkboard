import { user } from '@prisma/client';
import { prisma } from './db';

export type NormalizedProfile = {
  provider: string;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name: string;
};

export const getUserById = async (id: string): Promise<user | null> => {
  return await prisma.user.findUnique({ where: { id } });
};

export const getUserByEmail = async (email: string): Promise<user | null> => {
  return await prisma.user.findUnique({ where: { email } });
};

export const upsertUserFromIdentity = async (profile: NormalizedProfile): Promise<user> => {
  return await prisma.$transaction(async (tx) => {
    const existingIdentity = await tx.user_identity.findUnique({
      where: {
        provider_provider_user_id: {
          provider: profile.provider,
          provider_user_id: profile.providerUserId,
        },
      },
      include: { user: true },
    });

    if (existingIdentity) {
      if (existingIdentity.email !== profile.email) {
        await tx.user_identity.update({
          where: { id: existingIdentity.id },
          data: { email: profile.email, updated_at: new Date() },
        });
      }
      return existingIdentity.user;
    }

    const existingUser = await tx.user.findUnique({ where: { email: profile.email } });
    if (existingUser) {
      throw new Error(
        `account_exists_unlinked: an account with email ${profile.email} already exists but has no ${profile.provider} identity linked. Sign in with an existing provider, then link ${profile.provider} from settings.`,
      );
    }

    const newUser = await tx.user.create({
      data: {
        email: profile.email,
        name: profile.name || profile.email,
      },
    });
    await tx.user_identity.create({
      data: {
        user_id: newUser.id,
        provider: profile.provider,
        provider_user_id: profile.providerUserId,
        email: profile.email,
      },
    });
    return newUser;
  });
};
