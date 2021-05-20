/* eslint-disable camelcase */
const chaiHttp = require('chai-http');
const chai = require('chai');

const { assert } = chai;
const server = require('../server');

chai.use(chaiHttp);
let threadId;
let replyId;
suite('Functional Tests', function () {
  suite('/api/threads/:board', function () {
    test('POST request: Creating a new thread', function (done) {
      chai
        .request(server)
        .post('/api/threads/general')
        .send({
          board: 'general',
          text: 'This is a thread post test',
          delete_password: 'delete',
        })
        .end(function (err, res) {
          if (err) {
            console.log(err);
            return done(err);
          }
          assert.equal(res.status, 200);
          done();
        });
    });
    test('GET request: Viewing the 10 most recent threads with 3 replies each', function (done) {
      chai
        .request(server)
        .get('/api/threads/general')
        .query({})
        .end(function (err, res) {
          const thread = res.body[0];
          threadId = thread._id;
          if (err) {
            console.log(err);
            return done(err);
          }
          assert.equal(res.status, 200);
          assert.isArray(res.body);
          assert.isAtMost(res.body.length, 10);
          assert.isAtMost(thread.replies.length, 3);
          assert.equal(thread.board, 'general');
          assert.equal(thread.text, 'This is a thread post test');
          assert.property(thread, 'bumped_on');
          assert.property(thread, 'created_on');
          assert.property(thread, 'replies');
          assert.property(thread, 'replycount');
          assert.property(thread, '_id');
          done();
        });
    });
    test('PUT request: Report a thread', function (done) {
      chai
        .request(server)
        .put('/api/threads/general')
        .send({ board: 'general', thread_id: threadId })
        .end(function (err, res) {
          if (err) {
            console.log(err);
            return done(err);
          }
          assert.equal(res.status, 200);
          assert.equal(res.body, 'success');
          done();
        });
    });
    test('DELETE request: Delete thread with an invalid delete_password', function (done) {
      chai
        .request(server)
        .delete('/api/threads/general')
        .send({
          board: 'general',
          thread_id: threadId,
          delete_password: 'wrong password',
        })
        .end(function (err, res) {
          if (err) {
            console.log(err);
            return done(err);
          }
          assert.equal(res.status, 200);
          assert.equal(res.body, 'incorrect password');
          done();
        });
    });
    test('DELETE request: Delete thread with a valid delete_password', function (done) {
      chai
        .request(server)
        .delete('/api/threads/general')
        .send({
          board: 'general',
          thread_id: threadId,
          delete_password: 'delete',
        })
        .end(function (err, res) {
          if (err) {
            console.log(err);
            return done(err);
          }
          assert.equal(res.status, 200);
          assert.equal(res.body, 'success');
          done();
        });
    });
  });
});
