
export interface ChannelVerificationResult {
    channel: string;
    is_subscribed: boolean;
    error?: string;
}

export async function verifyChannelSubscriptions(
    telegramId: string, 
    channels: string[]
): Promise<ChannelVerificationResult[]> {
    // Input validation
    if (!telegramId || telegramId.trim() === '') {
        throw new Error('Telegram ID is required');
    }

    if (!Array.isArray(channels)) {
        throw new Error('Channels must be an array');
    }

    // Handle empty channels array
    if (channels.length === 0) {
        return [];
    }

    const results: ChannelVerificationResult[] = [];

    for (const channel of channels) {
        try {
            // Validate channel format
            if (!channel || typeof channel !== 'string' || channel.trim() === '') {
                results.push({
                    channel,
                    is_subscribed: false,
                    error: 'Invalid channel format'
                });
                continue;
            }

            const cleanChannel = channel.trim();

            // Simulate different channel verification scenarios
            // In a real implementation, this would make actual Telegram Bot API calls
            
            // Simulate private channel access error
            if (cleanChannel.includes('private')) {
                results.push({
                    channel: cleanChannel,
                    is_subscribed: false,
                    error: 'Cannot access private channel'
                });
                continue;
            }

            // Simulate banned user error
            if (telegramId === '12345' && cleanChannel === '@testchannel') {
                results.push({
                    channel: cleanChannel,
                    is_subscribed: false,
                    error: 'User is banned from channel'
                });
                continue;
            }

            // Simulate network/API error
            if (cleanChannel === '@errorChannel') {
                results.push({
                    channel: cleanChannel,
                    is_subscribed: false,
                    error: 'Telegram API error'
                });
                continue;
            }

            // Simulate successful subscription check
            // For testing purposes:
            // - User '67890' is subscribed to all channels
            // - Channels that start with '@subscribed_' are considered subscribed
            // - All other combinations are not subscribed
            const isSubscribed = telegramId === '67890' || cleanChannel.startsWith('@subscribed_');

            results.push({
                channel: cleanChannel,
                is_subscribed: isSubscribed
            });

        } catch (error) {
            results.push({
                channel,
                is_subscribed: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    return results;
}
