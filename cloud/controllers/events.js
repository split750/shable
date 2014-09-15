var _ = require('underscore');
var Events = Parse.Object.extend('Events');

// Display all events.
exports.index = function(req, res) {
  var query = new Parse.Query(Events);
  query.descending('createdAt');
  query.find().then(function(results) {
    res.render('events/index', { 
      events: results
    });
  },
  function() {
    res.send(500, 'Failed loading events');
  });
};

// Display a form for creating a new post.
exports.new = function(req, res) {
  res.render('events/new', {});
};

// Create a new post with specified title and body.
exports.create = function(req, res) {
  var events = new Events();

  // Explicitly specify which fields to save to prevent bad input data
  events.save(_.pick(req.body, 'title', 'body', 'theme')).then(function() {
    res.redirect('/events');
  },
  function() {
    res.send(500, 'Failed saving events');
  });
};

// Show a given post based on specified id.
exports.show = function(req, res) {
  var eventsQuery = new Parse.Query(Events);
  var foundEvents;
  eventsQuery.get(req.params.id).then(function(events) {
    if (events) {
      foundEvents = events;
      var Comment = Parse.Object.extend('Comment');
      var commentQuery = new Parse.Query(Comment);
      commentQuery.equalTo('events', events);
      commentQuery.descending('createdAt');
      return commentQuery.find();
    } else {
      return [];
    }
  }).then(function(comments) {
    res.render('events/show', {
      events: foundEvents,
      comments: comments
    });
  },
  function() {
    res.send(500, 'Failed finding the specified events to show');
  });
};

// Display a form for editing a specified post.
exports.edit = function(req, res) {
  var query = new Parse.Query(Events);
  query.get(req.params.id).then(function(events) {
    if (events) {
      res.render('events/edit', { 
        events: events
      })
    } else {
      res.send('specified events does not exist')
    }
  },
  function() {
    res.send(500, 'Failed finding events to edit');
  });
};

// Update a post based on specified id, title and body.
exports.update = function(req, res) {
  var events = new Events();
  events.id = req.params.id;
  events.save(_.pick(req.body, 'title', 'body', 'author')).then(function() {
    res.redirect('/events/' + events.id);
  },
  function() {
    res.send(500, 'Failed saving events');
  });
};

// Initial call should be deleteRecursive(objects, 0, function() {...});
// Invokes callback after all items in objects are deleted.
// Only works if number of objects is small (to avoid Cloud Code timeout).
var deleteRecursive = function(objects, index, callback) {
  if (index >= objects.length) {
    callback();
  } else {
    objects[index].destroy().then(function() {
      deleteRecursive(objects, index + 1, callback);
    });
  }
}

// Delete a post corresponding to the specified id.
exports.delete = function(req, res) {
  var events = new Events();
  events.id = req.params.id;

  // Also delete post's comments by chaining destroy calls.
  // Assumption: there will be a small number of comments per post.
  var query = new Parse.Query(Parse.Object.extend('Comment'));
  query.equalTo("events", events);
  query.find().then(function(results) {
    deleteRecursive(results, 0, function() {
      // After all comments are deleted, delete the post itself.
      events.destroy().then(function() {
        res.redirect('/events');
      },
      function() {
        res.send(500, 'Failed deleting events');
      });
    });
  },
  function() {
    res.send(500, 'Failed finding comments for events');
  });
};
