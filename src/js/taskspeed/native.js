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
 *
 * The sixteen tasks are TaskSpeed's (MIT License; copyright 2007-2009
 * mootools.net with modifications from phiggins; the DOM baseline by
 * WebReflection), adapted so that every contender leaves the same document.
 */

/*jslint browser:true plusplus:true sub:true unparam:true */
/*globals paste */

/**
 * TaskSpeed, native DOM: the baseline, written with the platform's own
 * interfaces and nothing else. Each task runs against the frame's body and
 * returns the value TaskSpeed's task returns: mostly a count of the
 * elements it worked on, an index for indexof and 0 for finale. The
 * harness times the call and compares the value and the resulting document
 * across contenders.
 *
 * @requires paste
 * @module taskspeed/native
 */
paste['define']('taskspeed.native', function (tests) {
    'use strict';

    var $doc = document,
        $indexOf = Array['prototype']['indexOf'],
        noop = function () {
            return undefined;
        },
        text = function (tag, value) {
            var element = $doc.createElement(tag);
            element.appendChild($doc.createTextNode(value));
            return element;
        };

    tests['make'] = function () {
        var body = $doc.body,
            list = $doc.createElement('ul'),
            remaining = 250,
            index = 0,
            copy;
        list.className = 'fromcode';
        list.appendChild(text('li', 'one'));
        list.appendChild(text('li', 'two'));
        list.appendChild(text('li', 'three'));
        while (remaining--) {
            copy = list.cloneNode(true);
            copy.id = 'setid' + index;
            body.appendChild(copy);
            index += 1;
        }
        return body.querySelectorAll('ul.fromcode').length;
    };

    tests['indexof'] = function () {
        var body = $doc.body,
            index = -1,
            remaining = 20;
        while (remaining--) {
            index = $indexOf.call(body.getElementsByTagName('ul'), $doc.getElementById('setid150'));
        }
        return index;
    };

    tests['bind'] = function () {
        var items = $doc.body.querySelectorAll('ul > li'),
            i = items.length;
        while (i--) {
            items[i].addEventListener('click', noop, false);
        }
        return items.length;
    };

    tests['attr'] = function () {
        var lists = $doc.body.getElementsByTagName('ul'),
            ids = [],
            i = lists.length;
        while (i--) {
            ids[i] = lists[i].id;
        }
        return ids.length;
    };

    tests['bindattr'] = function () {
        var items = $doc.body.querySelectorAll('ul > li'),
            i = items.length,
            item;
        while (i--) {
            item = items[i];
            item.addEventListener('mouseover', noop, false);
            item.setAttribute('rel', 'touched');
            item.removeEventListener('mouseover', noop, false);
        }
        return items.length;
    };

    tests['table'] = function () {
        var body = $doc.body,
            table = $doc.createElement('table'),
            before = text('td', 'before'),
            remaining = 40,
            row;
        table.className = 'madetable';
        table.appendChild($doc.createElement('tbody'))
            .appendChild($doc.createElement('tr'))
            .appendChild(text('td', 'first'));
        while (remaining--) {
            row = body.appendChild(table.cloneNode(true)).firstChild.firstChild;
            row.insertBefore(before.cloneNode(true), row.firstChild);
        }
        return body.querySelectorAll('tr td').length;
    };

    tests['addanchor'] = function () {
        var anchor = text('a', 'link'),
            items = $doc.body.querySelectorAll('ul.fromcode > li'),
            i = items.length;
        anchor.setAttribute('href', 'http://example.com');
        while (i--) {
            items[i].appendChild(anchor.cloneNode(true));
        }
        return items.length;
    };

    tests['append'] = function () {
        var body = $doc.body,
            div = $doc.createElement('div'),
            remaining = 500;
        div.setAttribute('rel', 'foo2');
        while (remaining--) {
            body.appendChild(div.cloneNode(true));
        }
        return body.querySelectorAll('div[rel="foo2"]').length;
    };

    tests['addclass-odd'] = function () {
        var divs = $doc.body.getElementsByTagName('div'),
            i = divs.length,
            odd = 0,
            classes;
        while (i--) {
            classes = divs[i].classList;
            classes.add('added');
            if (i % 2) {
                classes.add('odd');
                odd += 1;
            }
        }
        return odd;
    };

    tests['style'] = function () {
        var divs = $doc.body.querySelectorAll('div.added'),
            i = divs.length,
            style;
        while (i--) {
            style = divs[i].style;
            style.backgroundColor = '#ededed';
            style.color = '#fff';
        }
        return divs.length;
    };

    tests['removeclass'] = function () {
        var divs = $doc.body.querySelectorAll('div.added'),
            i = divs.length;
        while (i--) {
            divs[i].classList.remove('added');
        }
        return divs.length;
    };

    tests['sethtml'] = function () {
        // A static list: each innerHTML write changes the tree, which a
        // live collection would have to walk again.
        var divs = $doc.body.querySelectorAll('div'),
            i = divs.length;
        while (i--) {
            divs[i].innerHTML = '<p>new content</p>';
        }
        return divs.length;
    };

    tests['insertbefore'] = function () {
        var paragraph = text('p', 'A Link'),
            anchors = $doc.body.querySelectorAll('ul.fromcode a'),
            i = anchors.length,
            anchor;
        while (i--) {
            anchor = anchors[i];
            anchor.parentNode.insertBefore(paragraph.cloneNode(true), anchor);
        }
        return anchors.length;
    };

    tests['insertafter'] = function () {
        var paragraph = text('p', 'After Link'),
            anchors = $doc.body.querySelectorAll('ul.fromcode a'),
            i = anchors.length,
            anchor;
        while (i--) {
            anchor = anchors[i];
            anchor.parentNode.insertBefore(paragraph.cloneNode(true), anchor.nextSibling);
        }
        return anchors.length;
    };

    tests['destroy'] = function () {
        var lists = $doc.body.querySelectorAll('ul.fromcode'),
            i = lists.length,
            list;
        while (i--) {
            list = lists[i];
            list.parentNode.removeChild(list);
        }
        return lists.length;
    };

    tests['finale'] = function () {
        var body = $doc.body;
        body.textContent = '';
        return body.getElementsByTagName('*').length;
    };
});
