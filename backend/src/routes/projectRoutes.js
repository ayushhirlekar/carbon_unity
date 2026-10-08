const express = require('express');
const router = express.Router();
const c = require('../controllers/projectController');
const { authenticate } = require('../middleware/auth');

// Role checks live in the controller, because most of these are
// reachable by both a host and a farmer with different meanings.
router.use(authenticate);

// Static paths first — otherwise Express matches 'invitations'
// as a :projectId.
router.get('/invitations/mine', c.myInvitations);
router.post('/invitations/:invitationId/accept', c.acceptInvitation);
router.post('/invitations/:invitationId/decline', c.declineInvitation);

router.get('/', c.listProjects);
router.post('/', c.createProject);

router.get('/:projectId', c.getProject);
router.get('/:projectId/members', c.listMembers);
router.get('/:projectId/requests', c.pendingRequests);
router.post('/:projectId/invite', c.inviteFarmer);
router.post('/:projectId/request', c.requestToJoin);
router.post('/:projectId/members/:farmId/remove', c.removeMember);

module.exports = router;
