
import { type User } from '../schema';

export interface EligibilityResult {
    is_eligible: boolean;
    reasons: string[];
}

export async function applyHeuristicFiltering(user: User): Promise<EligibilityResult> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is applying heuristic rules to filter low-quality accounts
    // Rules to implement:
    // 1. Account age (must be at least 1 month old)
    // 2. Presence of profile picture
    // 3. Recent activity (must have sent at least 10 messages in last month)
    
    const reasons: string[] = [];
    let is_eligible = true;

    // Placeholder logic - real implementation should check actual criteria
    if (!user.account_created_at || user.account_created_at > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
        is_eligible = false;
        reasons.push('Account too new (less than 1 month old)');
    }

    if (!user.profile_photo_url) {
        is_eligible = false;
        reasons.push('No profile picture');
    }

    if (user.message_count_last_month < 10) {
        is_eligible = false;
        reasons.push('Insufficient recent activity (less than 10 messages in last month)');
    }

    if (is_eligible) {
        reasons.push('Account meets all eligibility criteria');
    }

    return Promise.resolve({
        is_eligible,
        reasons
    });
}
