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
 * jQuery as a named runtime dependency, for the TaskSpeed comparison only:
 * the jQuery frame requires it and no other page does. The URL is the
 * pinned release scripts/fetch-deps.sh fetches (paste-deps.conf names the
 * same version) and scripts/build-dist.sh serves from /vendor/. The
 * returned value is jQuery itself, with the window's $ and jQuery names
 * given back, so the frame's tests receive it as a dependency.
 *
 * @requires paste
 * @module libs/jquery
 */
paste['define']('libs.jquery', ['/vendor/jquery-3.7.1.min.js'], function () {
    'use strict';

    return window['jQuery']['noConflict'](true);
});
