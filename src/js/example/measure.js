/*!
 * Copyright (c) 2017–present Tomshley LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*jslint browser:true plusplus:true sub:true unparam:true */
/*globals paste */

/**
 * Measures a page of this site as a visitor's browser loads it, when the
 * visitor asks: the page loads in a frame, and once the modules it
 * declares are defined, its own Navigation and Resource Timing say how
 * large its Paste scripts are, uncompressed, when they arrived and whether
 * they came from the network or the cache. The declaration is a
 * [data-page-measure] element holding a button, an iframe with the page's
 * address and the modules to wait for:
 *
 *     <iframe data-src="/" data-modules="paste.ui.heroscroll paste.ui.smoothscroll">
 *
 * plus [data-measure] fields for the summary and a table body for the
 * files. Nothing loads until the button is pressed. The status is a live
 * region, written when the page cannot set up a measurement, and when a
 * measurement starts, ends or fails; the button keeps its focus
 * throughout, and while the status has something to say, the stylesheet
 * hides the note that shares its place.
 *
 * The loader retries a file that fails, so one file can have several
 * Resource Timing entries: only its last, successful one counts. Resource
 * Timing counts any response's headers as 300 bytes, so a file that cost
 * 300 bytes or fewer carried no body: the server confirmed the cached copy
 * (a 304). Browsers may report such a file's status as the cached 200, and
 * may or may not report its size.
 *
 * @requires paste
 * @requires paste/event
 * @module example/measure
 */
