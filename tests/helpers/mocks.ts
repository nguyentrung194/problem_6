import { Request, Response } from 'express';
import { UserPayload } from '../../src/types/index.ts';

export const createMockRequest = (overrides?: Partial<Request>): Partial<Request> => {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    ip: '127.0.0.1',
    get: jest.fn(),
    ...overrides,
  };
};

export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  };
  return res;
};

export const createMockNext = () => jest.fn();

export const createAuthenticatedRequest = (
  user: UserPayload,
  overrides?: Partial<Request>
): Partial<Request> & { user: UserPayload } => {
  return {
    ...createMockRequest(overrides),
    user,
  } as Partial<Request> & { user: UserPayload };
};
