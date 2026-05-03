const mockApiRequest = jest.fn();

let capturedRequestInterceptor = null;
let capturedResponseErrorInterceptor = null;

jest.mock('axios', () => ({
  create: jest.fn(() => {
    const instance = jest.fn((config) => mockApiRequest(config));
    instance.interceptors = {
      request: {
        use: jest.fn((handler) => {
          capturedRequestInterceptor = handler;
        }),
      },
      response: {
        use: jest.fn((_, errorHandler) => {
          capturedResponseErrorInterceptor = errorHandler;
        }),
      },
    };
    instance.get = jest.fn();
    instance.request = mockApiRequest;
    return instance;
  }),
}));

jest.mock('../config/apiBase', () => ({
  getApiBaseUrl: () => 'http://localhost:3001',
}));

const mockClearAuthToken = jest.fn();
const mockGetAuthToken = jest.fn(() => null);

jest.mock('../utils/authStorage', () => ({
  clearAuthToken: (...args) => mockClearAuthToken(...args),
  getAuthToken: (...args) => mockGetAuthToken(...args),
}));

const mockSetPostAuthRedirect = jest.fn();

jest.mock('../utils/authRedirect', () => ({
  setPostAuthRedirect: (...args) => mockSetPostAuthRedirect(...args),
}));

describe('api auth behavior', () => {
  beforeEach(() => {
    jest.resetModules();
    mockApiRequest.mockReset();
    mockClearAuthToken.mockReset();
    mockGetAuthToken.mockReset();
    mockGetAuthToken.mockReturnValue(null);
    mockSetPostAuthRedirect.mockReset();
    capturedRequestInterceptor = null;
    capturedResponseErrorInterceptor = null;
    window.history.pushState({}, '', '/planner?tab=today#focus');
    require('./api');
  });

  test('createOrUpdateUser surfaces a retryable timeout instead of hanging indefinitely', async () => {
    mockApiRequest.mockRejectedValueOnce(Object.assign(new Error('timeout of 12000ms exceeded'), {
      code: 'ECONNABORTED',
    }));

    const { authAPI } = require('./api');

    await expect(authAPI.createOrUpdateUser({
      uid: 'user-1',
      email: 'student@example.com',
      displayName: 'Student',
      photoURL: '',
    })).rejects.toMatchObject({
      message: 'The Medsage account service took too long to respond. Please try again.',
      retryable: true,
      endpoint: '/api/v1/auth/user',
    });

    expect(mockApiRequest).toHaveBeenCalledWith(expect.objectContaining({
      url: '/api/v1/auth/user',
      method: 'POST',
      timeout: 12000,
    }));
  });

  test('401 responses invalidate auth through the shared handler without hard navigation', async () => {
    const { registerAuthInvalidationHandler } = require('./api');
    const onInvalidated = jest.fn();
    registerAuthInvalidationHandler(onInvalidated);

    const error = {
      response: {
        status: 401,
        headers: { 'x-request-id': 'rid-401' },
        data: { error: 'Authentication failed' },
      },
      config: {
        url: '/api/v1/auth/profile',
      },
    };

    await expect(capturedResponseErrorInterceptor(error)).rejects.toBe(error);

    expect(mockClearAuthToken).toHaveBeenCalled();
    expect(mockSetPostAuthRedirect).toHaveBeenCalledWith('/planner?tab=today#focus');
    expect(onInvalidated).toHaveBeenCalledWith({
      endpoint: '/api/v1/auth/profile',
      requestId: 'rid-401',
      reason: 'unauthorized',
    });
  });

  test('auth endpoints do not retry through the legacy contract fallback', async () => {
    const error = {
      response: {
        status: 404,
        headers: {},
        data: { error: 'Not found' },
      },
      config: {
        url: '/api/v1/auth/profile',
      },
    };

    await expect(capturedResponseErrorInterceptor(error)).rejects.toBe(error);
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
