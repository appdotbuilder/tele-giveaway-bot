
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Check if user already exists by telegram_id
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.telegram_id, input.telegram_id))
      .execute();

    if (existingUsers.length > 0) {
      // Update existing user
      const result = await db.update(usersTable)
        .set({
          username: input.username,
          first_name: input.first_name,
          last_name: input.last_name,
          profile_photo_url: input.profile_photo_url,
          account_created_at: input.account_created_at,
          last_activity_at: input.last_activity_at,
          message_count_last_month: input.message_count_last_month,
          is_admin: input.is_admin,
          updated_at: new Date()
        })
        .where(eq(usersTable.telegram_id, input.telegram_id))
        .returning()
        .execute();

      return result[0];
    } else {
      // Create new user
      const result = await db.insert(usersTable)
        .values({
          telegram_id: input.telegram_id,
          username: input.username,
          first_name: input.first_name,
          last_name: input.last_name,
          profile_photo_url: input.profile_photo_url,
          account_created_at: input.account_created_at,
          last_activity_at: input.last_activity_at,
          message_count_last_month: input.message_count_last_month,
          is_admin: input.is_admin
        })
        .returning()
        .execute();

      return result[0];
    }
  } catch (error) {
    console.error('User creation/update failed:', error);
    throw error;
  }
};
