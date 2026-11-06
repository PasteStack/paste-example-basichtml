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
 * Runs TaskSpeed, live, in the visitor's browser. The declaration is a
 * [data-taskspeed] element holding a run button, a results table whose
 * header cells name the contenders, and one iframe per contender:
 *
 *     <iframe data-taskspeed-frame="native" data-src="/taskspeed/native.html">
 *
 * A run loads every frame fresh and takes the contender's tests from the
 * frame's own Paste loader (module "taskspeed.<key>"). It empties each
 * frame's body, then runs the sixteen tasks in order, ROUNDS times over;
 * finale empties each body again, so every round starts from the same
 * empty page. Each task runs once per contender per round, in a shuffled
 * order, and only the call is timed; the table shows each task's median,
 * which sets aside a cold start or a garbage collection that lands in one
 * round. After every task, in every round, the harness compares the values
 * the contenders return and the documents they leave; listeners leave no
 * trace in a document, so the bind tasks compare by count alone. A
 * disagreement marks the row. A task that throws marks its row as failed,
 * is left out of the comparison, and leaves its contender without a total.
 * Nothing runs until the button is pressed. The status is a live region,
 * written when the page cannot set up a run, and when a run starts, ends
 * or fails; the per-task progress under it is for the eye. The button
 * keeps its focus through a run, and while the status has something to
 * say, the stylesheet hides the note that shares its place.
 *
 * @requires paste
 * @requires paste/event
 * @module example/taskspeed
 */
