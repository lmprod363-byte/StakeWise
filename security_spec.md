# Security Specification - StakeWise

## Data Invariants
1. **Ownership**: A user can only read, create, update, or delete data (Bankrolls, Bets, Transactions) that belongs to their specific `uid`.
2. **Relational Integrity**: 
   - A `Bet` must have a `bankrollId` that points to a valid `Bankroll` owned by the user.
   - A `Transaction` must point to a valid `Bankroll` owned by the user.
3. **Immutability**:
   - `userId` field must never change after creation.
   - `createdAt` field must never change after creation.
4. **Validation**:
   - All amounts, odds, and stakes must be positive numbers.
   - Dates must be valid timestamps.
   - Statuses must be within the defined enum sets.

## The "Dirty Dozen" Payloads (Red Team Tests)

1. **Identity Theft (Create)**: Authenticated User A tries to create a Bet with `userId: "UserB"`.
2. **Identity Theft (Update)**: User A tries to update User B's Bet.
3. **Privilege Escalation**: User A tries to change the `userId` of their Bet to `UserB` to "give" it away or hide it.
4. **Bankroll Hijacking**: User A tries to link a Bet to User B's `bankrollId`.
5. **Negative Stake**: User tries to create a Bet with `stake: -100`.
6. **Zero Odds**: User tries to create a Bet with `odds: 0`.
7. **Invalid Status**: User tries to set `status: "mega-win"` (not in enum).
8. **Shadow Field Injection**: User tries to add `isAdmin: true` to their user profile.
9. **Timestamp Spoofing**: User tries to set `createdAt` to a date in 2010.
10. **Resource Exhaustion**: User tries to use a 1MB string as a `betId` or `selection` name.
11. **Outcome Manipulation**: User tries to update the `profit` of a Bet without changing the `status` or vice versa in a way that doesn't follow math (though rules can't do complex math, they can check fields).
12. **Orphaned Writes**: User tries to create a Bet for a `bankrollId` that doesn't exist.

## The Test Runner (Logic Mapping)

The `firestore.rules` will be tested against these invariants using the following logical blocks:
- `isOwner(userId)`: `request.auth.uid == userId`
- `isValidBet(data)`: Validates types, sizes, and enums for Bet documents.
- `isValidBankroll(data)`: Validates types, sizes, and enums for Bankroll documents.
- `isValidTransaction(data)`: Validates types, sizes, and enums for Transaction documents.
