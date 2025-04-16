export function setCorsHeaders(res: Response): Response {
    res.headers.set('Access-Control-Allow-Origin', '*'); // Replace * with your frontend origin if needed
    res.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return res;
}
