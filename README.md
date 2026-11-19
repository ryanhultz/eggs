# eggs

A single-file web app for tracking a laying flock: daily egg collection, sales, expenses, lay rate, and cost per dozen. Data is saved in the browser (localStorage) on each device. Use **Settings → Export backup** to save a copy.

## Features
- **Today:** a +/− counter to log the day's collection, an at-a-glance summary and a 30-day bar chart
- **Money:** log sales (dozens × $/dozen, with customer names remembered) and expenses (feed, bedding, cartons, birds, etc.)
- **History:** every collection by date. Tap × twice to delete one.
- **Stats:** totals for 7 days, 30 days, a year or all time: eggs, dozens, lay rate, income, expenses, net and cost per dozen
- **Settings:** hen count, default price per dozen, JSON backup/restore, CSV export
- Installable on iPhone: open it in Safari, tap Share, then Add to Home Screen

## Release notes

### rev 1
- First release: collection, sales, expenses, stats, settings and backup

**Test:**
```bash
# Run it locally and open http://localhost:8000 in your browser
cd eggs
python3 -m http.server 8000
```
Check that saving a collection updates the Today numbers, that adding a sale changes Eggs on hand, and that Export backup followed by Import backup brings back the same data.

**Deploy (GitHub Pages):**
```bash
git add index.html README.md
git commit -m "Release rev N"
git push origin main
```
One-time setup: in the repo, go to **Settings → Pages → Build and deployment**, set Source to *Deploy from a branch* and Branch to `main` / `(root)`, then save. The site goes live at https://ryanhultz.github.io/eggs/ about a minute after each push.

For every change, bump `REV` near the top of the `<script>` in `index.html` so the header shows which version is loaded.
