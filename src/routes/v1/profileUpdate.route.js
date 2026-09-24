const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { profileUpdateValidation } = require('../../validations');
const { profileUpdateController } = require('../../controllers');

const router = express.Router();

router.get('/me', auth(), profileUpdateController.getMyPendingRequest);
router.post('/', auth(), validate(profileUpdateValidation.createRequest), profileUpdateController.createRequest);

module.exports = router;