paste['define']('example.measure', ['paste.event'], function (measure, event) {
    'use strict';

    var $w = window,
        $doc = document,
        $round = Math['round'],
        LOAD_LIMIT = 20000,
        LIMIT_TEXT = (LOAD_LIMIT / 1000) + ' seconds',
        HEADERS = 300,
        root = $doc.querySelector('[data-page-measure]'),
        frame,
        address,
        moduleList,
        button,
        status,
        fields = {},
        nodes,
        node,
        files,
        tableBox,
        i,
        subscription = null,
        loadTimer = null,
        measuring = false,
        runCount = 0,

        setField = function (name, value) {
            var field = fields[name];
            if (field) {
                field.textContent = value;
            }
        },

        kilobytes = function (bytes) {
            return (bytes / 1024).toFixed(1) + ' KB';
        },

        milliseconds = function (time) {
            return $round(time) + ' ms';
        },

        // The button stays enabled, and so keeps its focus, during a
        // measurement; aria-disabled says it does nothing until it ends.
        // Only a measurement that measured something offers to measure
        // again.
        finish = function (message, measured) {
            $w.clearTimeout(loadTimer);
            loadTimer = null;
            if (subscription) {
                subscription['remove']();
                subscription = null;
            }
            // The table may now take the height its new rows need.
            tableBox.style.minHeight = '';
            status.textContent = message;
            if (measured) {
                button.textContent = 'Measure again';
            }
            button.removeAttribute('aria-disabled');
            measuring = false;
        },

        report = function (frameWindow) {
            var timing = frameWindow['performance'],
                origin = frameWindow.location.origin,
                navigation = timing.getEntriesByType('navigation')[0],
                entries = timing.getEntriesByType('resource'),
                length = entries.length,
                paths = [],
                last = {},
                index = 0,
                remaining = length,
                count = 0,
                cached = 0,
                unsized = 0,
                retried = 0,
                size = 0,
                arrived = 0,
                entry,
                name,
                path,
                code,
                usable,
                ended,
                decoded,
                transferred,
                revalidated,
                source,
                row;
            // Each Paste script's path, and the last entry for it: the one
            // that counts, since the loader's earlier attempts failed.
            while (remaining--) {
                name = entries[index].name;
                path = name.indexOf(origin) === 0 ? name.slice(origin.length) : '';
                if (path.indexOf('/js/') !== 0) {
                    path = '';
                }
                paths[index] = path;
                if (path) {
                    last[path] = index;
                }
                index += 1;
            }
            index = 0;
            remaining = length;
            while (remaining--) {
                path = paths[index];
                if (path) {
                    entry = entries[index];
                    code = entry.responseStatus;
                    // A response the page could use is 2xx or 304; browsers
                    // that do not report the status give 0 or nothing.
                    usable = !code || code === 304 || (code >= 200 && code < 300);
                    if (last[path] !== index || !usable) {
                        retried += 1;
                    } else {
                        count += 1;
                        ended = entry.responseEnd;
                        decoded = entry.decodedBodySize;
                        transferred = entry.transferSize;
                        revalidated = code === 304 || (transferred > 0 && transferred <= HEADERS);
                        if (ended > arrived) {
                            arrived = ended;
                        }
                        if (decoded) {
                            size += decoded;
                        } else {
                            unsized += 1;
                        }
                        if (revalidated) {
                            cached += 1;
                            source = 'your cache, after a check';
                        } else if (!transferred) {
                            cached += 1;
                            source = 'your cache';
                        } else {
                            source = 'the network';
                        }
                        // "/js/paste/ui/heroscroll.<hash>.v1.min.js" reads as
                        // "paste/ui/heroscroll".
                        row = files.insertRow(-1);
                        row.insertCell(-1).textContent = path.replace(/^\/js\//, '')
                            .replace(/\.[0-9a-f]{32}\.v\d+\.min\.js$/, '');
                        row.insertCell(-1).textContent = decoded ? kilobytes(decoded) : 'not reported';
                        row.insertCell(-1).textContent = milliseconds(ended);
                        row.insertCell(-1).textContent = source;
                    }
                }
                index += 1;
            }
            // A browser can expose Resource Timing yet report nothing.
            if (!count) {
                finish('The browser reported no timings for the showcase, so it was not measured.');
                return;
            }
            setField('js-files', String(count));
            setField('js-size', unsized === count ? 'not reported' :
                    unsized ? kilobytes(size) + ' or more' : kilobytes(size));
            setField('js-cached', String(cached));
            setField('js-arrived', milliseconds(arrived));
            if (navigation) {
                setField('first-byte', milliseconds(navigation.responseStart));
                setField('interactive', milliseconds(navigation.domInteractive));
            }
            finish('Measured just now: ' +
                (!cached ? 'all ' + count + ' scripts came over the network.' :
                        (cached === count ? 'all ' + count : cached + ' of ' + count) +
                        ' scripts came from your cache.') +
                (retried ? ' ' + retried + ' failed request' + (retried === 1 ? ' was' : 's were') +
                    ' retried, not counted.' : ''), true);
        },

        onLoad = function () {
            var frameWindow = frame.contentWindow,
                loader = frameWindow && frameWindow['paste'],
                thisRun = runCount,
                modules;
            // The empty frame's own about:blank load is not the page's.
            if (!measuring || !frameWindow || frameWindow.location.href === 'about:blank') {
                return;
            }
            subscription['remove']();
            subscription = null;
            if (!loader || !frameWindow['performance']) {
                finish('The showcase did not load in its frame, so it was not measured.');
                return;
            }
            // The frame's loader recognizes only arrays made in its own
            // window, so the list is split by the frame's String. A late
            // callback, after a timeout or from an earlier measurement,
            // does nothing.
            modules = frameWindow['String']['prototype']['split']['call'](moduleList, ' ');
            loader['require'](modules, function () {
                if (measuring && thisRun === runCount) {
                    report(frameWindow);
                }
            });
        },

        run = function () {
            var j = nodes.length,
                tableHeight;
            if (measuring) {
                return;
            }
            // Geometry first, before anything is written: the emptied table
            // keeps this height until the result arrives, so what follows it
            // does not jump.
            tableHeight = tableBox.getBoundingClientRect().height;
            measuring = true;
            runCount += 1;
            button.setAttribute('aria-disabled', 'true');
            while (j--) {
                nodes[j].textContent = '–';
            }
            tableBox.style.minHeight = tableHeight + 'px';
            files.textContent = '';
            status.textContent = 'Measuring: loading the showcase page in a frame…';
            subscription = event['bind']('load', frame, onLoad);
            loadTimer = $w.setTimeout(function () {
                loadTimer = null;
                finish('The showcase did not finish loading in its frame within ' + LIMIT_TEXT + ', so it ' +
                    'was not measured.');
            }, LOAD_LIMIT);
            frame.src = address + '?measure=' + runCount;
        };

    if (!root) {
        return;
    }
    status = root.querySelector('.page-measure-status');
    if (!status) {
        return;
    }
    if (!$w['performance'] || !$w['performance'].getEntriesByType) {
        status.textContent = 'The measurement needs Resource Timing, which this browser does not have.';
        return;
    }
    frame = root.querySelector('iframe[data-src]');
    button = root.querySelector('.page-measure-run');
    files = root.querySelector('.page-measure-files tbody');
    if (!frame || !button || !files) {
        status.textContent = 'The measurement could not start: its frame, button or table is missing.';
        return;
    }
    // The declaration, read once: the page's address and the modules to
    // wait for, separated by single spaces.
    address = frame.getAttribute('data-src');
    moduleList = (frame.getAttribute('data-modules') || '').trim().replace(/\s+/g, ' ');
    if (!address || !moduleList) {
        status.textContent = 'The measurement could not start: its frame names no page or no modules.';
        return;
    }
    tableBox = files.parentNode.parentNode;
    nodes = root.querySelectorAll('[data-measure]');
    i = nodes.length;
    while (i--) {
        node = nodes[i];
        fields[node.getAttribute('data-measure')] = node;
    }
    event['bind']('click', button, run);
    button.disabled = false;
});
