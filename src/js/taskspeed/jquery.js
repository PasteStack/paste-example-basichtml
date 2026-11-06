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
 * mootools.net with modifications from phiggins), adapted so that every
 * contender leaves the same document.
 */

/*jslint browser:true plusplus:true sub:true unparam:true */
/*globals paste */

/**
 * TaskSpeed, jQuery: TaskSpeed's own jQuery tests, brought to jQuery 3
 * (on and off for the deprecated bind and unbind, odd() for the deprecated
 * :odd) and to the shared task definitions (rel="foo2", an empty div).
 * Written the jQuery way, it uses jQuery's own map and find, which Paste
 * source does not; see CONTRIBUTING.md.
 *
 * @requires paste
 * @requires libs/jquery
 * @module taskspeed/jquery
 */
paste['define']('taskspeed.jquery', ['libs.jquery'], function (tests, jq) {
    'use strict';

    var noop = function () {
        return undefined;
    };

    tests['make'] = function () {
        var remaining = 250,
            index = 0;
        while (remaining--) {
            jq('<ul class="fromcode"><li>one</li><li>two</li><li>three</li></ul>')
                .attr('id', 'setid' + index)
                .appendTo('body');
            index += 1;
        }
        return jq('ul.fromcode').length;
    };

    tests['indexof'] = function () {
        var index = -1,
            remaining = 20;
        while (remaining--) {
            index = jq('ul').index(jq('#setid150')[0]);
        }
        return index;
    };

    tests['bind'] = function () {
        return jq('ul > li').on('click', noop).length;
    };

    tests['attr'] = function () {
        return jq('ul').map(function (index, element) {
            return element.id;
        }).length;
    };

    tests['bindattr'] = function () {
        return jq('ul > li')
            .on('mouseover', noop)
            .attr('rel', 'touched')
            .off('mouseover', noop)
            .length;
    };

    tests['table'] = function () {
        var remaining = 40;
        while (remaining--) {
            jq('<table class="madetable"><tr><td>first</td></tr></table>')
                .appendTo('body')
                .find('tr').prepend('<td>before</td>');
        }
        return jq('tr td').length;
    };

    tests['addanchor'] = function () {
        return jq('.fromcode > li').append('<a href="http://example.com">link</a>').length;
    };

    tests['append'] = function () {
        var remaining = 500;
        while (remaining--) {
            jq('body').append('<div rel="foo2"></div>');
        }
        return jq('div[rel="foo2"]').length;
    };

    tests['addclass-odd'] = function () {
        return jq('div').addClass('added').odd().addClass('odd').length;
    };

    tests['style'] = function () {
        return jq('.added').css({'backgroundColor': '#ededed', 'color': '#fff'}).length;
    };

    tests['removeclass'] = function () {
        return jq('.added').removeClass('added').length;
    };

    tests['sethtml'] = function () {
        jq('div').html('<p>new content</p>');
        return jq('div').length;
    };

    tests['insertbefore'] = function () {
        return jq('.fromcode a').before('<p>A Link</p>').length;
    };

    tests['insertafter'] = function () {
        return jq('.fromcode a').after('<p>After Link</p>').length;
    };

    tests['destroy'] = function () {
        return jq('.fromcode').remove().length;
    };

    tests['finale'] = function () {
        jq('body').empty();
        return jq('body *').length;
    };
});
