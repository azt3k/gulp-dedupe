/*!
 * gulp-dedupe, https://github.com/hoho/gulp-dedupe
 * (c) 2014 Marat Abdullin, MIT license
 */

'use strict';

var through = require('through');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var path = require('path');
var defaults = require('lodash.defaults');
var hasher = require('hash-files');

module.exports = function(options) {

    var filesMap = {},
        filesHashes = {};

    options = defaults(options || {}, {
        error: false, // Throw an error in case of duplicate.
        same: true, // Throw an error in case duplicates have different contents.
        diff: false // Supply duplicates with different content error with actual diff.
    });

    function bufferContents(file) {

        if (file.isNull()) { return; }
        if (file.isStream()) { return this.emit('error', new PluginError('gulp-dedupe', 'Streaming not supported')); }

        var fullpath = path.resolve(file.path),
            hash = hasher.sync({files: [fullpath]}),
            dupeType = null,
            h,
            f;

        if ((f = filesMap[fullpath]) || (h = filesHashes[hash])) {

            // fall back to hash lookup
            if (!f && h) {
                dupeType = 'hash';
                f = h;
            }
            else {
                dupeType = 'path';
            }

            if (options.error) {
                this.emit('error', new PluginError('gulp-dedupe', 'Duplicate files (' + dupeType + ') ' + file.path + ' and ' + f.path));
            } else if (options.same && file.contents.toString() !== f.contents.toString()) {
                var errorDiff = [];

                if (options.diff) {
                    require('colors');
                    var diff = require('diff').diffChars(file.contents.toString(), f.contents.toString());

                    errorDiff.push(':\n');

                    diff.forEach(function(part){
                        // green for additions, red for deletions
                        // grey for common parts
                        var color = part.added ? 'green' :
                            part.removed ? 'red' : 'grey';
                        errorDiff.push(part.value[color]);
                    });
                }

                errorDiff = errorDiff.join('');

                this.emit('error', new PluginError('gulp-dedupe', 'Duplicate file `' + file.path + '` with different contents' + errorDiff));
            }
            return;
        } else {
            filesMap[fullpath] = file;
            filesHashes[hash] = file;
        }

        this.emit('data', file);
    }

    function endStream() {
        this.emit('end');
    }

    return through(bufferContents, endStream);
};
