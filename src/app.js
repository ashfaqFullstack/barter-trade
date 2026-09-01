const express = require('express');
const cors = require('cors')
const helmet = require('helmet');
const { errorConverter, errorHandler } = require('./middlewares/error');
const ApiError = require('./utils/ApiError');
const httpStatus = require('http-status').default;
const routes = require('./routes/v1');
const passport = require('passport');
const { jwtStrategy } = require('./config/passport');

const app = express();
// secure headers and prevents header attacks */ Memory leaks
app.use(helmet());

// parse json request body 
app.use(express.json());

// cors origin security
app.use(cors());

app.use(passport.initialize());
passport.use('jwt', jwtStrategy)


// Api routes 👥
app.use('/v1', routes)


// error handling middleware */ will be under the routes always 👍

// 404 Not Found Api error for not existing Api route 🚫
app.use((req, res, next) => {
    next(new ApiError(httpStatus.NOT_FOUND, "Api route Not found 🚫"))
})

// if not api error then convert it to a error state shape 🔁
app.use(errorConverter);

// global error handler middleware
app.use(errorHandler);

module.exports = app