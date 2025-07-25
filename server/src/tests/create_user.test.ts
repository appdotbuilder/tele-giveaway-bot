
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateUserInput = {
  telegram_id: '123456789',
  username: 'testuser',
  first_name: 'Test',
  last_name: 'User',
  profile_photo_url: 'https://example.com/photo.jpg',
  account_created_at: new Date('2024-01-01'),
  last_activity_at: new Date('2024-01-15'),
  message_count_last_month: 50,
  is_admin: false
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new user', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.telegram_id).toEqual('123456789');
    expect(result.username).toEqual('testuser');
    expect(result.first_name).toEqual('Test');
    expect(result.last_name).toEqual('User');
    expect(result.profile_photo_url).toEqual('https://example.com/photo.jpg');
    expect(result.account_created_at).toEqual(testInput.account_created_at);
    expect(result.last_activity_at).toEqual(testInput.last_activity_at);
    expect(result.message_count_last_month).toEqual(50);
    expect(result.is_admin).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].telegram_id).toEqual('123456789');
    expect(users[0].username).toEqual('testuser');
    expect(users[0].first_name).toEqual('Test');
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should update existing user by telegram_id', async () => {
    // Create initial user
    const initialResult = await createUser(testInput);

    // Update with new data
    const updateInput: CreateUserInput = {
      ...testInput,
      username: 'updateduser',
      first_name: 'Updated',
      message_count_last_month: 75,
      is_admin: true
    };

    const updatedResult = await createUser(updateInput);

    // Should have same ID but updated fields
    expect(updatedResult.id).toEqual(initialResult.id);
    expect(updatedResult.telegram_id).toEqual('123456789');
    expect(updatedResult.username).toEqual('updateduser');
    expect(updatedResult.first_name).toEqual('Updated');
    expect(updatedResult.message_count_last_month).toEqual(75);
    expect(updatedResult.is_admin).toEqual(true);
    expect(updatedResult.updated_at.getTime()).toBeGreaterThan(initialResult.updated_at.getTime());
  });

  it('should handle null values correctly', async () => {
    const nullInput: CreateUserInput = {
      telegram_id: '987654321',
      username: null,
      first_name: 'Minimal',
      last_name: null,
      profile_photo_url: null,
      account_created_at: null,
      last_activity_at: null,
      message_count_last_month: 0,
      is_admin: false
    };

    const result = await createUser(nullInput);

    expect(result.telegram_id).toEqual('987654321');
    expect(result.username).toBeNull();
    expect(result.first_name).toEqual('Minimal');
    expect(result.last_name).toBeNull();
    expect(result.profile_photo_url).toBeNull();
    expect(result.account_created_at).toBeNull();
    expect(result.last_activity_at).toBeNull();
    expect(result.message_count_last_month).toEqual(0);
    expect(result.is_admin).toEqual(false);
  });

  it('should not create duplicate users with same telegram_id', async () => {
    // Create first user
    await createUser(testInput);

    // Create second user with same telegram_id
    const duplicateInput: CreateUserInput = {
      ...testInput,
      username: 'different_username'
    };
    
    await createUser(duplicateInput);

    // Should only have one user in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.telegram_id, '123456789'))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('different_username'); // Should be updated
  });
});
