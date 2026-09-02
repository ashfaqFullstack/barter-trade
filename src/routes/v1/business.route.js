const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const upload = require('../../middlewares/upload');
const { businessValidation } = require('../../validations');
const { businessController } = require('../../controllers');

const router = express.Router();

router.post('/profile', auth(), validate(businessValidation.completeProfile), businessController.completeProfile);
router.get('/profile', auth(), businessController.getMyProfile);
router.get('/documents/signature', auth(), businessController.getUploadSignature);
router.post('/documents', auth(), validate(businessValidation.saveDocuments), businessController.saveDocuments);

module.exports = router;