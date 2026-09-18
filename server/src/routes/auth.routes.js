const express = require('express');
const validateBody = require('../middleware/validateBody');
const authGuard = require('../middleware/authGuard');
const { acceptInviteSchema, signupSchema, loginSchema } = require('../validators/auth.validators');
const { acceptInvite, signup, login, logout, getMe } = require('../controllers/auth.controller');

const router = express.Router();

// Public routes
router.post('/accept-invite', validateBody(acceptInviteSchema), acceptInvite);
router.post('/signup', validateBody(signupSchema), signup);
router.post('/login', validateBody(loginSchema), login);
router.post('/logout', logout);

// Protected route
router.get('/me', authGuard, getMe);

module.exports = router;
