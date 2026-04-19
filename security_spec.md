# Security Specification - BetStrat

## Data Invariants
1. A Bet MUST belong to the authenticated user (`userId`).
2. A Bet status MUST be one of: 'pending', 'won', 'lost', 'void'.
3. Bankroll values (total, unitSize) MUST be positive numbers.
4. Timestamps (createdAt, updatedAt) MUST be server-validated.
5. Users can only read/write their own data (Settings and Bets).

## The "Dirty Dozen" Payloads (Deny Cases)
1. Creating a bet for another user (`userId` mismatch).
2. Updating a bet's `userId` to steal it or move it.
3. Injecting a massive string (1MB) into the `event` field.
4. Setting a negative `odds` or `stake`.
5. Modifying `createdAt` after the bet was created.
6. Changing bet status to an invalid value like 'cheating'.
7. A user reading all bets in the system (`list` without owner filter).
8. Setting `profit` value that doesn't match the odds/stake (validation check).
9. Updating bankroll `total` without authentication.
10. Using a script to create millions of tiny bets (rate limiting check - handled by quotas, but enforced via ID length).
11. Injecting PII into public fields (if we had public fields).
12. Attempting to update the `winner` status on a settled bet without being the owner.

## Firestore Rules Test Logic
All write operations must pass `isValidBet()` or `isValidUser()`.
All read operations must pass `isOwner()`.
