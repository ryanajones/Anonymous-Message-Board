/* eslint-disable eqeqeq */
/* eslint-disable camelcase */
const { json } = require('body-parser');
const e = require('cors');
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
      _id: {
        type: Schema.Types.ObjectId,
        required: true,
        default: Schema.Types.ObjecId,
      },
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

// const Replies = mongoose.model('replies', repliesSchema);
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
const newReply = async (thread_id, text, delete_password) =>
  Threads.findOne({ _id: thread_id })
    .then((thread) => {
      thread.bumped_on = new Date().toUTCString();
      thread.replies.push({
        _id: mongoose.Types.ObjectId(),
        thread_id,
        text,
        delete_password,
      });
      thread.replycount += 1;
      thread.save();
    })
    .catch((err) => {
      if (err) return console.log(err);
    });

// GET all threads for specific board
const getThreads = (board) =>
  Threads.find({ board })
    .lean()
    .then((thread) => {
      const sortedThreads = thread.sort((a, b) => b.created_on - a.created_on);

      // Reduce theads to 10
      const reduceThreadCount = [];
      sortedThreads.forEach((el, i) => {
        if (i < 10) reduceThreadCount.push(el);
      });

      // Sort replies by date created_on
      reduceThreadCount.forEach((el, i) => {
        el.replies.sort((a, b) => b.created_on - a.created_on);
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
  Threads.findOne({ _id: thread_id })
    .lean()
    .then((thread) => {
      thread.replies.forEach((el) => {
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
            return res.json('success');
          }
          return res.json(`incorrect password`);
        })
        .catch((err) => {
          if (err) return console.log(err);
        });
    })
    // Report thread
    .put((req, res) => {
      const { thread_id } = req.body;
      Threads.findById({ _id: thread_id })
        .then((thread) => {
          thread.reported = true;
          thread.save();
          return res.json('success');
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
        await newReply(thread_id, text, delete_password);
      } catch (err) {
        if (err) return console.log(err);
      }
      return res.redirect(`/b/${board}/${thread_id}`);
    })
    // Get replies
    .get(async (req, res) => {
      const { board } = req.params;
      const { thread_id } = req.query;
      try {
        const thread = await getReplies(thread_id);
        res.json(thread);
      } catch (err) {
        if (err) return console.log(err);
      }
    })
    // Delete reply
    .delete(async (req, res) => {
      const { thread_id, reply_id, delete_password } = req.body;
      // Find thread
      Threads.findOne({ _id: thread_id }).then((thread) => {
        if (!thread) {
          return res.json('incorrect thread_id');
        }

        // Delete reply from thread's replies array
        thread.replies.forEach((rep) => {
          if (rep._id == reply_id) {
            if (rep.delete_password !== delete_password) {
              return res.json('incorrect password');
            }
            rep.text = '[deleted]';
            thread.save();
            return res.json('success');
          }
        });
      });
    })
    // Report reply
    .put((req, res) => {
      const { thread_id, reply_id } = req.body;
      Threads.findById({ _id: thread_id })
        .then((thread) => {
          thread.replies.forEach((el) => {
            if (el._id == reply_id) {
              el.reported = true;
            }
          });
          thread.save();
          return res.json('success');
        })
        .catch((err) => {
          if (err) return console.log(err);
        });
    });
};
