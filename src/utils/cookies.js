const config = require("../config/config");

const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
};

const legacyCookieOptions = {
    ...cookieOptions,
    path: '/api/backend/auth',
};

const setAuthCookies = (res, tokens) => {
    res.clearCookie('accessToken', legacyCookieOptions);
    res.clearCookie('refreshToken', legacyCookieOptions);
    res.cookie('accessToken', tokens.access.token, {
        ...cookieOptions,
        expires: new Date(tokens.access.expires),
    });
    res.cookie('refreshToken', tokens.refresh.token, {
        ...cookieOptions,
        expires: new Date(tokens.refresh.expires),
    });
};

const clearAuthCookies = (res) => {
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
    res.clearCookie('accessToken', legacyCookieOptions);
    res.clearCookie('refreshToken', legacyCookieOptions);
};

module.exports = { setAuthCookies, clearAuthCookies };