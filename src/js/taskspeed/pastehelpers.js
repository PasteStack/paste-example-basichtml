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
 * TaskSpeed, Paste helpers: the native baseline's code with each call
 * that has a Paste helper swapped for it, call for call (querySelectorAll,
 * get, bind and remove, addCssClass and removeCssClass). Set beside the
 * native column, it shows what the helpers themselves cost.
 *
 * @requires paste
 * @requires paste/dom
 * @requires paste/event
 * @module taskspeed/pastehelpers
 */
paste['define']('taskspeed.pastehelpers', ['paste.dom', 'paste.event'], function (tests, dom, event) {
    'use strict';

    var $doc = document,
        $indexOf = Array['prototype']['indexOf'],
        $get = dom['get'],
        $querySelectorAll = dom['querySelectorAll'],
        $addCssClass = dom['addCssClass'],
        $removeCssClass = dom['removeCssClass'],
        $bind = event['bind'],
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
        return $querySelectorAll('ul.fromcode', body).length;
    };

    tests['indexof'] = function () {
        var body = $doc.body,
            index = -1,
            remaining = 20;
        while (remaining--) {
            index = $indexOf.call(body.getElementsByTagName('ul'), $get('setid150'));
        }
        return index;
    };

    tests['bind'] = function () {
        var items = $querySelectorAll('ul > li', $doc.body),
            i = items.length;
        while (i--) {
            $bind('click', items[i], noop);
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
        var items = $querySelectorAll('ul > li', $doc.body),
            i = items.length,
            item,
            subscription;
        while (i--) {
            item = items[i];
            subscription = $bind('mouseover', item, noop);
            item.setAttribute('rel', 'touched');
            subscription['remove']();
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
        return $querySelectorAll('tr td', body).length;
    };

    tests['addanchor'] = function () {
        var anchor = text('a', 'link'),
            items = $querySelectorAll('ul.fromcode > li', $doc.body),
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
        return $querySelectorAll('div[rel="foo2"]', body).length;
    };

    tests['addclass-odd'] = function () {
        var divs = $doc.body.getElementsByTagName('div'),
            i = divs.length,
            odd = 0,
            div;
        while (i--) {
            div = divs[i];
            $addCssClass(div, 'added');
            if (i % 2) {
                $addCssClass(div, 'odd');
                odd += 1;
            }
        }
        return odd;
    };

    tests['style'] = function () {
        var divs = $querySelectorAll('div.added', $doc.body),
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
        var divs = $querySelectorAll('div.added', $doc.body),
            i = divs.length;
        while (i--) {
            $removeCssClass(divs[i], 'added');
        }
        return divs.length;
    };

    tests['sethtml'] = function () {
        // A static list: each innerHTML write changes the tree, which a
        // live collection would have to walk again.
        var divs = $querySelectorAll('div', $doc.body),
            i = divs.length;
        while (i--) {
            divs[i].innerHTML = '<p>new content</p>';
        }
        return divs.length;
    };

    tests['insertbefore'] = function () {
        var paragraph = text('p', 'A Link'),
            anchors = $querySelectorAll('ul.fromcode a', $doc.body),
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
            anchors = $querySelectorAll('ul.fromcode a', $doc.body),
            i = anchors.length,
            anchor;
        while (i--) {
            anchor = anchors[i];
            anchor.parentNode.insertBefore(paragraph.cloneNode(true), anchor.nextSibling);
        }
        return anchors.length;
    };

    tests['destroy'] = function () {
        var lists = $querySelectorAll('ul.fromcode', $doc.body),
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
