import { describe, it, expect } from 'vitest';
import { getLevelProgress, getXPForLevel, getXPForNextLevel, getLevelName, calculateLevel } from './gamification';

describe('Gamification Logic', () => {
    describe('calculateLevel', () => {
        it('should return level 1 for 0 XP', () => {
            expect(calculateLevel(0)).toBe(1);
        });
        it('should return level 1 for 49 XP', () => {
            expect(calculateLevel(49)).toBe(1);
        });
        it('should return level 2 for 50 XP', () => {
            expect(calculateLevel(50)).toBe(2);
        });
        it('should return level 10 for 2250 XP', () => {
            expect(calculateLevel(2250)).toBe(10);
        });
    });

    describe('getXPForNextLevel', () => {
        it('should return 50 for level 1', () => {
            expect(getXPForNextLevel(1)).toBe(50);
        });
        it('should return 150 for level 2', () => {
            expect(getXPForNextLevel(2)).toBe(150);
        });
    });

    describe('getLevelProgress', () => {
        it('should return 0% for 0 XP at level 1', () => {
            expect(getLevelProgress(0, 1)).toBe(0);
        });
        it('should return 50% for 25 XP at level 1 (0 -> 50)', () => {
            expect(getLevelProgress(25, 1)).toBe(50);
        });
        it('should return 100% for max level', () => {
            expect(getLevelProgress(2500, 10)).toBe(100);
        });
    });
});
