# Contributing

Thank you for your interest in contributing to **paste-example-basichtml**.

This project is part of **Tomshley LLC's OSS and IP strategy** and is part of PasteStack,
which augments the tools a consumer already uses rather than taking over its application
model. It is intentionally opinionated.

## Philosophy

- The page is the Surface contract written by hand; it changes when the specification changes
- The page works without JavaScript; Paste Elements only enhance it

Changes that increase complexity, size, or scope without strong justification are unlikely
to be accepted.

## What Contributions Are Welcome

- Keeping the example current with the PasteStack releases it names
- Bug fixes and documentation improvements

## What Is Out of Scope

- Markup the Surface templates would not render
- A template engine, bundler or framework
- Large refactors without prior discussion

## Keeping the example current

The page is the Surface contract written by hand, so it moves when PasteStack
moves.

### A new paste, paste-elements or paste-assetgraph release

1. Change its pin in `paste-deps.conf`. For paste and paste-elements, use the
   new tag and the commit it points at, which
   `git ls-remote <repository> 'refs/tags/<tag>^{}'` prints. For
   paste-assetgraph, use the version and the checksums from the release's
   `SHA256SUMS`.
2. Run `sh scripts/fetch-deps.sh`, then `sh scripts/build-dist.sh --refresh`,
   and review the tag blocks that changed.
3. If a module the page uses changed its declarations or behaviour, update
   the section that shows it, including its code panel.
4. Update the tags in the page's source links and in the README's
   Compatibility table.

### A new paste-surface-spec or paste-surface-scala release

1. Compare the templates the page uses (webbase, Logo, SectionNav, Hero and
   Address) with the new release, and change the page's markup to match.
2. Update the code panels. Each panel quotes something real: the page's own
   markup, a comment's call, a module's source. A panel may write `…` for
   any run of text, a line of `…` alone for lines it leaves out, and
   `<hash>` for a content hash, and the tag-block panel lays the minified
   loader out over several lines; everything else matches word for word.
   Each Twirl panel shows calls from its own section's comments, with every
   argument; the check below names the two sections that show calls from
   elsewhere.
3. Update the specification and Scala tags in the page's links and in the
   README's Compatibility table.
4. Check the page against the templates, as below.

### When paste-surface-python or paste-surface-node renders

Their tabs in each code panel say "Coming soon" while the package is a
contract scaffold. Once a release renders, replace each section's notice with
the template call that produces that section's markup, check its output
against the page as below, and add the release to the README's Compatibility
table.

### Checking the page against the Surface templates

The page must be exactly what the Surface templates render. To check, use a
paste-surface-scala checkout at the release the README names:

1. Render exactly the calls the page's comments name, so a comment that no
   longer matches the markup fails the check: `webbase` with the page's
   `PageMeta` (its description and keywords from the page's meta tags) and
   an empty `navContent`, the `Logo`, each `SectionNav`, each `Hero` and the
   `Address`. Put each section's own content (its heading, paragraph, code
   panel and source links) into its Hero's content slot, in page order, and
   the bar's two wrapper `div`s, holding the Logo and the bar's SectionNav,
   after the intro.
2. Render a placeholder in the layout's style and script slots, and put the
   same placeholder in place of each of the page's asset tag blocks, so the
   blocks' positions are compared too.
3. Compare the result with `src/index.html` twice. First compare the markup,
   ignoring comments and whitespace and comparing class lists as sets:
   every element, attribute and text must match. Then compare the text a
   reader sees, with each block element as a line break and whitespace
   collapsed, so a missing space between two inline elements also counts.
   Check `src/performance.html` the same way; its comments name its own
   view models.

The check covers the layout and the Surface components. The content inside
each Hero is the page's own, so read it as you would any other change.

Then check the code panels.

- Each Twirl panel shows its own section's calls: the section's Hero or the
  components inside the section. Two sections show calls from elsewhere,
  because those calls are their subject: the section nav's shows the bar's
  Logo and SectionNav and the intro Hero they work with, and the Surface
  section's shows the page's `webbase` call. Every call must match the
  comment it shows, with the same arguments and the same values wherever
  neither writes an ellipsis.
- Each HTML panel matches its own section of the page line for line, apart
  from what the code panel rule above allows; snippets separated by a blank
  line are matched one at a time. The section nav's panel quotes the bar and
  the intro, the Surface section's the whole page, and paste-assetgraph's
  the page's head.
- The tag-block panel matches the page's script block, whitespace aside.
- The module panel matches the module's source, and the "make task" panels
  match `src/js/taskspeed/*.js`, line for line.
- Every command the shell panel shows runs a script that takes the flags
  shown.

### The performance page

- Every TaskSpeed contender must leave the same document and return the same
  value after every task; the harness marks any row where they disagree. A
  change to one contender's task is a change to all four.
- The "make task, four ways" panel quotes `src/js/taskspeed/*.js`; keep it
  in step with those files.
- The jQuery contender is written the jQuery way, so it uses jQuery's own
  `map`, a callback iteration Paste's source rules forbid in Paste code, and
  `find`, a selector query those rules' check flags by its name. That is the
  one place the site departs from them.
- jQuery's version appears in several places: `JQUERY_VERSION` and its
  checksums in `paste-deps.conf`, the URL in `src/js/libs/jquery.js`, the
  jQuery frame page, the performance page's column header, method and links,
  `NOTICE` and the README. `git grep -n 3.7.1` lists every place the version
  is written; the two checksums beside `JQUERY_VERSION` change with it.
  Change them together.
- The page measurement waits for the modules named in its frame's
  `data-modules`; when the showcase loads different modules, change that
  list.

### Before a merge request

- `sh scripts/build-dist.sh` passes, so every tag block is current.
- With JavaScript off, the page reads in full, its links jump to their
  sections, and the code tabs switch.
- `shellcheck -s sh scripts/*.sh` is clean.
- `sh scripts/lint-js.sh` reports no warnings. It needs Node.js.

## Process

1. Open an issue describing the change
2. Fork the repository
3. Create a focused merge request
4. Keep commits clean and scoped

Tomshley LLC reserves final decision-making authority on all contributions.
