import { describe, it, expect } from 'vitest';
import { extractUsernameFromEmail } from '../../src/services/authService.js';

describe('authService.js (pure functions)', () => {
    describe('extractUsernameFromEmail', () => {
        it('extracts username before @ symbol', () => {
            expect(extractUsernameFromEmail('john.doe@example.com')).toBe('John Doe');
        });

        it('handles simple email without dots', () => {
            expect(extractUsernameFromEmail('johndoe@example.com')).toBe('Johndoe');
        });

        it('replaces dots with spaces', () => {
            expect(extractUsernameFromEmail('first.last@example.com')).toBe('First Last');
        });

        it('replaces underscores with spaces', () => {
            expect(extractUsernameFromEmail('first_last@example.com')).toBe('First Last');
        });

        it('replaces hyphens with spaces', () => {
            expect(extractUsernameFromEmail('first-last@example.com')).toBe('First Last');
        });

        it('capitalizes first letter of each word', () => {
            expect(extractUsernameFromEmail('john.doe.smith@example.com')).toBe('John Doe Smith');
        });

        it('handles mixed separators', () => {
            expect(extractUsernameFromEmail('john.doe-smith_jones@example.com')).toBe('John Doe Smith Jones');
        });

        it('returns empty string for null input', () => {
            expect(extractUsernameFromEmail(null)).toBe('');
        });

        it('returns empty string for undefined input', () => {
            expect(extractUsernameFromEmail(undefined)).toBe('');
        });

        it('returns empty string for empty string', () => {
            expect(extractUsernameFromEmail('')).toBe('');
        });

        it('handles email without @ symbol (returns whole string)', () => {
            expect(extractUsernameFromEmail('johndoe')).toBe('Johndoe');
        });

        it('handles email with only @ prefix', () => {
            expect(extractUsernameFromEmail('@example.com')).toBe('');
        });

        it('handles multiple @ symbols (uses first)', () => {
            expect(extractUsernameFromEmail('john@doe@example.com')).toBe('John');
        });

        it('handles consecutive separators', () => {
            expect(extractUsernameFromEmail('john..doe@example.com')).toBe('John  Doe');
        });

        it('handles numbers in email', () => {
            expect(extractUsernameFromEmail('john123@example.com')).toBe('John123');
        });

        it('preserves capitalization after first letter', () => {
            expect(extractUsernameFromEmail('john.doe@example.com')).toBe('John Doe');
            expect(extractUsernameFromEmail('JOHN.DOE@example.com')).toBe('JOHN DOE');
        });
    });
});
