import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { supabase } from '../../src/services/supabaseClient.js';

describe('supabaseClient', () => {
  it('should export supabase client', () => {
    expect(supabase).toBeDefined();
    expect(typeof supabase).toBe('object');
  });

  it('should have auth property', () => {
    expect(supabase.auth).toBeDefined();
    expect(typeof supabase.auth).toBe('object');
  });

  it('should have from property', () => {
    expect(supabase.from).toBeDefined();
    expect(typeof supabase.from).toBe('function');
  });

  it('should have storage property', () => {
    expect(supabase.storage).toBeDefined();
    expect(typeof supabase.storage).toBe('object');
  });
});
