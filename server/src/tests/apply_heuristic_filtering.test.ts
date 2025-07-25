
import { describe, expect, it } from 'bun:test';
import { applyHeuristicFiltering } from '../handlers/apply_heuristic_filtering';
import { type User } from '../schema';

// Helper to create a base user with all required fields
const createTestUser = (overrides: Partial<User> = {}): User => ({
    id: 1,
    telegram_id: '123456789',
    username: 'testuser',
    first_name: 'Test',
    last_name: 'User',
    profile_photo_url: 'https://example.com/photo.jpg',
    account_created_at: new Date('2023-01-01'),
    last_activity_at: new Date(),
    message_count_last_month: 15,
    is_admin: false,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
});

describe('applyHeuristicFiltering', () => {
    it('should mark eligible user as eligible', async () => {
        const user = createTestUser({
            account_created_at: new Date('2023-01-01'), // Old enough account
            profile_photo_url: 'https://example.com/photo.jpg',
            message_count_last_month: 15
        });

        const result = await applyHeuristicFiltering(user);

        expect(result.is_eligible).toBe(true);
        expect(result.reasons).toContain('Account meets all eligibility criteria');
    });

    it('should reject user with no account creation date', async () => {
        const user = createTestUser({
            account_created_at: null
        });

        const result = await applyHeuristicFiltering(user);

        expect(result.is_eligible).toBe(false);
        expect(result.reasons).toContain('Account creation date unknown');
    });

    it('should reject user with account too new', async () => {
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 15); // 15 days ago

        const user = createTestUser({
            account_created_at: recentDate
        });

        const result = await applyHeuristicFiltering(user);

        expect(result.is_eligible).toBe(false);
        expect(result.reasons).toContain('Account too new (less than 1 month old)');
    });

    it('should reject user with no profile picture', async () => {
        const user = createTestUser({
            profile_photo_url: null
        });

        const result = await applyHeuristicFiltering(user);

        expect(result.is_eligible).toBe(false);
        expect(result.reasons).toContain('No profile picture');
    });

    it('should reject user with insufficient message count', async () => {
        const user = createTestUser({
            message_count_last_month: 5
        });

        const result = await applyHeuristicFiltering(user);

        expect(result.is_eligible).toBe(false);
        expect(result.reasons).toContain('Insufficient recent activity (less than 10 messages in last month)');
    });

    it('should handle user with exactly 10 messages as eligible', async () => {
        const user = createTestUser({
            message_count_last_month: 10
        });

        const result = await applyHeuristicFiltering(user);

        expect(result.is_eligible).toBe(true);
        expect(result.reasons).toContain('Account meets all eligibility criteria');
    });

    it('should accumulate multiple ineligibility reasons', async () => {
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 10); // 10 days ago

        const user = createTestUser({
            account_created_at: recentDate,
            profile_photo_url: null,
            message_count_last_month: 3
        });

        const result = await applyHeuristicFiltering(user);

        expect(result.is_eligible).toBe(false);
        expect(result.reasons).toHaveLength(3);
        expect(result.reasons).toContain('Account too new (less than 1 month old)');
        expect(result.reasons).toContain('No profile picture');
        expect(result.reasons).toContain('Insufficient recent activity (less than 10 messages in last month)');
    });

    it('should handle edge case of exactly one month old account', async () => {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const user = createTestUser({
            account_created_at: oneMonthAgo
        });

        const result = await applyHeuristicFiltering(user);

        expect(result.is_eligible).toBe(true);
        expect(result.reasons).toContain('Account meets all eligibility criteria');
    });

    it('should handle user with zero messages as ineligible', async () => {
        const user = createTestUser({
            message_count_last_month: 0
        });

        const result = await applyHeuristicFiltering(user);

        expect(result.is_eligible).toBe(false);
        expect(result.reasons).toContain('Insufficient recent activity (less than 10 messages in last month)');
    });
});
