
import { type User } from '../schema';

export interface EligibilityResult {
    is_eligible: boolean;
    reasons: string[];
}

export async function applyHeuristicFiltering(user: User): Promise<EligibilityResult> {
    const reasons: string[] = [];
    let is_eligible = true;

    // Rule 1: Account age (must be at least 1 month old)
    if (!user.account_created_at) {
        is_eligible = false;
        reasons.push('Account creation date unknown');
    } else {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        if (user.account_created_at > oneMonthAgo) {
            is_eligible = false;
            reasons.push('Account too new (less than 1 month old)');
        }
    }

    // Rule 2: Presence of profile picture
    if (!user.profile_photo_url) {
        is_eligible = false;
        reasons.push('No profile picture');
    }

    // Rule 3: Recent activity (must have sent at least 10 messages in last month)
    if (user.message_count_last_month < 10) {
        is_eligible = false;
        reasons.push('Insufficient recent activity (less than 10 messages in last month)');
    }

    // If all criteria are met, add positive reason
    if (is_eligible) {
        reasons.push('Account meets all eligibility criteria');
    }

    return {
        is_eligible,
        reasons
    };
}
