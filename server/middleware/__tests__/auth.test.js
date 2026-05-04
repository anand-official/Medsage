const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn(() => ({
    verifyIdToken: (...args) => mockVerifyIdToken(...args),
  })),
}));

jest.mock('../../utils/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('auth middleware', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useRealTimers();
    process.env.GOOGLE_CLIENT_ID = 'client-123';
    mockVerifyIdToken.mockReset();
  });

  afterEach(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    jest.useRealTimers();
  });

  test('verifyToken returns requestId-aware error when token is missing', async () => {
    const { verifyToken } = require('../auth');
    const req = { headers: {}, id: 'rid-1' };
    const res = createRes();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_MISSING_TOKEN',
      requestId: 'rid-1',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('verifyToken attaches decoded user when token is valid', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'user-1',
        email: 'student@example.com',
        name: 'Student One',
        picture: 'https://example.com/u.png',
        aud: 'client-123',
        iss: 'https://accounts.google.com',
        email_verified: true,
        exp: `${Math.floor(Date.now() / 1000) + 3600}`,
      }),
    });

    const { verifyToken } = require('../auth');
    const req = { headers: { authorization: 'Bearer good-token' }, id: 'rid-2', path: '/api/v1/study/plan' };
    const res = createRes();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(mockVerifyIdToken).toHaveBeenCalledWith({
      idToken: 'good-token',
      audience: 'client-123',
    });
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      uid: 'user-1',
      email: 'student@example.com',
      displayName: 'Student One',
      photoURL: 'https://example.com/u.png',
      admin: false,
    });
  });

  test('verifyToken normalizes invalid token failures', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Invalid token signature'));

    const { verifyToken } = require('../auth');
    const req = { headers: { authorization: 'Bearer bad-token' }, id: 'rid-3', path: '/api/v1/study/plan' };
    const res = createRes();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_INVALID_TOKEN',
      requestId: 'rid-3',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('verifyToken rejects audience mismatches', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Wrong recipient, payload audience != requiredAudience'));

    const { verifyToken } = require('../auth');
    const req = { headers: { authorization: 'Bearer mismatch-token' }, id: 'rid-4', path: '/api/v1/study/plan' };
    const res = createRes();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_AUDIENCE_MISMATCH',
      requestId: 'rid-4',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('verifyToken rejects expired tokens', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Token used too late'));

    const { verifyToken } = require('../auth');
    const req = { headers: { authorization: 'Bearer expired-token' }, id: 'rid-5', path: '/api/v1/study/plan' };
    const res = createRes();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_TOKEN_EXPIRED',
      requestId: 'rid-5',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('verifyToken fails closed when GOOGLE_CLIENT_ID is missing', async () => {
    delete process.env.GOOGLE_CLIENT_ID;

    const { verifyToken } = require('../auth');
    const req = { headers: { authorization: 'Bearer any-token' }, id: 'rid-6', path: '/api/v1/study/plan' };
    const res = createRes();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Authentication is temporarily unavailable',
      code: 'AUTH_MISCONFIGURED',
      requestId: 'rid-6',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('verifyToken does not special-case the removed local dev token path', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Invalid token signature'));

    const { verifyToken } = require('../auth');
    const req = {
      headers: { authorization: 'Bearer medsage-local-dev-token' },
      id: 'rid-7',
      path: '/api/v1/study/plan',
    };
    const res = createRes();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(mockVerifyIdToken).toHaveBeenCalledWith({
      idToken: 'medsage-local-dev-token',
      audience: 'client-123',
    });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('verifyToken returns a retryable auth outage when Google verification times out', async () => {
    jest.useFakeTimers();
    mockVerifyIdToken.mockImplementation(() => new Promise(() => {}));

    const { verifyToken } = require('../auth');
    const req = { headers: { authorization: 'Bearer slow-token' }, id: 'rid-8', path: '/api/v1/study/plan' };
    const res = createRes();
    const next = jest.fn();

    const pendingVerification = verifyToken(req, res, next);
    await jest.advanceTimersByTimeAsync(8000);
    await pendingVerification;

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Authentication is temporarily unavailable',
      code: 'AUTH_UNAVAILABLE',
      requestId: 'rid-8',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
