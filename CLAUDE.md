# Lisa's Hen & Hive

An online order page for Lisa's egg and honey farm stand in Cayuga, NY. Ryan builds it; Lisa runs the store. This is a prototype.

## How it works
- `docs/` is the website, plain HTML/CSS/ES modules with no build step:
  - `index.html` is the store: farm-stand design with an awning, wooden sign, product crates with price tags, and an order-pad form
  - `admin.html` is the back end: Orders, Products, Sales and Settings tabs
  - `store-core.js` holds all store rules (orders, stock, payments, reports) as pure functions on one JSON state object. The Worker and demo mode both use it, so change rules here only.
  - `api.js` makes the same calls either to the real backend or to demo mode (localStorage). Demo mode turns on for `*.github.io`, `file:`, or `?demo`.
  - `art.js` has original SVG artwork (egg carton, 1 lb and 2 lb honey jars, basket, bee), chosen by product name. Uploaded photos replace it.
- `worker/index.js` is the Cloudflare Worker. It serves `docs/` as static assets, the API under `/api/*` and product photos at `/img/:id`. Store state is one D1 row saved with optimistic version checks; photos are in their own table.
- `schema.sql` holds the D1 tables. `wrangler.toml` is the Cloudflare config (`database_id` is still a placeholder).
- Tests: `test/core.test.js` covers store rules; `test/worker.test.js` runs the real Worker against `node:sqlite` standing in for D1.

## Commands
```bash
npm test                                   # all tests (Node 22+)
cd docs && python3 -m http.server 8000     # demo: http://localhost:8000/?demo
npx wrangler d1 execute hen-and-hive --local --file=schema.sql && npx wrangler dev   # real backend locally
npx wrangler deploy                        # deploy to Cloudflare
```

## Decisions so far
- Products: Eggs (dozen), Honey (1 lb jar), Honey (2 lb jar). Prices of $5, $12 and $22 are placeholders for Lisa to change.
- No pickup/delivery choice. Customers give a name and a phone number or email, and are told Lisa will reach out.
- Venmo is a placeholder until a username is set in Settings. Then customers get a prefilled `venmo.com/?txn=pay...` link. Fully automatic payment (PayPal SDK Venmo button) is a possible later step.
- Admin login is `admin` / `1111` for the prototype. It's checked server-side with an HMAC-signed 30-day token.
- Design: farm stand, not cartoon. Barn-red/cream awning, wood, kraft paper, hemlock-green buttons, honey accent. Fonts are Zilla Slab, Work Sans and Caveat.

## Next up
- Email alert to Lisa for each new order (planned for a later release)
- Before going live: move `ADMIN_PASSWORD` out of `wrangler.toml` into `wrangler secret put ADMIN_PASSWORD`, and fill in the D1 `database_id`
- Store orders in their own table once volume grows (currently all in one JSON row)

## Conventions
- Bump the version in the README release notes for each release. Release notes always include the test and deploy steps with exact commands.
- Keep customer-facing copy plain and in sentence case.
- Money is stored in whole cents.
