const express = require('express');
const {
  createMessage,
  listMessages,
  deleteMessage,
} = require('../models/message');

const router = express.Router();

function avatarUrl(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
}

// GET /api/chat/messages?limit=50&offset=0  -> liste des messages (paginé)
router.get('/messages', (req, res) => {
  let limit = parseInt(req.query.limit, 10);
  let offset = parseInt(req.query.offset, 10);

  if (Number.isNaN(limit) || limit <= 0) limit = 50;
  if (limit > 100) limit = 100;
  if (Number.isNaN(offset) || offset < 0) offset = 0;

  const { rows, total } = listMessages({ limit, offset });

  res.status(200).json({
    data: rows,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + rows.length < total,
    },
  });
});

// POST /api/chat/messages -> envoyer un message
router.post('/messages', (req, res) => {
  const { authorName, content } = req.body || {};

  if (!authorName || typeof authorName !== 'string' || !authorName.trim()) {
    return res.status(400).json({ error: 'authorName is required' });
  }
  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'content is required' });
  }
  if (content.length > 2000) {
    return res.status(400).json({ error: 'content exceeds max length (2000)' });
  }

  const message = createMessage({
    authorName: authorName.trim(),
    authorAvatar: avatarUrl(authorName.trim()),
    content: content.trim(),
  });

  res.status(201).json({ data: message });
});

// DELETE /api/chat/messages/:id -> supprimer son message
router.delete('/messages/:id', (req, res) => {
  const { id } = req.params;
  const requesterName = (req.body && req.body.authorName) || req.query.authorName;

  if (!requesterName) {
    return res.status(400).json({ error: 'authorName is required to delete a message' });
  }

  const result = deleteMessage(id, requesterName);

  if (result.status === 'not_found') {
    return res.status(404).json({ error: 'message not found' });
  }
  if (result.status === 'forbidden') {
    return res.status(403).json({ error: 'you can only delete your own messages' });
  }

  return res.status(204).send();
});

module.exports = router;