paste['define']('example.taskspeed', ['paste.event'], function (taskspeed, event) {
    'use strict';

    var $w = window,
        $doc = document,
        $performance = $w['performance'],
        $random = Math['random'],
        $floor = Math['floor'],
        $round = Math['round'],
        TASKS = ['make', 'indexof', 'bind', 'attr', 'bindattr', 'table', 'addanchor', 'append',
            'addclass-odd', 'style', 'removeclass', 'sethtml', 'insertbefore', 'insertafter',
            'destroy', 'finale'],
        ROUNDS = 5,
        // For sentences; keep it in step with ROUNDS.
        ROUNDS_IN_WORDS = 'five',
        // A pause between tasks, as TaskSpeed's own harness had, so the
        // frames settle and the page stays responsive.
        STEP_PAUSE = 30,
        LOAD_LIMIT = 20000,
        LIMIT_TEXT = (LOAD_LIMIT / 1000) + ' seconds',
        MISMATCH = 'TaskSpeed could not start: its table or frames do not match its sixteen tasks.',
        WHITESPACE = /\s+/,
        root = $doc.querySelector('[data-taskspeed]'),
        button,
        status,
        progress,
        rows,
        totals,
        contenders = [],
        columnOf = {},
        labelOf = {},
        headerNodes,
        headerNode,
        frameNodes,
        frameNode,
        contenderKey,
        entry,
        m,
        running = false,
        runCount = 0,
        ready = 0,
        loadTimer = null,
        round = 0,
        step = 0,
        // Per step, whether any round's values, or documents, differed.
        valueDiffered = [],
        documentDiffered = [],

        setStatus = function (message) {
            status.textContent = message;
        },

        setProgress = function (message) {
            progress.textContent = message;
        },

        // The button stays enabled, and so keeps its focus, through a run;
        // aria-disabled says it does nothing until the run ends.
        setBusy = function (busy) {
            running = busy;
            if (busy) {
                button.setAttribute('aria-disabled', 'true');
            } else {
                button.removeAttribute('aria-disabled');
            }
        },

        // A sorted copy of a short list of strings or numbers, by insertion:
        // Array sort takes a callback, which Paste source does not use.
        inOrder = function (list) {
            var out = [],
                remaining = list.length,
                index = 0,
                value,
                place,
                prior;
            while (remaining--) {
                value = list[index];
                place = out.length;
                while (place) {
                    prior = out[place - 1];
                    if (prior <= value) {
                        break;
                    }
                    out[place] = prior;
                    place -= 1;
                }
                out[place] = value;
                index += 1;
            }
            return out;
        },

        // Class tokens and style declarations compare as sets, attributes
        // as a sorted list: order is not part of the document's meaning.
        sortedTokens = function (value, separator) {
            var parts = value.split(separator),
                tokens = [],
                i = parts.length,
                token;
            while (i--) {
                token = parts[i].trim();
                if (token) {
                    tokens.push(token);
                }
            }
            return inOrder(tokens).join(' ');
        },

        serialize = function (node, out) {
            var child = node.firstChild,
                attributes,
                names,
                i,
                attribute,
                name,
                value,
                nodeName,
                type;
            while (child) {
                type = child.nodeType;
                if (type === 3) {
                    out.push('#', child.nodeValue);
                } else if (type === 1) {
                    attributes = child.attributes;
                    names = [];
                    i = attributes.length;
                    while (i--) {
                        attribute = attributes[i];
                        name = attribute.name;
                        value = attribute.value;
                        if (name === 'class') {
                            value = sortedTokens(value, WHITESPACE);
                        } else if (name === 'style') {
                            value = sortedTokens(value, ';');
                        }
                        names.push(name + '=' + value);
                    }
                    nodeName = child.nodeName;
                    out.push('<', nodeName, ' ', inOrder(names).join(' '), '>');
                    serialize(child, out);
                    out.push('</', nodeName, '>');
                }
                child = child.nextSibling;
            }
            return out;
        },

        // Tenths of a millisecond: finer than most browsers' clocks allow.
        tenths = function (time) {
            return $round(time * 10);
        },

        format = function (time) {
            return (tenths(time) / 10).toFixed(1);
        },

        // Marks the fastest of a row's or the footer's four result cells,
        // all of them when they tie at the precision shown, and says so to
        // assistive technology as well as in colour.
        markFastest = function (cells, times) {
            var i = times.length,
                best = -1,
                shown = [],
                time,
                value,
                cell,
                mark;
            while (i--) {
                time = times[i];
                if (time !== null) {
                    value = tenths(time);
                    shown[i] = value;
                    if (best < 0 || value < best) {
                        best = value;
                    }
                }
            }
            // A failed cell has no shown value, so it never matches.
            i = times.length;
            while (i--) {
                if (shown[i] === best) {
                    cell = cells[i + 1];
                    cell.classList.add('taskspeed-fastest');
                    mark = $doc.createElement('span');
                    mark.className = 'site-visually-hidden';
                    mark.textContent = ' (fastest)';
                    cell.appendChild(mark);
                }
            }
        },

        // Every cell but the row's heading.
        clearCells = function (cells) {
            var i = cells.length - 1,
                cell;
            while (i--) {
                cell = cells[i + 1];
                cell.textContent = '';
                cell.className = '';
            }
        },

        finish = function () {
            var index = TASKS.length,
                mismatches = 0,
                failures = 0,
                totalTimes = [],
                sorted,
                count,
                middle,
                row,
                classes,
                rowFailed,
                valueDiff,
                documentDiff,
                cells,
                times,
                i,
                contender,
                column,
                time;
            while (index--) {
                row = rows[index];
                classes = row.classList;
                cells = row.cells;
                times = [];
                rowFailed = false;
                i = contenders.length;
                while (i--) {
                    contender = contenders[i];
                    column = contender.column;
                    if (contender.failed[index]) {
                        time = null;
                        rowFailed = true;
                        contender.incomplete = true;
                        cells[column].textContent = 'error';
                    } else {
                        // The median of the rounds.
                        sorted = inOrder(contender.times[index]);
                        count = sorted.length;
                        middle = $floor(count / 2);
                        time = count % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
                        contender.total += time;
                        cells[column].textContent = format(time) + ' ms · ' + contender.found[index];
                    }
                    times[column - 1] = time;
                }
                valueDiff = valueDiffered[index];
                documentDiff = documentDiffered[index];
                // Where the contenders disagree, none did the same work, so
                // none is fastest.
                if (valueDiff || documentDiff) {
                    classes.add('taskspeed-mismatch');
                    cells[0].setAttribute('data-disagreed', valueDiff && documentDiff ? 'value and document' :
                            (valueDiff ? 'value' : 'document'));
                    mismatches += 1;
                } else {
                    markFastest(cells, times);
                }
                if (rowFailed) {
                    classes.add('taskspeed-failed');
                    failures += 1;
                }
            }
            cells = totals.cells;
            i = contenders.length;
            // A total that leaves out a failed task is incomplete; after a
            // disagreement no total is comparable with another.
            while (i--) {
                contender = contenders[i];
                column = contender.column;
                if (contender.incomplete) {
                    totalTimes[column - 1] = null;
                    cells[column].textContent = 'incomplete';
                } else if (mismatches) {
                    totalTimes[column - 1] = null;
                    cells[column].textContent = 'not comparable';
                } else {
                    totalTimes[column - 1] = contender.total;
                    cells[column].textContent = format(contender.total) + ' ms';
                }
            }
            markFastest(cells, totalTimes);
            if (failures || mismatches) {
                setStatus('Done, but ' +
                    (failures ? failures + ' task' + (failures === 1 ? '' : 's') + ' failed' : '') +
                    (failures && mismatches ? ' and ' : '') +
                    (mismatches ? 'the contenders disagreed on ' + mismatches + ' task' +
                        (mismatches === 1 ? '' : 's') : '') +
                    ': see the marked rows.');
            } else {
                setStatus('Done: medians of ' + ROUNDS_IN_WORDS + ' rounds. All four returned the same ' +
                    'values and documents after every task.');
            }
            setProgress('');
            button.textContent = 'Run again';
            setBusy(false);
        },

        runStep = function () {
            var task = TASKS[step],
                order = contenders.slice(0),
                i = order.length,
                j,
                swap,
                contender,
                test,
                began,
                found,
                time,
                failed,
                signature,
                firstFound,
                firstSignature,
                first = true,
                // Once a value differs on a step, its row keeps the values of
                // that round.
                keep = valueDiffered[step],
                valueDiffers = false,
                documentDiffers = false;
            // A new random order for every task (Fisher–Yates).
            while (i--) {
                j = $floor($random() * (i + 1));
                swap = order[i];
                order[i] = order[j];
                order[j] = swap;
            }
            i = order.length;
            while (i--) {
                contender = order[i];
                test = contender.tests[task];
                found = null;
                time = null;
                failed = false;
                try {
                    began = $performance.now();
                    found = test();
                    time = $performance.now() - began;
                } catch (taskError) {
                    failed = true;
                    contender.failed[step] = true;
                }
                if (!keep) {
                    contender.found[step] = failed ? null : found;
                }
                // A failed task is reported as a failure, not compared.
                if (!failed) {
                    contender.times[step].push(time);
                    signature = serialize(contender.body, []).join('');
                    if (first) {
                        firstFound = found;
                        firstSignature = signature;
                        first = false;
                    } else {
                        valueDiffers = valueDiffers || found !== firstFound;
                        documentDiffers = documentDiffers || signature !== firstSignature;
                    }
                }
            }
            // What differed, over every round: the row says which.
            if (valueDiffers) {
                valueDiffered[step] = true;
            }
            if (documentDiffers) {
                documentDiffered[step] = true;
            }
            step += 1;
            if (step === TASKS.length) {
                step = 0;
                round += 1;
            }
            if (round === ROUNDS) {
                finish();
                return;
            }
            setProgress('Round ' + (round + 1) + ' of ' + ROUNDS + ' · ' + TASKS[step]);
            $w.setTimeout(runStep, STEP_PAUSE);
        },

        // Every frame starts from an empty body: the frame page's own
        // whitespace is parsed into it.
        start = function () {
            var i = contenders.length,
                contender;
            $w.clearTimeout(loadTimer);
            loadTimer = null;
            while (i--) {
                contender = contenders[i];
                contender.body = contender.frame.contentDocument.body;
                contender.body.textContent = '';
            }
            round = 0;
            step = 0;
            setProgress('Round 1 of ' + ROUNDS + ' · ' + TASKS[0]);
            $w.setTimeout(runStep, STEP_PAUSE);
        },

        onFrameLoad = function (contender) {
            return function () {
                var frameWindow = contender.frame.contentWindow,
                    loader = frameWindow && frameWindow['paste'],
                    thisRun = runCount;
                if (!running || !loader) {
                    return;
                }
                // A string, not an array: the frame's loader recognizes only
                // arrays made in its own window, and wraps a name in one.
                // The loader retries a missing file, so the callback can come
                // after this run timed out or another began: it then does
                // nothing.
                loader['require']('taskspeed.' + contender.key, function (self, tests) {
                    if (!running || thisRun !== runCount || contender.tests) {
                        return;
                    }
                    contender.tests = tests;
                    ready += 1;
                    if (ready === contenders.length) {
                        start();
                    }
                });
            };
        },

        run = function () {
            var i = contenders.length,
                j = TASKS.length,
                contender,
                row,
                cells,
                k;
            if (running) {
                return;
            }
            setBusy(true);
            runCount += 1;
            ready = 0;
            valueDiffered = [];
            documentDiffered = [];
            setStatus('Running TaskSpeed…');
            setProgress('Loading the four contenders');
            while (j--) {
                row = rows[j];
                cells = row.cells;
                row.classList.remove('taskspeed-mismatch', 'taskspeed-failed');
                cells[0].removeAttribute('data-disagreed');
                clearCells(cells);
            }
            clearCells(totals.cells);
            while (i--) {
                contender = contenders[i];
                contender.tests = null;
                contender.total = 0;
                contender.incomplete = false;
                contender.times = [];
                contender.found = [];
                contender.failed = [];
                k = TASKS.length;
                while (k--) {
                    contender.times[k] = [];
                }
                contender.frame.src = contender.src + '?run=' + runCount;
            }
            loadTimer = $w.setTimeout(function () {
                var waiting = [],
                    n = contenders.length,
                    waitingFor;
                loadTimer = null;
                // Contenders were added last frame first, so this walks
                // them in the table's order.
                while (n--) {
                    waitingFor = contenders[n];
                    if (!waitingFor.tests) {
                        waiting.push(waitingFor.label);
                    }
                }
                // One frame is named; more are counted, so the message stays
                // short on a narrow screen.
                if (waiting.length === contenders.length) {
                    setStatus('TaskSpeed did not start: no frame was ready after ' + LIMIT_TEXT + '. Run it again.');
                } else if (waiting.length > 1) {
                    setStatus('TaskSpeed did not start: ' + waiting.length + ' of the ' + contenders.length +
                        ' frames were not ready after ' + LIMIT_TEXT + '. Run it again.');
                } else {
                    setStatus('TaskSpeed did not start: the ' + waiting[0] + ' frame was not ready after ' +
                        LIMIT_TEXT + '. Run it again.');
                }
                setProgress('');
                setBusy(false);
            }, LOAD_LIMIT);
        };

    if (!root) {
        return;
    }
    status = root.querySelector('.taskspeed-status');
    if (!status) {
        return;
    }
    if (!$performance || !$performance.now) {
        setStatus('TaskSpeed needs performance.now(), which this browser does not have.');
        return;
    }
    button = root.querySelector('.taskspeed-run');
    progress = root.querySelector('.taskspeed-progress');
    rows = root.querySelectorAll('tbody tr[data-task]');
    totals = root.querySelector('tfoot tr');
    if (!button || !progress || !totals || rows.length !== TASKS.length) {
        setStatus(MISMATCH);
        return;
    }
    // The table's rows are the tasks, in TaskSpeed's order.
    m = rows.length;
    while (m--) {
        if (rows[m].getAttribute('data-task') !== TASKS[m]) {
            setStatus(MISMATCH);
            return;
        }
    }
    headerNodes = root.querySelectorAll('thead th[data-contender]');
    m = headerNodes.length;
    while (m--) {
        headerNode = headerNodes[m];
        contenderKey = headerNode.getAttribute('data-contender');
        columnOf[contenderKey] = m + 1;
        labelOf[contenderKey] = headerNode.textContent;
    }
    frameNodes = root.querySelectorAll('iframe[data-taskspeed-frame]');
    m = frameNodes.length;
    while (m--) {
        frameNode = frameNodes[m];
        contenderKey = frameNode.getAttribute('data-taskspeed-frame');
        entry = {
            key: contenderKey,
            src: frameNode.getAttribute('data-src'),
            frame: frameNode,
            column: columnOf[contenderKey],
            label: labelOf[contenderKey]
        };
        if (!entry.column || !entry.src) {
            setStatus(MISMATCH);
            return;
        }
        contenders.push(entry);
        event['bind']('load', frameNode, onFrameLoad(entry));
    }
    event['bind']('click', button, run);
    button.disabled = false;
});
