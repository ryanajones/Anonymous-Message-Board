/* eslint-disable camelcase */
const { json } = require('body-parser');
const mongoose = require('mongoose');

mongoose.set('useFindAndModify', false);

// Mongoose schema
const { Schema } = mongoose;

const threadSchema = new Schema({
  board: { type: String, required: true },
  text: { type: String, required: true },
  created_on: { type: Date, required: true, default: new Date().toUTCString() },
  bumped_on: { type: Date, required: true, default: new Date().toUTCString() },
  reported: { type: Boolean, required: true, default: false },
  delete_password: { type: String, required: true },
  replies: { type: [String], default: [], required: true },
});

const Threads = mongoose.model('threads', threadSchema);

// Database new thread
const newThread = (board, text, delete_password) => {
  const saveThread = new Threads({
    board,
    text,
    delete_password,
  });
  return saveThread.save();
};

// Database find all threads for specific board
const getThreads = (board) =>
  Threads.find({ board }).then((res) => {
    const sortedThreads = res.sort((a, b) => a.created_on - b.created_on);
    const reduceThreadCount = [];
    sortedThreads.forEach((el, i) => {
      if (i < 10) reduceThreadCount.push(el);
    });

    const reduceRepliesCount = [];
    reduceThreadCount.forEach((el, i) => {
      el.replies.sort((a, b) => a.created_on - b.created_on);
    });
    /*  reduceThreadCount.forEach((el, i) => {
      el.replies.forEach((reply, index) => {
        if (index < 3) reduceRepliesCount.push(reply);
      });
    });
    reduceThreadCount.forEach((el, i) => {
      el.replies = reduceRepliesCount[i];
    });
 */
    console.log(reduceThreadCount);
  });

module.exports = function (app) {
  app
    .route('/api/threads/:board')
    .post(async (req, res) => {
      const { board, text, delete_password } = req.body;
      const thread = await newThread(board, text, delete_password);
      return res.redirect(`/b/${board}`);
    })
    .get(async (req, res) => {
      const { board } = req.params;
      const threads = await getThreads(board);
      return res.json(threads);
    });

  app.route('/api/replies/:board');
};
