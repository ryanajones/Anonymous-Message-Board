/* eslint-disable eqeqeq */
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
  replies: [
    {
      thread_id: { type: String, required: true },
      text: { type: String, required: true },
      created_on: {
        type: Date,
        required: true,
        default: new Date().toUTCString(),
      },
      reported: { type: Boolean, required: true, default: false },
      delete_password: { type: String, required: true },
    },
  ],
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
  try {
    const saveReply = await new Replies({
      thread_id,
      text,
      delete_password,
    });
    await Threads.findOne({ _id: thread_id })
      .then((res) => {
        res.bumped_on = new Date().toUTCString();
        res.replies.push(saveReply);
        res.replycount += 1;
        res.save();
      })
      .catch((err) => {
        if (err) return console.log(err);
      });
    return saveReply.save();
  } catch (err) {
    if (err) return console.log(err);
  }
};

// GET all threads for specific board
const getThreads = (board) =>
  Threads.find({ board })
    .lean()
    .then((thread) => {
      const sortedThreads = thread.sort((a, b) => a.created_on - b.created_on);

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
        delete el.delete_password;
        delete el.reported;
      });

      return reduceThreadCount;
    })
    .catch((err) => {
      if (err) return console.log(err);
    });

// Get all replies for specific thread
const getReplies = (thread_id) =>
  Threads.find({ _id: thread_id })
    .lean()
    .then((thread) => {
      thread[0].replies.forEach((el) => {
        delete el.delete_password;
        delete el.reported;
      });
      return thread;
    })
    .catch((err) => {
      if (err) return console.log(err);
    });

module.exports = function (app) {
  app
    .route('/api/threads/:board')
    // Post new thread
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
    // Get threads
    .get(async (req, res) => {
      const { board } = req.params;
      let threads;
      try {
        threads = await getThreads(`${board}`);
      } catch (err) {
        if (err) return console.log(err);
      }

      return res.json(threads);
    })
    // Delete thread
    .delete((req, res) => {
      const { thread_id, delete_password } = req.body;
      Threads.findById({ _id: thread_id })
        .then((thread) => {
          if (delete_password === thread.delete_password) {
            thread.remove();
            return res.json('succes');
          }
          return res.json(`incorrect password`);
        })
        .catch((err) => {
          if (err) return console.log(err);
        });
    });

  app
    .route('/api/replies/:board')
    // Post new reply
    .post(async (req, res) => {
      const { board } = req.params;
      const { thread_id, text, delete_password } = req.body;
      try {
        const reply = await newReply(thread_id, text, delete_password);
      } catch (err) {
        if (err) return console.log(err);
      }
      return res.redirect(`/b/${board}/${thread_id}`);
    })
    // Get replies
    .get((req, res) => {
      const { board } = req.params;
      const { thread_id } = req.query;
      return getReplies(thread_id)
        .then((replies) => res.json(replies[0]))
        .catch((err) => {
          if (err) return console.log(err);
        });
    })
    // Delete reply
    .delete(async (req, res) => {
      const { thread_id, reply_id, delete_password } = req.body;
      try {
        // Find reply and delete
        const reply = await Replies.findById({ _id: reply_id });

        if (thread_id !== reply.thread_id) {
          return res.json('incorrect thread_id');
        }

        if (delete_password === reply.delete_password) {
          reply.text = '[deleted]';
          await reply.save();
          // Update replies array within the thread
          const thread = await Threads.findOne({ _id: thread_id });
          thread.replies.forEach((rep) => {
            if (rep._id == reply_id) {
              rep.text = '[deleted]';
            }
          });
          await thread.save();
          return res.json('success');
        }
        return res.json('incorrect password');
      } catch (err) {
        if (err) return console.log(err);
      }
    });
};
