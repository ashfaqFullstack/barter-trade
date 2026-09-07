const config = require("../config/config");

const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
};

const setAuthCookies = (res, tokens) => {
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
};

module.exports = { setAuthCookies, clearAuthCookies };