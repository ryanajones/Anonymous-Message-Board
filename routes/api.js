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
  replies: { type: Array, default: [], required: true },
  replycount: { type: Number, default: 0, required: true },
});

const repliesSchema = new Schema({
  thread_id: { type: String, required: true },
  text: { type: String, required: true },
  created_on: { type: Date, required: true, default: new Date().toUTCString() },
  reported: { type: Boolean, required: true, default: false },
  delete_password: { type: String, required: true },
});

const Replies = mongoose.model('replies', repliesSchema);
const Threads = mongoose.model('threads', threadSchema);

// POST new thread
const newThread = (board, text, delete_password) => {
  const saveThread = new Threads({
    board,
    text,
    delete_password,
  });
  return saveThread.save();
};

// POST new reply
const newReply = async (thread_id, text, delete_password) => {
  const saveReply = await new Replies({
    thread_id,
    text,
    delete_password,
  });
  await Threads.findOne({ _id: thread_id }).then((res) => {
    res.bumped_on = new Date().toUTCString();
    res.replies.push(saveReply);
    res.replycount += 1;
    res.save();
  });
  return saveReply.save();
};

// GET all threads for specific board
const getThreads = async (board) =>
  Threads.find({ board }).then((res) => {
    const sortedThreads = res.sort((a, b) => a.created_on - b.created_on);

    // Reduce theads to 10
    const reduceThreadCount = [];
    sortedThreads.forEach((el, i) => {
      if (i < 10) reduceThreadCount.push(el);
    });

    // Sort replies by date created_on
    reduceThreadCount.forEach((el, i) => {
      el.replies.sort((a, b) => a.created_on - b.created_on);
    });

    // Reduce replies to 3
    reduceThreadCount.forEach((el, i) => {
      const reduceRepliesCount = [];
      el.replies.forEach((reply, index) => {
        if (index < 3) reduceRepliesCount.push(reply);
      });
      el.replies = reduceRepliesCount;
    });

    // Delete delete_password and reported properties for client return
    reduceThreadCount.forEach((el) => {
      el.delete_password = undefined;
      el.reported = undefined;
    });

    return reduceThreadCount;
  });
// Get all replies for specific thread
const getReplies = (thread_id) =>
  Threads.find({ _id: thread_id }).then((res) => {
    res[0].replies.forEach((el) => {
      el.delete_password = undefined;
      el.reported = undefined;
    });
    return res;
  });

module.exports = function (app) {
  app
    .route('/api/threads/:board')
    .post(async (req, res) => {
      const { board } = req.params;
      const { text, delete_password } = req.body;

      try {
        await newThread(board, text, delete_password);
      } catch (err) {
        if (err) return console.log(err);
      }

      return res.redirect(`/b/${board}`);
    })
    .get(async (req, res) => {
      const { board } = req.params;
      let threads;
      try {
        threads = await getThreads(`${board}`);
      } catch (err) {
        if (err) return console.log(err);
      }

      return res.json(threads);
    });

  app
    .route('/api/replies/:board')
    .post(async (req, res) => {
      const { board } = req.params;
      const { thread_id, text, delete_password } = req.body;
      let reply;
      try {
        reply = await newReply(thread_id, text, delete_password);
      } catch (err) {
        if (err) return console.log(err);
      }
      return res.redirect(`/b/${board}/${thread_id}`);
    })
    .get(async (req, res) => {
      const { board } = req.params;
      const { thread_id } = req.query;
      let replies;
      try {
        replies = await getReplies(thread_id);
      } catch (err) {
        if (err) return console.log(err);
      }
      return res.json(replies[0]);
    });
};
