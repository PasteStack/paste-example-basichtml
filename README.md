# paste-example-basichtml

A plain HTML page that shows PasteStack's pieces one section at a time —
heroscroll, smoothscroll, the section nav, paste core, the Surface markup and
paste-assetgraph — each saying what it does, showing the code that declares
it, and linking to its source. A second page, `performance.html`, measures
Paste live in the visitor's browser. Both are written by hand to the Surface
contract, built with `paste-assetgraph` and served from any static host: no
server, no template engine and no Surface renderer.

Use it to see what each piece does, and as the starting point for a
plain-HTML site that uses Paste.

## Quick start

You need `git`, `curl`, `oxipng` (`brew install oxipng`, or your Linux
distribution's package) and, to preview, `python3`. JPEG images also need
`jpegoptim`. The scripts run on macOS and Linux.

```sh
git clone https://gitlab.com/tomshley/brands/global/tware/tech/products/paste/paste-example-basichtml.git
cd paste-example-basichtml
sh scripts/fetch-deps.sh
sh scripts/build-dist.sh
(cd dist && python3 -m http.server 8000)
```

Open <http://localhost:8000/> for the showcase and
<http://localhost:8000/performance.html> for the measurements. `dist/` is the
whole site.

`scripts/fetch-deps.sh` puts the releases this example adheres to in
`vendor/`: paste and paste-elements at their tags, each checked against its
pinned commit; the paste-assetgraph release binary for your machine,
checked against its pinned SHA-256, with the release's licence notices; and
jQuery, with its licence, for the performance page's comparison. The pins
live in `paste-deps.conf`. Running it again keeps whatever already
matches; a vendor checkout or file that does not match its pin is
replaced, and the script says so.

## What the page shows

| Section | What it shows | Source |
|---------|---------------|--------|
| `heroscroll` | `paste.ui.heroscroll`: the picture moves slower than the page and the words fade as the section leaves | [paste-elements](https://github.com/pastestack/paste-elements/tree/v0.9.0/modules/heroscroll), [specification](https://github.com/pastestack/paste-surface-spec/blob/v0.13.0/spec/elements/heroscroll.md) |
| `smoothscroll` | `paste.ui.smoothscroll`: section links glide to their section and write the address when they arrive | [paste-elements](https://github.com/pastestack/paste-elements/tree/v0.9.0/modules/smoothscroll), [specification](https://github.com/pastestack/paste-surface-spec/blob/v0.13.0/spec/elements/smoothscroll.md) |
| `sectionnav` | The section nav: `paste.ui.stickynav` marks the bar's nav once the intro scrolls away, `paste.ui.scrollspy` underlines the current section (with a mouse or trackpad; touch screens keep the plain bar), and `paste.ui.scrolltop` takes the logo back to the top without a reload | [stickynav](https://github.com/pastestack/paste-elements/tree/v0.9.0/modules/stickynav), [scrollspy](https://github.com/pastestack/paste-elements/tree/v0.9.0/modules/scrollspy), [scrolltop](https://github.com/pastestack/paste-elements/tree/v0.9.0/modules/scrolltop), [specification](https://github.com/pastestack/paste-surface-spec/blob/v0.13.0/spec/elements/sectionnav.md) |
| `core` | paste core: why Paste started, native first in 2011, and what it still adds: the loader the page's tag block drives and the few utilities the Elements share; links on to what it costs | [paste](https://github.com/pastestack/paste/tree/v2.1.1/src/js) |
| `surface` | The Surface markup: the whole page is what the Surface templates render | [specification](https://github.com/pastestack/paste-surface-spec/tree/v0.13.0/spec), [Scala templates](https://github.com/pastestack/paste-surface-scala/tree/v0.13.0/src/main/twirl/paste/surface) |
| `assetgraph` | paste-assetgraph: content-named files and the tags each page carries | [paste-assetgraph](https://github.com/pastestack/paste-assetgraph/tree/v0.4.1) |

Each section also has a code panel. In most, the tabs show the HTML that
declares the piece, then the call that renders that HTML in each Surface:
Twirl for paste-surface-scala, and Jinja (paste-surface-python) and Node
(paste-surface-node) marked as coming soon, because both are contract
scaffolds without a renderer yet. The paste core panel shows the page's
tag block and a module instead, and the paste-assetgraph panel the HTML and
the build commands. The tabs are plain radio buttons and CSS, so they
work without JavaScript and add no history entries.

Each block of `src/index.html` is marked with the Surface call that renders
it:

| Markup | Surface contract |
|--------|------------------|
| Head tags, `paste-ui-header`, `paste-ui-main`, `paste-ui-footer` | `webbase(PageMeta(...))` layout |
| `paste-ui-logo` link with inline SVG | `Logo(..., scrollTop = true)` |
| The bar's section nav | `SectionNav(..., scrollspy = true, smoothscroll = true)` |
| The other link lists that glide | `SectionNav(..., sticky = false, smoothscroll = true)` |
| `intro` section | `Hero(name = "intro", showImage = true, stickyNavTarget = true)` |
| `heroscroll` section | `Hero(name = "heroscroll", showImage = true)` |
| `smoothscroll`, `sectionnav`, `core`, `surface` and `assetgraph` sections | `Hero(name = ...)` |
| `paste-ui-address` | `Address` component |

The page works without JavaScript: the section links are ordinary fragment
anchors, every section reads as written, and the code tabs switch. The Paste
modules only add to it, and they respect `prefers-reduced-motion: reduce`:
heroscroll stands down and smoothscroll lands immediately.

Positioning stays with the page's CSS. The logo and the section nav sit in a
bar right after the intro, as in the stickynav specification's own example;
the webbase header is left empty. When stickynav marks the nav, the
stylesheet pins the bar at the top, and the bar's slot keeps its place in the
flow. The page sets `--paste-ui-section-nav-clearance` to the bar's height,
and a `:target` rule with the same value, so a section lands just below the
bar whether smoothscroll or the browser moves it there. The slot is one pixel
taller than the bar, so a section landing there always leaves the intro
scrolled past and the bar pinned.

## The performance page

`performance.html` keeps the showcase light: everything that measures lives
there, and the showcase only links to it. It asks what Paste costs on top of
the browser, not whether it beats it: Paste builds on the platform's own DOM
instead of replacing it. It uses the same Surface markup and runs two live
measurements in the visitor's browser; nothing on it is a recorded result.

- **Run TaskSpeed.** The sixteen DOM tasks of the classic TaskSpeed benchmark,
  in four frames: the native DOM, Paste written the Paste way, Paste with its
  helpers swapped into the native code, and jQuery 3.7.1. The suite runs five
  times and the table shows each task's median. After every task, in every
  round, the contenders must agree on the value they returned and the
  document they left, or the row is marked. jQuery is loaded only by its
  own frame, and only when the visitor presses Run.
- **The showcase page, measured.** When the visitor presses Measure, the
  showcase loads in a frame, and its own Navigation and Resource Timing give
  how large its Paste scripts are, uncompressed, when they arrived, and which
  came from the browser's cache.

The method, and where this port departs from the original TaskSpeed, are on
the page itself.

## Compatibility

The example adheres to these PasteStack releases. The ones it builds with
(paste, paste-elements, paste-assetgraph and, for the performance page,
jQuery) are pinned in `paste-deps.conf`; the specification and Scala tags are
the ones the page links to.

| Project | Tag | What the example takes from it |
|---------|-----|--------------------------------|
| [`paste-surface-spec`](https://github.com/pastestack/paste-surface-spec/tree/v0.13.0) | `v0.13.0` | The markup contract: webbase, Logo, SectionNav, Hero, Address |
| [`paste-surface-scala`](https://github.com/pastestack/paste-surface-scala/tree/v0.13.0) | `v0.13.0` | The reference renderer whose output the page matches |
| [`paste`](https://github.com/pastestack/paste/tree/v2.1.1) | `v2.1.1` | Core modules |
| [`paste-elements`](https://github.com/pastestack/paste-elements/tree/v0.9.0) | `v0.9.0` | Base styles, `paste.ui.heroscroll`, `paste.ui.smoothscroll`, `paste.ui.stickynav`, `paste.ui.scrollspy`, `paste.ui.scrolltop` and the utilities they use |
| [`paste-assetgraph`](https://github.com/pastestack/paste-assetgraph/tree/v0.4.1) | `v0.4.1` | The compiler release binary that builds `dist/` and renders the tag blocks |
| [`jquery`](https://github.com/jquery/jquery/tree/3.7.1) | `3.7.1` | The performance page's comparison only |

The committed tag blocks were rendered from these releases. To move to newer
ones, change the pins in `paste-deps.conf`, run `sh scripts/fetch-deps.sh`,
then `sh scripts/build-dist.sh --refresh`, and review the change. A newer
specification may change the markup itself; then update the page, its
links and this table with it.

## Make it yours

1. **Name and metadata.** In `src/index.html` and `src/performance.html`,
   change the head: the title, description, keywords, theme colour, and the
   canonical and `og:url` addresses (your domain). Keep the tags in the
   order shown; it is the order the webbase layout renders. The same values
   appear in each page's `webbase` comment and in the Surface section's two
   code panels. The site name appears in each page's `<title>`,
   `og:site_name` and `webbase` comment (`siteName`), in each Logo's
   comment, `aria-label` and SVG `<title>`, and in the code panels of the
   section nav and Surface sections.
2. **Logo.** The bar's logo is the PasteStack mark, a Tomshley trademark that
   is not licensed for reuse (see `NOTICE`). Replace the drawing inside each
   page's `paste-ui-logo` SVG with your own, delete the trademark comment
   beside it, replace `src/favicon.ico`, remove the logo from `NOTICE`, and
   take the logo out of each page's footer, which names it as an exception to
   the Apache License. Set the `viewBox` to your drawing's in each SVG, in
   each page's Logo comment, and in the section nav's two code panels in
   `src/index.html`.
3. **Words and sections.** Each section is a `<section>` marked with the
   `Hero(...)` call it matches. To add one, copy a section and its comment,
   give it a new `id`, and use that same id in its `data-paste-hero`, in the
   comment's `name`, and at the start of its `-image`, `-content-wrap` and
   `-content` ids. Rename its code panel's radio `name`, each radio's `id` and
   each label's `for`, so its tabs switch on their own. Link to it from a
   section nav with `href="#<id>"`, and add a matching `NavItem` to that nav's
   comment. `src/scss/site.scss` styles some sections by id (their heights,
   the alternating bands, the performance intro's padding), so carry a renamed
   or new id there too.
4. **Pictures.** Only a section declared with `showImage = true` shows a
   picture: its comment says so, its `<section>` carries the
   `paste-ui-hero-with-image` class, and it opens with an
   `<i id="<id>-image" class="paste-ui-hero-image"></i>`. Publish each image
   with `sh scripts/add-asset.sh /path/to/photo.jpg`, then point its section
   at it in `src/scss/site.scss`:
   `#<id>-image { background-image: url('/images/photo.jpg'); }`. A
   published image never changes; a new version gets a new filename.
5. **Colours and type.** Change the variables at the top of
   `src/scss/site.scss`.
6. **Rebuild.** After changing styles or pins, run
   `sh scripts/build-dist.sh --refresh`, check `git diff src/`, and commit
   the page with its refreshed tag blocks. A plain `sh scripts/build-dist.sh`
   must then pass.
7. **Publish.** Upload `dist/` to any static host (see Deploying below).

## Layout

```
src/
  index.html            the showcase, carrying its own asset tag blocks
  performance.html      the performance page
  taskspeed/            the four TaskSpeed frames the performance page loads
  js/example/           the performance page's two modules: the TaskSpeed
                        harness and the page measurement
  js/taskspeed/         the sixteen tasks, once per contender
  js/libs/jquery.js     jQuery as a named dependency, for its frame only
  scss/site.scss        the site's styles: colours, type, section heights,
                        pictures
  images/               published images, listed in published.manifest
  _headers              cache and security headers for hosts that read it
  favicon.ico           the site icon, the PasteStack mark
scripts/
  fetch-deps.sh         fetches the pinned releases into vendor/, checked
  build-dist.sh         verifies, compiles and assembles dist/
  add-asset.sh          publishes an image: copy, manifest line, served path
  lint-js.sh            runs JSLint over src/js, as paste-elements does
paste-deps.conf         the pinned releases: tags, commits, checksums
paste-assetgraph.conf   compiler configuration
published.manifest      SHA-256 of every published image
LICENSES/TaskSpeed.txt  TaskSpeed's MIT License, published beside its frames
vendor/                 the fetched releases (not committed)
dist/                   the deployable site (generated, not committed)
```

## Building

`sh scripts/build-dist.sh` uses the releases in `vendor/`. To build against
other checkouts or another compiler, set any of these:

```sh
export PASTE_CORE_JS=/path/to/paste/src/js
export PASTE_ELEMENTS=/path/to/paste-elements
export PASTE_ASSETGRAPH_BIN=/path/to/paste-assetgraph
```

The lossless image optimizers are needed only for their types: `oxipng` when
there are PNG images, `jpegoptim` when there are JPEG images. On Windows, or
a platform without a release binary, build paste-assetgraph from source (see
its README) and set `PASTE_ASSETGRAPH_BIN`.

The build:

1. checks that `published.manifest` lists exactly the files under
   `src/images`, each with its unchanged SHA-256;
2. compiles `src/scss` and the paste and paste-elements modules into
   individual versioned files, `dist/css/<name>.<hash>.v1.min.css` and
   `dist/js/.../<name>.<hash>.v1.min.js`;
3. checks every asset tag block in the pages against what
   `paste-assetgraph render --per-module` prints for the current build;
4. copies jQuery and its licence into `dist/vendor/` under versioned names,
   and TaskSpeed's licence into `dist/taskspeed/`, for the performance page;
5. copies the pages, images, `_headers` and `favicon.ico` into `dist/` and
   optimizes the images there, losslessly. Nothing else under `src/` ships;
   add a copy step for other files, such as `robots.txt`.

A failed or interrupted build removes `dist/`, so a half-built site cannot be
deployed.

`dist/` is rebuilt from nothing each time, so compiled files restart at `v1`.
Their names carry a content hash, so a changed file always gets a new URL.

## Asset tags live in the page

A static host cannot answer `/paste` combo URLs, so each page names every
versioned file it loads. The page carries those tags itself, between an
opening and a closing comment:

```html
<!-- paste-assetgraph css: site paste.ui.heroscroll -->
<link rel="stylesheet" href="/css/heroscroll.<hash>.v1.min.css"/>
<link rel="stylesheet" href="/css/site.<hash>.v1.min.css"/>
<!-- /paste-assetgraph -->
```

The opening line names the block's type (`css` or `js`) and the modules the
page wants; dependencies are resolved for you. The build never rewrites a page
on its way to `dist/`. When a source or a paste release changes a compiled
file, the block no longer matches and the build fails. Refresh the blocks and
review the change:

```sh
sh scripts/build-dist.sh --refresh
git diff src/
```

Rolling back is the same edit in reverse: a page names the files it loads.

## Images

A published image never changes and is never deleted. Publish one with:

```sh
sh scripts/add-asset.sh /path/to/photo.jpg
```

It copies the file into `src/images`, appends its line to
`published.manifest` and prints the path it serves from. An update ships under
a new filename. Commit the image and the manifest together.

Images keep their filenames in `dist/`. Nothing yet rewrites an image URL in a
page or stylesheet to a content-addressed name; that waits for
`paste-assetgraph` to handle images. Until then, a different optimizer version
can produce different bytes for the same image at the same URL; the pixel
data is the same, because the optimization is lossless.

The JPEG optimizer strips all metadata, including camera location, EXIF
orientation and colour profiles. Export JPEGs upright and in sRGB before
publishing them. PNG colour information is kept.

## Deploying

Upload `dist/` to any static host. `_headers` sets long-lived immutable
caching for `/css/*`, `/js/*`, `/vendor/*` and `/images/*` on hosts that read
it, such as Cloudflare Pages and Netlify; elsewhere, set the same headers in
the host's configuration. Pages themselves are not cached as immutable.

## License

Licensed under the Apache License, Version 2.0. See `LICENSE` and `NOTICE`.
`vendor/paste-assetgraph/` holds the compiler release's own `LICENSE`,
`NOTICE.md` and `THIRD_PARTY_LICENSES.md`. The built site serves jQuery
(MIT License) from `/vendor/` with its licence beside it. The TaskSpeed
tasks are adapted from TaskSpeed (MIT License), whose licence is in
`LICENSES/` and is served at `/taskspeed/LICENSE.txt`; `NOTICE` has the
details.
