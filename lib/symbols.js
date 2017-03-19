var formidable, fs, mkdirp, path;

fs = require('fs-plus');

path = require('path');

mkdirp = require('mkdirp');

formidable = require('formidable');

module.exports.saveSymbols = function(req, callback) {
    let form = new formidable.IncomingForm();
    return form.parse(req, function(error, fields, files) {
        var destination, output_file_name;
        if (files.symbol_file == null) {
            return callback(new Error("Invalid symbol file"));
        }
        if (files.symbol_file.name == null) {
            return callback(new Error("Invalid symbol file name"));
        }
        if (fields.debug_file == null) {
            return callback(new Error("Invalid symbol debug file"));
        }
        if (fields.debug_identifier == null) {
            return callback(new Error("Invalid symbol debug identifier"));
        }
        output_file_name = fields.debug_file.replace(".pdb", ".sym");
        destination = "pool/symbols";
        destination = path.join(destination, fields.debug_file);
        destination = path.join(destination, fields.debug_identifier);
        return mkdirp(destination, function(error) {
            if (error != null) {
                return callback(new Error("Could not create directory: " + destination));
            }
            destination = path.join(destination, output_file_name);
            return fs.copy(files.symbol_file.path, destination, function(error) {
                if (error != null) {
                    return callback(new Error("Cannot create file: " + destination));
                }
                return callback(null, destination);
            });
        });
    });
};