# Lisa's Hen & Hive

An online order page for a farm stand selling eggs and honey. Customers choose items, leave their name and a phone number or email, and place the order. Lisa follows up to arrange pickup or delivery. The admin page lets her manage products, track orders and payments, and see sales.

## What's here

| Path | What it is |
|---|---|
| `docs/index.html` | The store page customers order from |
| `docs/admin.html` | The admin page: orders, products, sales and settings (sign in as `admin` / `1111`) |
| `docs/art.js` | Drawn artwork for products and the header, used when a product has no photo |
| `docs/store-core.js` | Store rules (ordering, stock, payments, reports), shared by the server and demo mode |
| `docs/api.js` | Connects the pages to the server, or runs demo mode |
| `worker/index.js` | The Cloudflare Worker backend (API, sign-in, product photos) |
| `schema.sql` | Database tables for Cloudflare D1 |
| `wrangler.toml` | Cloudflare configuration |
| `test/` | Automated tests |

### Two ways it runs
- **Live (Cloudflare Worker + D1):** orders are saved in one shared database, so Lisa sees every customer's order.
- **Demo (GitHub Pages, or any URL with `?demo`):** everything works, but data is saved only in the browser you're using. This is for trying out the design and flow.

## Release notes

### v0.2.2
- Honey wording now matches the jar label: both honey products say "100% pure honey from Kolis Apiary in Camillus, NY."
- The drawn honey jars read "Pure honey" with the net weight: 1 lb (454 g) and 2 lb (907 g)
- These are starter descriptions for new stores. A store that already has data keeps its own; change it in Admin → Products.

Test and deploy:
```bash
cd eggs
npm install
npm test
cd docs && python3 -m http.server 8000   # http://localhost:8000/?demo
cd .. && npm run deploy                  # once Cloudflare is set up
```

### v0.2.1
- Wrangler 4 is now a dev dependency, so `npm install` sets up the Cloudflare tools and `npm run dev` / `npm run deploy` work without a global install

Test and deploy:
```bash
cd eggs
npm install
npm test
npx wrangler d1 execute hen-and-hive --local --file=schema.sql
npm run dev                              # http://localhost:8787  (admin: /admin.html, admin / 1111)
npm run deploy                           # once Cloudflare is set up
```

### v0.2.0
- Store redesigned as a farm stand: red-and-cream striped awning, painted wooden sign, products in wooden crates with hand-lettered price tags, and the order form on a lined order-pad slip
- Original drawn artwork (egg carton, 1 lb and 2 lb honey jars, a basket for other products, and a bee), in an old engraved-label style. A photo uploaded in admin replaces a product's artwork.
- Sold-out products get a "Sold out" stamp
- On phones, product crates use a compact side-by-side layout

Test and deploy are the same as below:
```bash
cd eggs
npm test
cd docs && python3 -m http.server 8000   # http://localhost:8000/?demo
cd .. && npx wrangler deploy             # once Cloudflare is set up
```

### v0.1.0 (prototype)
- Store page styled as a farm-stand price board, with Eggs (dozen), Honey (1 lb jar) and Honey (2 lb jar) as starter products
- Order form with name, phone and/or email, and notes. After ordering, customers see that Lisa will reach out.
- Venmo placeholder: until a Venmo username is set in Settings, customers are told to pay when they get their order. Once one is set, a "Pay with Venmo" button opens Venmo with the amount and order number filled in.
- Admin orders list: call, text or email the customer; set status (New, Ready, Completed, Cancelled); record payment (Venmo, Cash, Check, Other); add a private note
- Admin products: add, edit, hide, reorder and delete products; set price and optional stock (sells out automatically); upload photos
- Admin sales: totals for today, 7 days, 30 days, a year or all time; paid vs. not paid; by product and by payment method; CSV download
- Admin settings: turn ordering on or off, edit the store name and customer-facing text, set the Venmo username
- Prototype login is `admin` / `1111`

**Known limits (planned for later releases):** no email alerts for new orders yet; the password is stored in `wrangler.toml`, which is public; every order is kept in one database record, which is fine for a few thousand orders.

### Test

Run the automated tests (needs Node.js 22 or newer):
```bash
cd eggs
npm test
```

Try the site locally in demo mode:
```bash
cd eggs/docs
python3 -m http.server 8000
# Store: http://localhost:8000/?demo
# Admin: http://localhost:8000/admin.html?demo   (admin / 1111)
```

Try it locally with the real backend:
```bash
cd eggs
npx wrangler d1 execute hen-and-hive --local --file=schema.sql
npx wrangler dev
# Store: http://localhost:8787   Admin: http://localhost:8787/admin.html
```

Things to check: place an order on the store, confirm it appears under Orders in admin, mark it paid, check that Sales updates, add a product with a photo and confirm it appears on the store, and set stock to 1 and confirm the product shows "Sold out" after one order.

### Deploy

**Demo on GitHub Pages:** in the repo, go to **Settings → Pages → Build and deployment**, choose *Deploy from a branch*, select branch `main` and folder `/docs`, then save. After about a minute it's live at:
- https://ryanhultz.github.io/eggs/
- https://ryanhultz.github.io/eggs/admin.html

**Live on Cloudflare** (one-time setup):
```bash
cd eggs
npx wrangler login
npx wrangler d1 create hen-and-hive
# Copy the database_id it prints into wrangler.toml, replacing REPLACE_WITH_ID_FROM_wrangler_d1_create
npx wrangler d1 execute hen-and-hive --remote --file=schema.sql
npx wrangler deploy
```
The deploy prints the store's URL (`https://hen-and-hive.<your-subdomain>.workers.dev`). The admin page is at `/admin.html` on that URL.

**Later updates:**
```bash
cd eggs
git pull
npm test
npx wrangler deploy
```
