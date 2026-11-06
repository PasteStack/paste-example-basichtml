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
 * TaskSpeed, the Paste way: markup built once with paste.dom's MarkupWriter
 * and inserted as one fragment, listeners through paste.event, and the
 * platform's own interfaces wherever Paste defers to them (class lists,
 * cloning, insertion). It leaves the same document as every other
 * contender.
 *
 * @requires paste
 * @requires paste/dom
 * @requires paste/event
 * @module taskspeed/paste
 */
paste['define']('taskspeed.paste', ['paste.dom', 'paste.event'], function (tests, dom, event) {
    'use strict';

    var $doc = document,
        $indexOf = Array['prototype']['indexOf'],
        $get = dom['get'],
        $querySelectorAll = dom['querySelectorAll'],
        $bind = event['bind'],
        MarkupWriter = dom['MarkupWriter'],
        noop = function () {
            return undefined;
        },
        // One string per repeat, joined once and parsed once.
        appendMarkup = function (parent, markup, count) {
            var writer = new MarkupWriter(),
                remaining = count;
            while (remaining--) {
                writer['push'](markup);
            }
            parent.appendChild(writer['toFragment']());
        },
        text = function (tag, value) {
            var element = $doc.createElement(tag);
            element.appendChild($doc.createTextNode(value));
            return element;
        };

    tests['make'] = function () {
        var body = $doc.body,
            writer = new MarkupWriter(),
            remaining = 250,
            index = 0;
        while (remaining--) {
            writer['push']('<ul class="fromcode" id="setid' + index +
                '"><li>one</li><li>two</li><li>three</li></ul>');
            index += 1;
        }
        body.appendChild(writer['toFragment']());
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
        var body = $doc.body;
        appendMarkup(body, '<table class="madetable"><tbody><tr><td>before</td><td>first</td></tr></tbody></table>', 40);
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
        var body = $doc.body;
        appendMarkup(body, '<div rel="foo2"></div>', 500);
        return $querySelectorAll('div[rel="foo2"]', body).length;
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
            divs[i].classList.remove('added');
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
