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
    res.save();
  });
  return saveReply.save();
};

// GET all threads for specific board
const getThreads = (board) =>
  Threads.find({ board }).then((res) => {
    const sortedThreads = res.sort((a, b) => a.created_on - b.created_on);
    const reduceThreadCount = [];
    sortedThreads.forEach((el, i) => {
      if (i < 10) reduceThreadCount.push(el);
    });

    // const reduceRepliesCount = [];
    // reduceThreadCount.forEach((el, i) => {
    //   el.replies.sort((a, b) => a.created_on - b.created_on);
    // });
    // reduceThreadCount.forEach((el, i) => {
    //   el.replies.forEach((reply, index) => {
    //     if (index < 3) reduceRepliesCount.push(reply);
    //   });
    // });
    // reduceThreadCount.forEach((el, i) => {
    //   el.replies = reduceRepliesCount[i];
    // });
    // return reduceThreadCount;
    return sortedThreads;
  });

// Get all replies for specific thread
const getReplies = (thread_id) => Replies.find({ thread_id });

// Regex function to add '/' if not present in board param
const addForwardSlash = (board) => {
  const regex = /\//g;
  let modifiedBoard = board;
  if (regex.test(board) === false) {
    return (modifiedBoard += '/');
  }
};

module.exports = function (app) {
  app
    .route('/api/threads/:board')
    .post(async (req, res) => {
      const { board } = req.params;
      const { text, delete_password } = req.body;
      // board = addForwardSlash(board);
      await newThread(board, text, delete_password);
      return res.redirect(`/b/${board}`);
    })
    .get(async (req, res) => {
      const { board } = req.params;
      // board = addForwardSlash(board);
      const threads = await getThreads(`${board}`);
      return res.json(threads);
    });

  app
    .route('/api/replies/:board')
    .post(async (req, res) => {
      const { board } = req.params;
      // board = addForwardSlash(board);
      const { thread_id, text, delete_password } = req.body;

      const reply = await newReply(thread_id, text, delete_password);
      return res.redirect(`/b/${board}/${thread_id}`);
    })
    .get(async (req, res) => {
      const { board } = req.params;
      const { thread_id } = req.body;
      // board = addForwardSlash(board);
      const replies = await getReplies(thread_id);

      return res.json(replies);
    });
};
