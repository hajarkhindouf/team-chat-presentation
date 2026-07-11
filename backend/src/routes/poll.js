const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/connection');
const { createMessage } = require('../models/message');

const router = express.Router();

// POST /api/chat/polls -> créer un poll (Question + 2 à 10 options)
router.post('/polls', (req, res) => {
  const { authorName, question, options } = req.body || {};

  if (!authorName || !authorName.trim()) {
    return res.status(400).json({ error: 'authorName is required' });
  }
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }
  if (!Array.isArray(options) || options.length < 2 || options.length > 10) {
    return res.status(400).json({ error: 'options must contain between 2 and 10 items' });
  }
  if (options.some((o) => typeof o !== 'string' || !o.trim())) {
    return res.status(400).json({ error: 'each option must be a non-empty string' });
  }

  const db = getDb();

  // A poll is represented in the timeline as a chat message
  const message = createMessage({
    authorName: authorName.trim(),
    content: `📊 ${question.trim()}`,
  });

  const pollId = uuidv4();
  db.prepare('INSERT INTO polls (id, message_id, question) VALUES (?, ?, ?)').run(
    pollId,
    message.id,
    question.trim()
  );

  const insertOption = db.prepare('INSERT INTO poll_options (id, poll_id, label) VALUES (?, ?, ?)');
  const optionRows = options.map((label) => {
    const optionId = uuidv4();
    insertOption.run(optionId, pollId, label.trim());
    return { id: optionId, label: label.trim(), votes: 0 };
  });

  res.status(201).json({
    data: {
      id: pollId,
      messageId: message.id,
      question: question.trim(),
      options: optionRows,
    },
  });
});

// POST /api/chat/polls/:id/vote -> voter pour une option
router.post('/polls/:id/vote', (req, res) => {
  const { id } = req.params;
  const { optionId, voterName } = req.body || {};

  if (!optionId || !voterName) {
    return res.status(400).json({ error: 'optionId and voterName are required' });
  }

  const db = getDb();
  const option = db
    .prepare('SELECT * FROM poll_options WHERE id = ? AND poll_id = ?')
    .get(optionId, id);

  if (!option) {
    return res.status(404).json({ error: 'poll or option not found' });
  }

  try {
    db.prepare('INSERT INTO poll_votes (id, option_id, voter_name) VALUES (?, ?, ?)').run(
      uuidv4(),
      optionId,
      voterName
    );
  } catch (err) {
    return res.status(409).json({ error: 'you already voted for this option' });
  }

  return res.status(201).json({ data: { optionId, voterName } });
});

// GET /api/chat/polls/:id -> résultats d'un poll
router.get('/polls/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(id);
  if (!poll) return res.status(404).json({ error: 'poll not found' });

  const options = db
    .prepare(`
      SELECT po.id, po.label, COUNT(pv.id) AS votes
      FROM poll_options po
      LEFT JOIN poll_votes pv ON pv.option_id = po.id
      WHERE po.poll_id = ?
      GROUP BY po.id
    `)
    .all(id);

  res.status(200).json({ data: { ...poll, options } });
});

module.exports = router;
