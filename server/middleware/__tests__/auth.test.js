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
    process.env.GOOGLE_CLIENT_ID = 'client-123';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete global.fetch;
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
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        sub: 'user-1',
        email: 'student@example.com',
        name: 'Student One',
        picture: 'https://example.com/u.png',
        aud: 'client-123',
        exp: `${Math.floor(Date.now() / 1000) + 3600}`,
      }),
    });

    const { verifyToken } = require('../auth');
    const req = { headers: { authorization: 'Bearer good-token' }, id: 'rid-2', path: '/api/v1/study/plan' };
    const res = createRes();
    const next = jest.fn();

    await verifyToken(req, res, next);

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
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error_description: 'Token invalid' }),
    });

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
});
