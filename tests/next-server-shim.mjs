const WebResponse = global.Response;
const WebHeaders = global.Headers;

export function after(callback) {
  try {
    const result = callback();
    if (result && typeof result.then === 'function') {
      result.catch(() => {});
    }
  } catch {
    // Route contract tests should validate the HTTP response path, not fail on
    // background post-response hooks that are production-runtime concerns.
  }
}

export class NextResponse extends WebResponse {
  static json(body, init = {}) {
    const headers = new WebHeaders(init.headers || {});
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }

    return new WebResponse(JSON.stringify(body), {
      ...init,
      headers
    });
  }
}
