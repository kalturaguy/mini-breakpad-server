(function() {
  var Database, EventEmitter, Record, dirty, mkdirp, path,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  path = require('path');

  dirty = require('dirty');

  mkdirp = require('mkdirp');

  EventEmitter = require('events').EventEmitter;

  Record = require('./record');

  Database = (function(_super) {
    __extends(Database, _super);

    Database.prototype.db = null;

    function Database(filename) {
      var dist,
        _this = this;
      if (filename == null) {
        filename = path.join('pool', 'database', 'dirty', 'db');
      }

      dist = path.resolve(filename, '..');
      mkdirp(dist, function(err) {
        if (err != null) {
          throw new Error("Cannot create directory: " + dist);
        }
        _this.db = dirty(filename);
        return _this.db.on('load', _this.emit.bind(_this, 'load'));
      });
    }

    Database.prototype.saveRecord = function(record, callback) {
      this.db.set(record.id, record.serialize());
      return callback(null);
    };
    Database.prototype.deleteRecord = function(id, callback) {
      let raw = this.db.get(id);
      if (raw) {
        this.db.rm(id, callback);
      } else {
        callback(null);
      }

    };

    Database.prototype.restoreRecord = function(id, callback) {
      var raw;
      raw = this.db.get(id);
      if (raw == null) {
        return callback(new Error("Record is not in database"));
      }
      return callback(null, Record.unserialize(id, this.db.get(id)));
    };

    function filter(obj,f) {
      for (let propName in f) {
          if (f[propName]!=obj[propName]) {
            return true;
          }
      }
      return false;
    }
    Database.prototype.getAllRecords = function(filterObj) {
      var records;
      records = [];
      this.db.forEach(function(id, record) {
        if (record) {
          if (filter(record.fields,filterObj)) {
            return;
          }
          return records.push(Record.unserialize(id, record));
        }
      });
      return records.reverse();
    };

    return Database;

  })(EventEmitter);

  module.exports = Database;

}).call(this);
