
import { describe, expect, it } from 'bun:test';
import { verifyChannelSubscriptions, type ChannelVerificationResult } from '../handlers/verify_channel_subscriptions';

describe('verifyChannelSubscriptions', () => {
    it('should return empty array for empty channels', async () => {
        const result = await verifyChannelSubscriptions('123456', []);
        expect(result).toEqual([]);
    });

    it('should verify single channel subscription', async () => {
        const result = await verifyChannelSubscriptions('67890', ['@testchannel']);
        
        expect(result).toHaveLength(1);
        expect(result[0].channel).toEqual('@testchannel');
        expect(result[0].is_subscribed).toBe(true);
        expect(result[0].error).toBeUndefined();
    });

    it('should verify multiple channels', async () => {
        const channels = ['@subscribed_channel', '@not_subscribed', '@subscribed_another'];
        const result = await verifyChannelSubscriptions('123456', channels);
        
        expect(result).toHaveLength(3);
        
        // First channel should be subscribed (starts with '@subscribed_')
        expect(result[0].channel).toEqual('@subscribed_channel');
        expect(result[0].is_subscribed).toBe(true);
        expect(result[0].error).toBeUndefined();
        
        // Second channel should not be subscribed
        expect(result[1].channel).toEqual('@not_subscribed');
        expect(result[1].is_subscribed).toBe(false);
        expect(result[1].error).toBeUndefined();
        
        // Third channel should be subscribed (starts with '@subscribed_')
        expect(result[2].channel).toEqual('@subscribed_another');
        expect(result[2].is_subscribed).toBe(true);
        expect(result[2].error).toBeUndefined();
    });

    it('should handle private channel access error', async () => {
        const result = await verifyChannelSubscriptions('123456', ['@private_channel']);
        
        expect(result).toHaveLength(1);
        expect(result[0].channel).toEqual('@private_channel');
        expect(result[0].is_subscribed).toBe(false);
        expect(result[0].error).toEqual('Cannot access private channel');
    });

    it('should handle banned user error', async () => {
        const result = await verifyChannelSubscriptions('12345', ['@testchannel']);
        
        expect(result).toHaveLength(1);
        expect(result[0].channel).toEqual('@testchannel');
        expect(result[0].is_subscribed).toBe(false);
        expect(result[0].error).toEqual('User is banned from channel');
    });

    it('should handle API error', async () => {
        const result = await verifyChannelSubscriptions('123456', ['@errorChannel']);
        
        expect(result).toHaveLength(1);
        expect(result[0].channel).toEqual('@errorChannel');
        expect(result[0].is_subscribed).toBe(false);
        expect(result[0].error).toEqual('Telegram API error');
    });

    it('should handle invalid channel formats', async () => {
        const channels = ['', '   ', null as any, undefined as any];
        const result = await verifyChannelSubscriptions('123456', channels);
        
        expect(result).toHaveLength(4);
        
        result.forEach((channelResult) => {
            expect(channelResult.is_subscribed).toBe(false);
            expect(channelResult.error).toEqual('Invalid channel format');
        });
    });

    it('should trim whitespace from channels', async () => {
        const result = await verifyChannelSubscriptions('67890', ['  @testchannel  ']);
        
        expect(result).toHaveLength(1);
        expect(result[0].channel).toEqual('@testchannel');
        expect(result[0].is_subscribed).toBe(true);
    });

    it('should handle mixed success and error cases', async () => {
        const channels = ['@subscribed_channel', '@private_error', '@errorChannel', '@normal_channel'];
        const result = await verifyChannelSubscriptions('123456', channels);
        
        expect(result).toHaveLength(4);
        
        // First channel - subscribed
        expect(result[0].is_subscribed).toBe(true);
        expect(result[0].error).toBeUndefined();
        
        // Second channel - private error
        expect(result[1].is_subscribed).toBe(false);
        expect(result[1].error).toEqual('Cannot access private channel');
        
        // Third channel - API error
        expect(result[2].is_subscribed).toBe(false);
        expect(result[2].error).toEqual('Telegram API error');
        
        // Fourth channel - not subscribed
        expect(result[3].is_subscribed).toBe(false);
        expect(result[3].error).toBeUndefined();
    });

    it('should throw error for invalid telegram ID', async () => {
        await expect(verifyChannelSubscriptions('', ['@testchannel'])).rejects.toThrow(/telegram id is required/i);
        await expect(verifyChannelSubscriptions('   ', ['@testchannel'])).rejects.toThrow(/telegram id is required/i);
    });

    it('should throw error for non-array channels', async () => {
        await expect(verifyChannelSubscriptions('123456', null as any)).rejects.toThrow(/channels must be an array/i);
        await expect(verifyChannelSubscriptions('123456', '@channel' as any)).rejects.toThrow(/channels must be an array/i);
    });
});
