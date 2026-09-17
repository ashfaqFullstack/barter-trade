const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { orderValidation } = require('../../validations');
const { orderController } = require('../../controllers');

const router = express.Router();

router.get('/me', auth(), orderController.getMyOrders);
router.get('/received', auth(), orderController.getReceivedOrders);

router.post('/', auth(), validate(orderValidation.createOrder), orderController.createOrder);
router.patch('/:orderId/complete', auth(), validate(orderValidation.orderIdParam), orderController.completeOrder);
router.patch('/:orderId/cancel', auth(), validate(orderValidation.orderIdParam), orderController.cancelOrder);

module.exports = router;